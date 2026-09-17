import assert from 'node:assert/strict';
import { GmpState, GmpRecord, latestRecords, sources } from '../src/lib/processing-gmp';
const old:GmpRecord={id:'failed',sourceId:'pack',lotCode:'LH-2026-0809',season:'2025-2026',values:{date:'2026-09-09',mealybug:'Có',weight_kg:0}};
const retest:GmpRecord={...old,id:'passed',values:{date:'2026-09-10',mealybug:'Không',weight_kg:5940}};
for(const inspection of [[old,retest],[retest,old]]){
 const state:GmpState={demo:true,payments:[],records:{purchases:[],receiving:[],preprocessing:[],packaging:[],inspection,sales:[],aftersales:[]}};
 assert.equal(latestRecords(state,'inspection')[0].id,'passed');
 assert.equal(sources(state,'sales')[0].id,'passed');
 const failedAgain={...old,id:'failed-again',values:{...old.values,date:'2026-09-11'}};
 state.records.inspection.unshift(failedAgain);
 assert.equal(sources(state,'sales').length,0);
}
console.log('PASS: latest inspection follows date in either display order; a later failure blocks sales.');
