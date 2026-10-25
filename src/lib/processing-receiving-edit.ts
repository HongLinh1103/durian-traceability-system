import { GmpState, GMP_GRADES, gradeTotal, Values } from './processing-gmp';

export function clearLegacyReceivingNotes(state: GmpState): GmpState {
  const next = structuredClone(state);
  for (const r of next.records.receiving) {
    if (r.values.notesDisplayVersion === 'blank-default-v1') continue;
    if (r.values.notes && r.values.notes !== '—') r.values.previousNotes = r.values.notes;
    r.values.notes = '—';
    r.values.notesDisplayVersion = 'blank-default-v1';
  }
  return next;
}

export function editReceivingRecord(state: GmpState, id: string, submitted: Values, actor: string): GmpState {
  const next = structuredClone(state);
  const r = next.records.receiving.find(x => x.id === id);
  if (!r || r.draft) throw new Error('Không tìm thấy bản ghi nhập hàng đã xác nhận.');
  const v = r.values;
  const before = { ...v };
  delete before.receivingEditAudit;
  const keys = [...GMP_GRADES.map(g => 'grade' + g.key), ...GMP_GRADES.map(g => 'otherGrade' + g.key)];
  const linked = next.productionLots?.some(l => l.allocations.some(a => a.active && a.receivingId === id)) || next.records.preprocessing.some(x => x.sourceId === id);
  const sourceKeys = ['date','seller','puc','origin','variety', ...keys];
  if (linked && sourceKeys.some(key => String(submitted[key] ?? v[key] ?? '') !== String(v[key] ?? ''))) throw new Error('Lô đã chuyển sang sản xuất. Chỉ được sửa người tiếp nhận và ghi chú để giữ nguyên dữ liệu nguồn.');
  for (const key of ['date','seller','puc','origin','variety','receiver']) {
    const text = String(submitted[key] ?? v[key] ?? '').trim();
    if (!text) throw new Error('Vui lòng nhập đủ thông tin nhập hàng.');
    v[key] = text;
  }
  const date = String(v.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Ngày nhập hàng không hợp lệ.');
  for (const key of keys) {
    const raw = submitted[key] ?? v[key];
    const n = Number(raw);
    if (raw === '' || raw === undefined || !Number.isFinite(n) || n < 0) throw new Error('Khối lượng phân loại phải là số không âm.');
    v[key] = n;
  }
  const baseline = Number(v.initialWeight) + Number(v.weightAdjustment || 0);
  v.otherProcessing = gradeTotal(v, 'otherGrade');
  v.acceptedWeight = gradeTotal(v, 'grade') + Number(v.otherProcessing);
  if (!Number.isFinite(baseline) || baseline <= 0 || Number(v.acceptedWeight) > baseline + .001) throw new Error('Khối lượng tiếp nhận không được vượt khối lượng ban đầu.');
  v.rejected = Math.max(0, Math.round((baseline - Number(v.acceptedWeight)) * 1000) / 1000);
  v.notes = String(submitted.notes ?? v.notes ?? '').trim() || '—';
  v.notesDisplayVersion = 'blank-default-v1';
  v.receivingEditAudit = JSON.stringify({ actor, at: new Date().toISOString(), before, after: { ...v, receivingEditAudit: undefined } });
  return next;
}
