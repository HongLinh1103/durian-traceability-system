import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { FRESH_STAGES, freshLotCode, normalizeFreshLotCodes } from '../src/lib/fresh-lot-code';
import { createDemoState, inherit, saveRecord } from '../src/lib/processing-gmp';
import { productionSources } from '../src/lib/production-lots';
import { vietnamPhone, vietnamContactPhone } from '../src/lib/sales-contact';
import { buildRegisterDocx } from '../src/lib/processing-gmp-export';
import { GMP_REGISTER_COLUMN_WIDTHS } from '../src/components/processing/processing-gmp-column-widths';

async function main(){
 for(const input of ['0912345678','+84 912 345 678','84-912-345-678','0084912345678'])assert.equal(vietnamPhone(input),'0912345678');
 for(const input of ['+8613800138000','0123456789','091234567','09123456789','0000000000','abc0912345678'])assert(!vietnamContactPhone.safeParse(input).success,input);
 const state=createDemoState();
 for(const r of state.records.receiving)r.values.dgLotCodes=r.lotCode.replace(/^LH-/,'DG-');
 const before=structuredClone(state),next=normalizeFreshLotCodes(state);
 assert.deepEqual(state,before,'No input mutation');
 assert.deepEqual(next.records.receiving,before.records.receiving,'Receiving retains its LH identity');
 assert.deepEqual(next.records.purchases,before.records.purchases);assert.deepEqual(next.payments,before.payments);assert.deepEqual(next.expenses,before.expenses);
 for(const stage of FRESH_STAGES)for(const [index,row]of next.records[stage].entries()){
  const old=before.records[stage][index];assert(row.lotCode.startsWith('DG-'));assert.equal(row.id,old.id);assert.equal(row.sourceId,old.sourceId);assert.equal(row.values.legacyLotCode,old.lotCode);assert.equal(row.lotCode,freshLotCode(before,stage,old));
  for(const [key,value]of Object.entries(old.values))if(!['lotCode','productLot'].includes(key))assert.equal(row.values[key],value,key);
 }
 assert.equal(normalizeFreshLotCodes(next),next,'Upgrade idempotent');
 assert(productionSources(next,'DG').every(r=>r.lotCode.startsWith('DG-')),'New source chooser uses DG');
 for(const stage of ['packaging','inspection','sales','aftersales'] as const){
  const previous=stage==='packaging'?'preprocessing':stage==='inspection'?'packaging':stage==='sales'?'inspection':'sales';
  const source=before.records[previous][0];assert(String(inherit(before,stage,source).lotCode).startsWith('DG-'),'New record inherits assigned DG from old source');
  const bytes=await buildRegisterDocx(stage,next.records[stage],'Test');const xml=await(await JSZip.loadAsync(bytes)).file('word/document.xml')!.async('string');assert(xml.includes('DG-2026-'));assert(!xml.includes('LH-2026-'),stage+' export uses DG');
 }
 const sale=next.records.sales[0];const edit=saveRecord(next,'sales',{id:sale.id,values:{...sale.values,customer:'Nguyễn Văn A',customerInfo:'+84 912 345 678'}},sale.id);assert.equal(edit.records.sales[0].values.customerInfo,'0912345678');assert.equal(edit.records.sales[0].lotCode,sale.lotCode);
 // A split receiving lot cannot be guessed when no production allocation identifies its branch.
 const split=structuredClone(before);split.records.receiving[0].values.dgLotCodes='DG-2026-A, DG-2026-B';assert.equal(freshLotCode(split,'preprocessing',split.records.preprocessing.find(r=>r.sourceId===split.records.receiving[0].id)!),split.records.receiving[0].lotCode);
 assert.equal(GMP_REGISTER_COLUMN_WIDTHS.sales![1],150);assert.equal(GMP_REGISTER_COLUMN_WIDTHS.sales![2],130);
 console.log('PASS fresh registers: DG inheritance across five stages, original links/quantities/payments preserved, idempotency, ambiguous split guard, exports, Vietnamese phones and compact contact widths');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
