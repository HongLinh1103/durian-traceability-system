import assert from 'node:assert/strict';
import { createDemoState, saveRecord, sources, addPayment, addExpense, deleteExpense, EXPENSE_CATEGORIES, normalizeGmpState, formatProductionLotCode, REGISTERS, STAGES } from '../src/lib/processing-gmp';
import { buildRegisterDocx } from '../src/lib/processing-gmp-export';
import JSZip from 'jszip';
import { mkdir, writeFile } from 'node:fs/promises';

async function main() {
 const state=createDemoState();
 const draftState=createDemoState();
 draftState.payments=[];
 for(const stage of STAGES.slice(1)) for(const r of draftState.records[stage]) r.draft=true;
 assert(!sources(draftState,'sales').length, 'Draft inspection cannot authorize a sale');
 const draftPurchase=draftState.records.purchases[0];
 assert.doesNotThrow(()=>saveRecord(draftState,'purchases',{id:draftPurchase.id,values:draftPurchase.values},draftPurchase.id), 'Draft descendants must not lock source editing');
 const draftReceiving=draftState.records.receiving[0];
 const completedReceiving=saveRecord(draftState,'receiving',{id:draftReceiving.id,values:draftReceiving.values},draftReceiving.id);
 assert(!completedReceiving.records.receiving[0].draft, 'Validated save completes a draft');
 const draftPrep=draftState.records.preprocessing[0];
 assert.throws(()=>saveRecord(draftState,'preprocessing',{id:draftPrep.id,values:draftPrep.values},draftPrep.id),/hoàn tất/);
 assert.throws(()=>addPayment(draftState,{id:'draft-payment',recordId:draftState.records.sales[0].id,direction:'IN',date:'2026-09-10',amount:1,method:'Tiền mặt'}),/hoàn tất/);
 assert.deepEqual(REGISTERS.preprocessing.fields.map(f=>f.key), ['date','productLot','inputWeight','supplierOk','transportOk','materialOk','brushOk','airOk','dryStart','dryEnd','dryOk','qualityOk','outputWeight','correction','supervisor']);
 const prepValues={...state.records.preprocessing[0].values,date:'2026-09-10',supplier:'Nhà cung cấp tự nhập'};
 for (const key of ['brushOk','dryOk']) {
  assert.throws(()=>saveRecord(state,'preprocessing',{sourceId:'demo-5-1',values:{...prepValues,[key]:'K',correction:''}},`missing-correction-${key}`),/khắc phục/);
  assert.throws(()=>saveRecord(state,'preprocessing',{sourceId:'demo-5-1',values:{...prepValues,[key]:''}},`missing-check-${key}`),/Vui lòng nhập/);
 }
 const corrected=saveRecord(state,'preprocessing',{sourceId:'demo-5-1',values:{...prepValues,brushOk:'K',correction:'Vệ sinh lại khu vực và dụng cụ.'}},'corrected-prep');
 assert.equal(corrected.records.preprocessing.find(r=>r.id==='corrected-prep')!.values.supplier,state.records.receiving.find(r=>r.id==='demo-5-1')!.values.seller);
 assert(!sources(corrected,'packaging').some(r=>r.id==='corrected-prep'));
 assert.equal(state.records.purchases.length,8);
 assert(state.records.purchases.some(r => r.lotCode === 'TM-2026-0109'));
 assert(state.records.purchases.some(r => r.lotCode === 'TM-2026-0209'));
 assert(state.records.purchases.every(r => /^TM-\d{4}-\d{4}(?:-\d{2})?$/.test(r.lotCode) && !r.lotCode.includes('demo')), 'All purchase codes must follow TM-YYYY-DDMM without demo');

 // Verify receiving lotCode format LH-YYYY-DDMM without demo
 assert(state.records.receiving.some(r => r.lotCode === 'LH-2026-0109'));
 assert(state.records.receiving.some(r => r.lotCode === 'LH-2026-0209'));
 assert(state.records.receiving.every(r => /^LH-\d{4}-\d{4}(?:-\d{2})?$/.test(r.lotCode) && !r.lotCode.includes('demo')), 'All receiving codes must follow LH-YYYY-DDMM without demo');
 assert(state.records.preprocessing.every(r => /^LH-\d{4}-\d{4}(?:-\d{2})?$/.test(r.lotCode) && !r.lotCode.includes('demo')), 'All preprocessing codes must follow LH-YYYY-DDMM without demo');

 // Test multiple lots on the same day get suffixes -01, -02, -03...
 assert.equal(formatProductionLotCode('2026-09-15', []), 'LH-2026-1509');
 assert.equal(formatProductionLotCode('2026-09-15', ['LH-2026-1509']), 'LH-2026-1509-01');
 assert.equal(formatProductionLotCode('2026-09-15', ['LH-2026-1509', 'LH-2026-1509-01']), 'LH-2026-1509-02');
 assert.equal(formatProductionLotCode('2026-09-15', ['LH-2026-1509', 'LH-2026-1509-01', 'LH-2026-1509-02']), 'LH-2026-1509-03');

 // Test legacy state normalization (remove -demo suffix and update to TM-YYYY-DDMM and LH-YYYY-DDMM)
 const legacyPurchases = [
  { ...state.records.purchases[0], lotCode: 'TM-2526-20260901-demo-0-0', values: { ...state.records.purchases[0].values, date: '2026-09-01' } },
  { ...state.records.purchases[1], lotCode: 'TM-2526-20260902-demo-1-0', values: { ...state.records.purchases[1].values, date: '2026-09-02' } },
 ];
 const legacyReceiving = [
  { ...state.records.receiving[0], lotCode: 'LH-2526-20260901-demo-0-1', values: { ...state.records.receiving[0].values, date: '2026-09-01' } },
 ];
 const { state: normalized, changed } = normalizeGmpState({ ...state, records: { ...state.records, purchases: legacyPurchases, receiving: legacyReceiving } });
 assert(changed);
 assert(normalized.records.purchases.some(r => r.lotCode === 'TM-2026-0109'));
 assert(normalized.records.purchases.some(r => r.lotCode === 'TM-2026-0209'));
 assert.equal(normalized.records.receiving[0].lotCode, 'LH-2026-0109');
 assert.equal(normalized.records.inspection.find(r => r.lotCode === 'LH-2026-0809')?.values?.mealybug, 'Không', 'Normalized LH-2026-0809 must not have mealybug finding');
 assert.equal(state.records.aftersales.length,1);
 assert.equal(state.records.purchases.find(r => r.lotCode === 'TM-2026-0109')!.values.total, 59280000);
 assert.equal(state.records.preprocessing[0].values.inputWeight,1100);
 assert.equal(state.records.packaging[0].values.inputWeight,1098);
 assert.equal(state.records.sales[0].values.weight_kg,1044);
 assert.equal(state.records.aftersales[0].values.cadmiumOk, 'Đ');
 assert(!sources(state,'sales').some(r=>r.id==='demo-7-4'),'Failed inspection must not be available to sell');
 const purchase=state.records.purchases.find(r=>r.id==='demo-6-0')!;
 const receiving={...state.records.receiving[0].values,date:'2026-09-10'};
 assert.throws(()=>saveRecord(state,'receiving',{sourceId:purchase.id,values:{...receiving,grade1:900}},'bad-weight'),/phải bằng/);
 const received=saveRecord(state,'receiving',{sourceId:purchase.id,values:{...receiving,date:'2026-09-10',seller:'Tampered seller'}},'valid-receiving');
 assert.equal(received.records.receiving.find(r=>r.id==='valid-receiving')!.values.seller,purchase.values.seller,'Source data is server-derived');
 assert.throws(()=>saveRecord(received,'receiving',{sourceId:purchase.id,values:receiving},'duplicate'),/chưa đủ điều kiện/);
 assert.throws(()=>saveRecord(state,'sales',{sourceId:'demo-7-4',values:state.records.sales[0].values},'bad-sale'),/chưa đủ điều kiện/);
 const failed=state.records.inspection.find(r=>r.id==='demo-7-4')!;
 const passed={...failed.values,date:'2026-09-09',mealybug:'Không',quantity_boxes:58,weight_kg:1044};
 assert.throws(()=>saveRecord(state,'inspection',{sourceId:failed.sourceId,values:{...passed,sample1:0,sample2:0,sample3:0}},'bad-sample'),/2%/);
 const retested=saveRecord(state,'inspection',{sourceId:failed.sourceId,values:passed},'retested');
 assert(sources(retested,'sales').some(r=>r.id==='retested'));
 assert.equal(retested.records.inspection.filter(r=>r.sourceId===failed.sourceId).length,2,'Keep failed inspection history');
 assert.throws(()=>saveRecord(state,'purchases',{id:'demo-0-0',values:state.records.purchases[0].values},'edit'),/Không thể sửa/);
 assert.throws(()=>addPayment(state,{id:'bad',recordId:'demo-0-0',direction:'OUT',date:'2026-09-10',amount:999999999,method:'Tiền mặt'}),/không vượt/);
 assert.throws(()=>saveRecord(state,'aftersales',{id:'demo-0-6',values:{...state.records.aftersales[0].values,departureDate:''}},'bad-date'),/Vui lòng nhập/);

 // Test expense categories and operations
 assert.equal(EXPENSE_CATEGORIES.length, 9);
 assert(state.expenses && state.expenses.length >= 9);
 assert(state.expenses.some(e => e.category === 'Bao bì & đóng gói' && e.content.includes('1.000 thùng carton')));
 assert(EXPENSE_CATEGORIES.some(c => c.name === 'Sơ chế'));
 assert(state.expenses.some(e => e.category === 'Kiểm nghiệm & kiểm dịch' && e.content.includes('Phí kiểm nghiệm')));
 assert(state.expenses.some(e => e.category === 'Kho & bảo quản' && e.content.includes('kho lạnh')));
 assert(state.expenses.some(e => e.category === 'Vận chuyển & logistics' && e.content.includes('Hữu Nghị')));
 assert(state.expenses.some(e => e.category === 'Xuất khẩu' && e.content.includes('thủ tục')));
 assert(state.expenses.some(e => e.category === 'Nhân công' && e.content.includes('Nhân công')));
 assert(state.expenses.some(e => e.category === 'Vận hành cơ sở' && e.content.includes('Điện nước')));
 assert(state.expenses.some(e => e.category === 'Khác' && e.content.includes('Sửa cân')));

 const withExp = addExpense(state, { id: 'test-e1', date: '2026-09-18', category: 'Bao bì & đóng gói', content: 'Mua thêm 500 thùng', amount: 7500000 });
 assert.equal(withExp.expenses?.find(e => e.id === 'test-e1')?.amount, 7500000);
 assert(withExp.expenses?.find(e => e.id === 'test-e1')?.code?.startsWith('CP-2026-'), 'Generated expense code must start with CP-2026-');
 assert.equal(withExp.expenses?.find(e => e.id === 'test-e1')?.method, 'Chuyển khoản');
 assert.throws(() => addExpense(state, { id: 'bad', date: '2026-09-18', category: '', content: 'x', amount: 100 }), /nhóm chi phí/);
 assert.throws(() => addExpense(state, { id: 'bad', date: '2026-09-18', category: 'Khác', content: '', amount: 100 }), /nội dung chi/);
 assert.throws(() => addExpense(state, { id: 'bad', date: '2026-09-18', category: 'Khác', content: 'x', amount: -5 }), /lớn hơn 0/);
 const afterDel = deleteExpense(withExp, 'test-e1');
 assert(!afterDel.expenses?.some(e => e.id === 'test-e1'));

 await mkdir('scratch/gmp-exports',{recursive:true});
  for(const stage of STAGES) {
   const bytes=await buildRegisterDocx(stage,state.records[stage],'CN 1 - CÔNG TY THIÊN SƠN HẢI','Tháng 09/2026',[],state.records.receiving);
   const zip=await JSZip.loadAsync(bytes);
   const doc=await zip.file('word/document.xml')!.async('string');
   assert(doc.includes('w:orient="landscape"'));
   assert(doc.includes('w:sz w:val="30"'), 'Company name font size must be 15pt (sz="30")');
   assert(doc.includes('w:sz w:val="24"'), 'Title font size must be 12pt (sz="24")');
   assert(doc.includes('w:top="425" w:right="425" w:bottom="425" w:left="425"'), 'Top and bottom margins must match side margins (425 dxa)');
   if (['purchases', 'receiving', 'preprocessing', 'packaging', 'inspection'].includes(stage)) {
    if (stage === 'receiving') {
     assert(!doc.includes('THU MUA'), 'Receiving export must not include THU MUA subheader');
    }
    if (['preprocessing', 'packaging', 'inspection'].includes(stage)) {
     assert(!doc.includes('SẢN XUẤT'), 'Production registers must not include SẢN XUẤT subheader');
    }
   } else {
    assert(doc.includes(REGISTERS[stage].code));
   }
   if(stage!=='purchases' && stage!=='aftersales') assert(doc.includes('w:gridSpan'));
   if(stage==='receiving') assert(!doc.includes('Giá mua'));
   if(stage==='sales') assert(doc.includes('Giá trị (đ)'), 'Sales export must have column Giá trị (đ)');
   if(stage==='aftersales') assert(doc.includes('Cadmium'));
    if(stage==='inspection') {
     assert(doc.includes('—'), 'Inspection export must display dash for non-detected findings');
    }
    if(stage==='purchases') {
    assert(!doc.includes('Đ = Đạt; K = Không đạt.'), 'Purchases export must not include Đ/K legend');
    assert(doc.includes('Ngày thu mua'), 'Purchases export must have column Ngày thu mua');
    assert(doc.includes('Mã hồ sơ thu mua'), 'Purchases export must have column Mã hồ sơ thu mua');
    assert(doc.includes('Tên vùng trồng và địa chỉ'), 'Purchases export must have column Tên vùng trồng và địa chỉ');
    assert(!doc.includes('Thông tin vùng nguyên liệu'), 'Purchases export must not have legacy column Thông tin vùng nguyên liệu');
    assert(!doc.includes('Địa chỉ người bán'), 'Purchases export must not have column Địa chỉ người bán');
    assert(doc.includes('w:noWrap'), 'Purchases export must include noWrap on tight columns');
    assert(doc.includes('Kim Quy One Member Limited Liability Company'), 'Purchases export origin column must contain data');
   }
   await writeFile(`scratch/gmp-exports/${REGISTERS[stage].code}.docx`,bytes);
  }
 console.log('PASS: seed, inheritance, mass balance, duplicate prevention, failed-lot gating, 2% sample, retest history, edit locking, payments, dates and 7 Word exports.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
