import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { saveDiaryMedia } from '../src/lib/diary-media';

async function main() {
  const target=process.argv[process.argv.indexOf('--target')+1];
  if(!['local','production'].includes(target))throw Error('Use --target local|production.');
  const env=parseEnv(readFileSync(target==='local'?'.env':'.env.production.local','utf8'));
  if(!env.DATABASE_URL)throw Error('Missing database configuration.');
  const db=new PrismaClient({datasources:{db:{url:env.DATABASE_URL}}});
  try {
    const rows=(await db.farmingLog.findMany({select:{id:true,images:true,voiceUrl:true,updatedAt:true,farm:{select:{farmerId:true}}}})).filter(log=>log.images.some(url=>url.startsWith('data:')));
    if(process.argv.includes('--apply')&&rows.length){
      mkdirSync('.storage/diary-media-migrations',{recursive:true});writeFileSync(`.storage/diary-media-migrations/${target}-${Date.now()}.json`,JSON.stringify(rows,null,2),{flag:'wx'});
      await db.$transaction(async tx=>{
        for(const row of rows){
          const current=await tx.farmingLog.findUniqueOrThrow({where:{id:row.id}});
          if(current.updatedAt.getTime()!==row.updatedAt.getTime())throw Error('Concurrent edit; migration rolled back.');
          const links=await saveDiaryMedia(tx,{logId:row.id,uploaderId:row.farm.farmerId,existingImages:row.images,existingVoice:row.voiceUrl,files:[]});
          await tx.farmingLog.update({where:{id:row.id},data:links});
        }
      },{timeout:60000});
    }
    console.log(JSON.stringify({target,mode:process.argv.includes('--apply')?'apply':'plan',logs:rows.length,images:rows.reduce((sum,row)=>sum+row.images.filter(url=>url.startsWith('data:')).length,0)}));
  }finally{await db.$disconnect();}
}
main().catch(error=>{console.error('Diary media migration failed:',error.code||error.message);process.exitCode=1;});
