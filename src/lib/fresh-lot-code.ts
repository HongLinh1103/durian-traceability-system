import type { GmpRecord, GmpState, Stage, Values } from './processing-gmp';

export const FRESH_STAGES = ['preprocessing','packaging','inspection','sales','aftersales'] as const;

/** Resolve the assigned DG identity; never generate a production code from a later date. */
export function freshReceivingCode(state: GmpState, receiving: GmpRecord): string {
  const codes = [...new Set(String(receiving.values.dgLotCodes || '').split(/[,;\s]+/).filter(Boolean).map(code=>code.replace(/^LH-/, 'DG-')))];
  const assigned = state.productionLots?.filter(l=>l.route==='DG' && l.allocations.some(a=>a.active && a.receivingId===receiving.id));
  if (assigned?.length) return assigned.length===1 ? assigned[0].code : '';
  return codes.length===1 && codes[0].startsWith('DG-') ? codes[0] : receiving.lotCode.startsWith('DG-') ? receiving.lotCode : '';
}

export function freshLotCode(state: GmpState, stage: Stage, record: GmpRecord): string {
  if (!(FRESH_STAGES as readonly string[]).includes(stage)) return record.lotCode;
  const lot = state.productionLots?.find(l=>l.route==='DG' && (l.id===record.values.productionLotId || l.id===record.sourceId));
  if (lot) return lot.code;
  // An already assigned production identity takes precedence over a receiving lot split.
  if (record.lotCode.startsWith('DG-')) return record.lotCode;
  const index=FRESH_STAGES.indexOf(stage as typeof FRESH_STAGES[number]);
  const previous=index===0 ? 'receiving' : FRESH_STAGES[index-1];
  const source=state.records[previous].find(r=>r.id===record.sourceId);
  if (source) return previous==='receiving' ? freshReceivingCode(state,source) || record.lotCode : freshLotCode(state,previous,source);
  const receiving=state.records.receiving.filter(r=>r.lotCode===record.lotCode);
  return receiving.length===1 ? freshReceivingCode(state,receiving[0]) || record.lotCode : record.lotCode;
}

/** Preserve IDs, source links, quantities and old codes while upgrading historical GMP records. */
export function normalizeFreshLotCodes(state: GmpState): GmpState {
  let next=state;
  for (const stage of FRESH_STAGES) {
    const records=next.records[stage].map(record=>{
      const code=freshLotCode(next,stage,record);
      if (!code.startsWith('DG-') || code===record.lotCode) return record;
      const values:Values={...record.values,legacyLotCode:record.values.legacyLotCode || record.lotCode,lotCode:code};
      if (values.productLot) values.productLot=String(values.productLot).replaceAll(record.lotCode,code);
      return {...record,lotCode:code,values};
    });
    if (records.some((record,i)=>record!==next.records[stage][i])) next={...next,records:{...next.records,[stage]:records}};
  }
  return next;
}
