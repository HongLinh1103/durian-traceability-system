import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { SalesContactField } from '../src/components/processing/sales-contact-field';
import { contactName, contactPhone, normalizeLegacySalesContacts } from '../src/lib/sales-contact';
import { createDemoState, REGISTERS, saveRecord, GmpRecord } from '../src/lib/processing-gmp';
import { buildRegisterDocx } from '../src/lib/processing-gmp-export';
import JSZip from 'jszip';
import { prepareSale, syncSaleHandover } from '../src/lib/exporter-handover';

async function main() {
  for (const [input, expected] of [['0912345678', '0912345678'], ['+84 912 345 678', '+84912345678'], ['+86 (138) 0013-8000', '+8613800138000'], ['020.1234.5678', '02012345678']]) assert.equal(contactPhone.parse(input), expected);
  for (const input of ['', 'Nam Ninh, Trung Quốc', 'Công ty A', '1234567', '+0123456789', '1234567890123456', '0912abc678', '++84912345678', '0000000000']) assert(!contactPhone.safeParse(input).success, input);
  for (const input of ['Nguyễn Văn A', 'Trần Thị Mai', 'Đường Văn An', '李明', "Anne-Marie O’Neill"]) assert.equal(contactName.parse(input), input);
  for (const input of ['', '0912345678', 'Công ty Hoa Nam', 'TNHH Hoa Nam', 'Số 88 đường Đại Sa']) assert(!contactName.safeParse(input).success, input);

  const original = createDemoState();
  const old = original.records.sales[0];
  original.payments.push({ id: 'contact-test-payment', recordId: old.id, direction: 'IN', date: '2026-10-26', amount: 1, method: 'Tiền mặt' });
  old.values = { ...old.values, customer: 'Công ty Hoa Nam', customerInfo: 'Nam Ninh, Quảng Tây, Trung Quốc' };
  const before = JSON.parse(JSON.stringify(original));
  const normalized = normalizeLegacySalesContacts(original);
  const sale = normalized.records.sales[0];
  assert.equal(sale.values.customer, ''); assert.equal(sale.values.customerInfo, '');
  assert.deepEqual(JSON.parse(String(sale.values.legacySalesContact)), { customer: old.values.customer, customerInfo: old.values.customerInfo });
  assert.deepEqual(original, before, 'Do not mutate the original workspace');
  assert.equal(normalizeLegacySalesContacts(normalized), normalized, 'Normalization is idempotent');
  assert.deepEqual(normalized.records.aftersales, original.records.aftersales);
  assert.deepEqual(normalized.payments, original.payments);
  assert.deepEqual({ ...sale, values: old.values }, old, 'Record identity and source links stay intact');

  // Contact corrections must work even after settlement/downstream processing.
  const updated = saveRecord(normalized, 'sales', { id: sale.id, values: { ...sale.values, customer: 'Nguyễn Văn A', customerInfo: '+84 912 345 678' } }, sale.id);
  const corrected = updated.records.sales[0];
  assert.equal(corrected.values.customerInfo, '+84912345678');
  assert.deepEqual({ ...corrected.values, customer: sale.values.customer, customerInfo: sale.values.customerInfo }, sale.values, 'Contact-only edit cannot alter business values');
  assert.deepEqual(updated.records.aftersales, original.records.aftersales);
  assert.deepEqual(updated.payments, original.payments);
  const noExporterLookup = { exporterOrganization: { findFirst: async () => { throw Error('Historical contact corrections must not require exporter enrollment'); } } } as unknown as Parameters<typeof prepareSale>[0];
  await prepareSale(noExporterLookup, structuredClone(corrected), false);
  await assert.rejects(prepareSale(noExporterLookup, { ...corrected, values: { ...corrected.values, customerInfo: 'Nam Ninh' } }, false));
  const accepted: GmpRecord = { ...corrected, values: { ...corrected.values, exporterId: 'accepted-exporter' } };
  const acceptedTx = {
    $queryRaw: async () => [],
    exporterHandover: { findUnique: async () => ({ status: 'ACCEPTED', exporterId: 'accepted-exporter', snapshot: { boxes: Number(accepted.values.quantity_boxes), weight: Number(accepted.values.weight_kg), date: String(accepted.values.date), contactName: 'Nguyễn Văn B', contactPhone: String(accepted.values.customerInfo), country: String(accepted.values.country) } }) },
    exporterOrganization: { findFirst: async () => ({ id: 'accepted-exporter' }) },
    partnerFacility: { findUnique: async () => ({ name: 'Test', code: 'TEST' }) },
  } as unknown as Parameters<typeof syncSaleHandover>[0];
  await assert.rejects(syncSaleHandover(acceptedTx, 'test-owner', accepted, 'test-actor'), /đã xác nhận/, 'Accepted handover contact stays locked');
  assert.throws(() => saveRecord(normalized, 'sales', { id: sale.id, values: { ...sale.values, customer: 'Công ty A', customerInfo: '0912345678' } }, sale.id));
  assert.throws(() => saveRecord(normalized, 'sales', { id: sale.id, values: { ...sale.values, customer: 'Nguyễn Văn A', customerInfo: 'Địa chỉ A' } }, sale.id));
  assert.throws(() => saveRecord(normalized, 'sales', { id: sale.id, values: { ...sale.values, customer: 'Nguyễn Văn A', customerInfo: '0912345678', total: Number(sale.values.total) + 1 } }, sale.id), /thanh toán|chuyển công đoạn/);
  const certificate = saveRecord(normalized, 'sales', { id: sale.id, values: { ...sale.values, testCertificate: '/api/processing/gmp/certificates/12345678-1234-1234-1234-123456789abc.png' } }, sale.id);
  assert.equal(certificate.records.sales[0].values.customerInfo, '', 'Existing certificate-only edits remain possible without fabricated contact data');
  assert.equal(REGISTERS.sales.fields.find(f => f.key === 'customer')!.label, 'Khách hàng');
  assert.equal(REGISTERS.sales.fields.find(f => f.key === 'customerInfo')!.type, 'tel');
  const nameInput = renderToStaticMarkup(<SalesContactField fieldKey="customer" value="Nguyễn Văn A" onChange={() => {}} />);
  const phoneInput = renderToStaticMarkup(<SalesContactField fieldKey="customerInfo" value="+84912345678" onChange={() => {}} />);
  assert(nameInput.includes('type="text"') && nameInput.includes('autoComplete="name"'));
  assert(phoneInput.includes('type="tel"') && phoneInput.includes('inputMode="tel"') && phoneInput.includes('Thông tin khách hàng'));
  const docx = await buildRegisterDocx('sales', [corrected], 'Cơ sở kiểm thử');
  const document = await (await JSZip.loadAsync(docx)).file('word/document.xml')!.async('string');
  assert(document.includes('Thông tin khách hàng') && document.includes('Nguyễn Văn A') && document.includes('+84912345678'));
  assert(!document.includes('Công ty Hoa Nam') && !document.includes('Nam Ninh, Quảng Tây'));
  console.log('PASS sales contact: validation, safe legacy normalization, settled contact correction, form controls and export');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
