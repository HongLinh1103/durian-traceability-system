import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { trapLocationSchema, locationErrorMessage, trapMapUrl } from '../src/lib/trap-location';
async function main() {
  assert.deepEqual(trapLocationSchema.parse({latitude:0,longitude:0}),{latitude:0,longitude:0});
  for(const input of [{latitude:91,longitude:0},{latitude:0,longitude:-181},{latitude:10,longitude:null},{latitude:null,longitude:null,accuracyMeters:10},{latitude:1,longitude:2,accuracyMeters:-1},{latitude:1,longitude:2,locationCapturedAt:'not-a-date'}])assert(!trapLocationSchema.safeParse(input).success);
  assert(locationErrorMessage(1).includes('từ chối'));assert(locationErrorMessage(3).includes('thời gian'));assert(trapMapUrl(0,0).endsWith('q=0,0'));
  const env=parseEnv(readFileSync('.env','utf8'));if(!env.DATABASE_URL||!['localhost','127.0.0.1'].includes(new URL(env.DATABASE_URL).hostname))throw Error('GPS tests require local database.');
  const db=new PrismaClient({datasources:{db:{url:env.DATABASE_URL}}});
  try {
    const season=await db.cropSeason.findFirstOrThrow({include:{farm:true}});
    try{await db.$transaction(async tx=>{
      const book=await tx.pestMonitoringBook.create({data:{farmerId:season.farm.farmerId,farmId:season.farmId,cropSeasonId:season.id,pestName:'Transient GPS integration test',startDate:new Date()}});
      const one=await tx.pestTrap.create({data:{monitoringBookId:book.id,trapCode:'TEST-1',trapType:'Test',locationName:'GPS',latitude:0,longitude:0,accuracyMeters:8.5,locationCapturedAt:new Date('2026-10-26T01:30:00Z')}});
      const two=await tx.pestTrap.create({data:{monitoringBookId:book.id,trapCode:'TEST-2',trapType:'Test',locationName:'GPS',latitude:11,longitude:106,accuracyMeters:12,locationCapturedAt:new Date('2026-10-26T01:31:00Z')}});
      await tx.pestTrap.update({where:{id:one.id,monitoringBookId:book.id},data:{latitude:10,longitude:105}});
      const persisted=await tx.pestTrap.findMany({where:{monitoringBookId:book.id},orderBy:{trapCode:'asc'}});
      assert.equal(persisted[0].latitude,10);assert.equal(persisted[0].accuracyMeters,8.5);assert.equal(persisted[0].locationCapturedAt!.toISOString(),'2026-10-26T01:30:00.000Z');assert.deepEqual(persisted[1],two);
      throw Error('TEST_ROLLBACK');
    });}catch(error){if((error as Error).message!=='TEST_ROLLBACK')throw error;}
    console.log('PASS trap GPS: coordinate ranges/pairs, zero values, accuracy/time persistence, independent trap updates and map link');
  }finally{await db.$disconnect();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
