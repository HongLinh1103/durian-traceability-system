import { z } from 'zod';
import type { GmpState, Values } from './processing-gmp';

export const contactPhone = z.string().trim()
  .transform(value => value.replace(/[\s().-]/g, ''))
  .refine(value => /^(?:\+[1-9][0-9]{7,14}|[0-9]{8,15})$/.test(value) && !/^0+$/.test(value), 'Nhập số điện thoại liên hệ hợp lệ gồm 8–15 chữ số, cho phép mã quốc gia khi cần (VD: 0912345678 hoặc +84 912 345 678). Không sử dụng trường này để ghi tên doanh nghiệp hoặc địa chỉ.');

export const contactName = z.string().trim().min(2, 'Nhập họ và tên cá nhân liên hệ (Ví dụ: Nguyễn Văn A).').max(120)
  .regex(/^[\p{L}\p{M} .'’\-]+$/u, 'Khách hàng phải là họ và tên cá nhân, không nhập số điện thoại, tên doanh nghiệp hoặc địa chỉ.')
  .refine(value => /\p{L}/u.test(value) && !/công ty|company|limited|\bltd\b|\bco\.|corporation|doanh nghiệp|\bTNHH\b|\bDNTN\b|\bCTCP\b|hợp tác xã|\bHTX\b|cửa hàng|địa chỉ/i.test(value), 'Khách hàng phải là họ và tên của một cá nhân liên hệ (Ví dụ: Nguyễn Văn A). Không nhập tên doanh nghiệp hoặc địa chỉ.');

export function parseSalesContact(values: Values): Values {
  return { ...values, customer: contactName.parse(values.customer), customerInfo: contactPhone.parse(values.customerInfo) };
}

/** Preserve historical company/address text without presenting it as a contact. */
export function normalizeLegacySalesContacts(state: GmpState): GmpState {
  let changed = false;
  const sales = state.records.sales.map(record => {
    const name = String(record.values.customer || '');
    const phone = String(record.values.customerInfo || '');
    const parsedName = contactName.safeParse(name);
    const parsedPhone = contactPhone.safeParse(phone);
    const customer = parsedName.success ? parsedName.data : '';
    const customerInfo = parsedPhone.success ? parsedPhone.data : '';
    if (customer === name && customerInfo === phone) return record;
    changed = true;
    const values: Values = { ...record.values, customer, customerInfo };
    if ((!parsedName.success && name) || (!parsedPhone.success && phone)) {
      values.legacySalesContact = record.values.legacySalesContact || JSON.stringify({ customer: name, customerInfo: phone });
    }
    return { ...record, values };
  });
  return changed ? { ...state, records: { ...state.records, sales } } : state;
}
