import type { GmpRecord, GmpState, Values } from './processing-gmp';
import type { MonitorRecord } from './other-monitoring';

export const otherSaleFinanceId = (id: string) => `other-sale:${id}`;
export const salesSubsystemLabel = (record: GmpRecord) => record.values.salesSubsystem === 'OTHER' ? 'Chế biến khác' : 'Đóng gói trái tươi';
export function otherSaleCustomer(values: Values) {
  const legacy = String(values.customer || '').split(/\n/);
  return { name:String(values.customerName || legacy[0] || '').trim(), address:String(values.customerAddress || legacy.slice(1).join('\n') || '').trim() };
}

/** One ledger projection per saved sale. Never duplicate a CB sale into the fresh GMP chain. */
export function processingFinanceSales(state: GmpState & {otherMonitoring?: MonitorRecord[]}): GmpRecord[] {
  const fresh = state.records.sales.map(record => ({...record,values:{...record.values,salesSubsystem:'FRESH',salesSubsystemName:'Đóng gói trái tươi'}}));
  const other = (state.otherMonitoring || []).filter(record => record.book === 'sales-monitoring').map(record => {
    const customer=otherSaleCustomer(record.values);
    const date=String(record.values.date || record.values.recordedAt || '').slice(0,10);
    return { id:otherSaleFinanceId(record.id),sourceId:record.id,lotCode:record.lotCode,season:state.records.receiving.find(r=>r.id===record.sourceId)?.season || '',draft:!record.confirmed || record.sample === true,
      values:{...record.values,date,customer:customer.name,customerAddress:customer.address,weight_kg:record.values.weight || 0,total:record.values.total ?? 0,salesSubsystem:'OTHER',salesSubsystemName:'Chế biến khác'} };
  });
  return [...fresh,...other];
}
