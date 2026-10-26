import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { mediaType, prepareDiaryBytes, saveDiaryMedia, DIARY_IMAGE_LIMIT } from '../src/lib/diary-media';

async function main() {
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  const wave=Buffer.alloc(1644);wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(8000,24);wave.writeUInt32LE(16000,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(1600,40);
  assert.equal(mediaType(png,'IMAGE'),'image/png');assert.equal(mediaType(wave,'VOICE'),'audio/wav');
  assert.throws(()=>prepareDiaryBytes(Buffer.from('<script>bad</script>'),'IMAGE','x.png'));
  assert.throws(()=>prepareDiaryBytes(Buffer.alloc(DIARY_IMAGE_LIMIT+1),'IMAGE','big.png'));
  const env=parseEnv(readFileSync('.env','utf8'));if(!env.DATABASE_URL||!['localhost','127.0.0.1'].includes(new URL(env.DATABASE_URL).hostname))throw Error('Media tests require local database.');
  const db=new PrismaClient({datasources:{db:{url:env.DATABASE_URL}}});
  let logId='';
  try {
    const farm=await db.farm.findFirstOrThrow();
    try {await db.$transaction(async tx=>{
      const log=await tx.farmingLog.create({data:{farmId:farm.id,stage:'POST_HARVEST_RECOVERY',activityType:'OTHER',otherActivity:'Transient integration fixture',actionDate:new Date()}});logId=log.id;
      const image=prepareDiaryBytes(png,'IMAGE','image.png'),voice=prepareDiaryBytes(wave,'VOICE','voice.wav');
      const links=await saveDiaryMedia(tx,{logId,uploaderId:farm.farmerId,existingImages:[],existingVoice:null,files:[image,voice]});
      await tx.farmingLog.update({where:{id:logId},data:links});
      assert(links.images[0].startsWith('/api/farming-logs/media/'));assert(!links.images[0].startsWith('data:'));
      const file=await tx.farmingLogMedia.findUniqueOrThrow({where:{id:voice.id}});assert.deepEqual(file.bytes,wave);assert.equal(file.logId,logId);
      const retained=await saveDiaryMedia(tx,{logId,uploaderId:farm.farmerId,existingImages:links.images,existingVoice:links.voiceUrl,files:[]});assert.deepEqual(retained,links);assert.equal(await tx.farmingLogMedia.count({where:{logId}}),2);
      await assert.rejects(saveDiaryMedia(tx,{logId,uploaderId:farm.farmerId,existingImages:links.images,existingVoice:links.voiceUrl,retainedImages:['/api/farming-logs/media/not-owned'],files:[]}));
      const voice2=prepareDiaryBytes(wave,'VOICE','new.wav');
      const replaced=await saveDiaryMedia(tx,{logId,uploaderId:farm.farmerId,existingImages:links.images,existingVoice:links.voiceUrl,files:[voice2]});assert.notEqual(replaced.voiceUrl,links.voiceUrl);assert.equal(await tx.farmingLogMedia.count({where:{logId}}),2);
      const removed=await saveDiaryMedia(tx,{logId,uploaderId:farm.farmerId,existingImages:replaced.images,existingVoice:replaced.voiceUrl,retainedImages:[],retainedVoice:null,files:[]});assert.deepEqual(removed,{images:[],voiceUrl:null});assert.equal(await tx.farmingLogMedia.count({where:{logId}}),0);
      await saveDiaryMedia(tx,{logId,uploaderId:farm.farmerId,existingImages:[],existingVoice:null,files:[prepareDiaryBytes(png,'IMAGE','rollback.png')]});
      throw Error('TEST_ROLLBACK');
    },{timeout:30000});}catch(error){if((error as Error).message!=='TEST_ROLLBACK')throw error;}
    assert.equal(await db.farmingLogMedia.count({where:{logId}}),0);assert.equal(await db.farmingLog.count({where:{id:logId}}),0);
    console.log('PASS diary files: real binary persistence, URL references, keep/replace/remove, upload validation and rollback without orphan files');
  }finally{await db.$disconnect();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
