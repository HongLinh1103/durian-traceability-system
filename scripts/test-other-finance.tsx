import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { addPayment } from '../src/lib/processing-gmp';
import { adoptOtherRegisterPreview } from '../src/lib/other-register-import';
import { OTHER_REGISTERS, OTHER_REGISTER_KEYS, OtherRegisterState, actualOtherRegisterRows, otherRegisterExport } from '../src/lib/other-registers';
import { saveOtherRegister } from '../src/lib/other-register-write';
import { otherMaterialSources } from '../src/lib/other-register-data';
import { processingFinanceSales, otherSaleFinanceId } from '../src/lib/processing-finance-sales';
import { OtherRegisterView } from '../src/components/processing/other-register-view';
import { SalesSubsystemBadge } from '../src/components/processing/sales-subsystem-badge';
import { monitoringWorkbook } from '../src/lib/other-monitoring-export';

let state:OtherRegisterState={demo:false,payments:[],records:{purchases:[],receiving:[{id:'receipt',sourceId:'harvest',lotCode:'LH-001',season:'2026',values:{date:'2026-10-20',classificationComplete:'1',sourceEligible:'1',cbLotCodes:'CB-001',otherProcessing:100,otherGrade1:40,otherGrade2:30,otherGrade3:20,otherGradeOther:10,variety:'Ri6',harvestRecordId:'harvest'}}],preprocessing:[],packaging:[],inspection:[],sales:[],aftersales:[]}};
let id=0;state=adoptOtherRegisterPreview(state,'test',()=>`id-${++id}`).state;
const sale=state.otherMonitoring!.find(r=>r.book==='sales-monitoring')!;
state=saveOtherRegister(state,{book:'sales-monitoring',id:sale.id,materialCode:sale.lotCode,confirmed:true,values:{...sale.values,customerName:'Công ty Thực phẩm A',customerAddress:'TP. Hồ Chí Minh',total:10000000}},sale.id,'test');
const ledger=processingFinanceSales(state);assert.equal(ledger.length,1);assert.equal(ledger[0].id,otherSaleFinanceId(sale.id));assert.equal(ledger[0].values.customer,'Công ty Thực phẩm A');assert.equal(ledger[0].values.total,10000000);assert.equal(ledger[0].values.salesSubsystem,'OTHER');assert.equal(state.records.sales.length,0,'No duplication into fresh traceability');
const paid=addPayment(state,{id:'payment',recordId:ledger[0].id,direction:'IN',date:'2026-10-26',amount:1234000,method:'Chuyển khoản'}) as OtherRegisterState;
assert.equal(paid.payments[0].recordId,otherSaleFinanceId(sale.id));assert.equal(processingFinanceSales(paid).length,1,'Payments do not duplicate the sale');
assert.throws(()=>addPayment(paid,{id:'too-much',recordId:ledger[0].id,direction:'IN',date:'2026-10-26',amount:10000000,method:'Chuyển khoản'}),/công nợ/);
assert.throws(()=>saveOtherRegister(paid,{book:'sales-monitoring',id:sale.id,materialCode:sale.lotCode,confirmed:true,values:{...paid.otherMonitoring!.find(r=>r.id===sale.id)!.values,total:100}},sale.id,'test'),/thấp hơn/);
const blocked=structuredClone(state.records.receiving[0]);blocked.id='conflicted';blocked.lotCode='LH-002';blocked.values={...blocked.values,cbLotCodes:'CB-002',sourceConflict:'1'};state={...state,records:{...state.records,receiving:[...state.records.receiving,blocked]}};
assert.equal(otherMaterialSources(state).length,2);assert(otherMaterialSources(state).find(s=>s.code==='CB-002')!.blocked);
for(const book of OTHER_REGISTER_KEYS){const rows=actualOtherRegisterRows(state,book);assert.equal(rows.length,2,book);const pending=rows.find(r=>r.lotCode==='CB-002')!;assert(pending.draft&&pending.sourceBlocked);const html=renderToStaticMarkup(<OtherRegisterView book={book} initialState={state}/>);assert(html.includes('Chờ đối chiếu nguồn'));const table=html.match(/<table\b[\s\S]*?<\/table>/)![0];for(const match of table.matchAll(/<td\b[^>]*class="([^"]*)"/g)){assert(match[1].includes('text-center'),book+' centers every body column');assert(!match[1].includes('text-right'));}}
assert.throws(()=>saveOtherRegister(state,{book:'preprocessing',materialCode:'CB-002',confirmed:true,values:{}},'blocked','test'),/sai khác/);
state=saveOtherRegister(state,{book:'sales-monitoring',materialCode:'CB-002',confirmed:false,values:{}},'blocked-draft','test');
assert.throws(()=>addPayment(state,{id:'draft-payment',recordId:otherSaleFinanceId('blocked-draft'),direction:'IN',date:'2026-10-26',amount:1,method:'Tiền mặt'}),/hoàn tất/);
assert(!OTHER_REGISTERS.warehouse.fields.some(f=>f.key==='total'));for(const book of ['warehouse','sales-monitoring'] as const){const fields=OTHER_REGISTERS[book].fields;const quantity=fields.findIndex(f=>f.key==='quantity');assert.equal(fields[quantity].label,'Số lượng (thùng)');assert.equal(fields[quantity+1].key,'weight');assert.equal(fields[quantity].group,'Số lượng/khối lượng');if(book==='sales-monitoring')assert.equal(fields[quantity+2].key,'total');}
const row=actualOtherRegisterRows(state,'sales-monitoring').find(r=>r.id===sale.id)!;const html=renderToStaticMarkup(<OtherRegisterView book="sales-monitoring" initialState={state}/>);assert(html.includes('<strong class="block font-bold">Công ty Thực phẩm A</strong>'));assert(html.includes('block font-normal text-slate-600">TP. Hồ Chí Minh'));
const exported=otherRegisterExport('sales-monitoring',[row],false);const customer=exported.columns.findIndex(f=>f.key==='customer');assert.equal(exported.rows[0][customer],'Công ty Thực phẩm A\nTP. Hồ Chí Minh');
const workbook=monitoringWorkbook(exported.title,exported.code,exported.columns,exported.rows);const customerCell=workbook.worksheets[0].getCell(5,customer+1);assert('richText' in (customerCell.value as object));assert.equal(customerCell.alignment.horizontal,'center');
assert(renderToStaticMarkup(<SalesSubsystemBadge other/>).includes('bg-blue-50'));assert(renderToStaticMarkup(<SalesSubsystemBadge other={false}/>).includes('bg-emerald-50'));
console.log('PASS other finance: seven-lot visibility pattern with conflict gating, centered cells, grouped quantities, company/address, one ledger row, payments, no overpayment/undervaluation and colored badges');
