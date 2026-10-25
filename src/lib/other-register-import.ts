import { OTHER_REGISTER_KEYS, OtherRegisterState, otherRegisterRows } from './other-registers';
import { sampleOtherRegisterRows } from './other-register-data';
import { saveOtherRegister } from './other-register-write';

/** Explicit one-time adoption requested by the operator. Never run on page reads. */
export function adoptOtherRegisterPreview(state: OtherRegisterState, actor: string, makeId: () => string, now = new Date().toISOString()) {
 let next = state;
 const imported: { book: string; lotCode: string; id: string }[] = [];
 for (const book of OTHER_REGISTER_KEYS) {
  for (const example of sampleOtherRegisterRows(state, book)) {
   if (otherRegisterRows(next, book).some(r => r.lotCode.split(' / ').includes(example.lotCode))) continue;
   const id = makeId();
   next = saveOtherRegister(next, { book, materialCode: example.lotCode, values: example.values, confirmed: true }, id, actor, now, 'IMPORTED_PREVIEW');
   imported.push({ book, lotCode: example.lotCode, id });
  }
 }
 return { state: next, imported };
}
