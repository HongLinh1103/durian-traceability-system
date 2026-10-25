'use client';
import { useState } from 'react';
import { contactName, contactPhone } from '../../lib/sales-contact';

export function SalesContactField({ fieldKey, value, onChange, required = true }: {
  fieldKey: 'customer' | 'customerInfo'; value: string; onChange: (value: string) => void; required?: boolean;
}) {
  const [error, setError] = useState('');
  const phone = fieldKey === 'customerInfo';
  const label = phone ? 'Thông tin khách hàng' : 'Khách hàng';
  function validate(value: string) {
    if (!required && !value.trim()) { setError(''); return ''; }
    const result = (phone ? contactPhone : contactName).safeParse(value);
    const message = result.success ? '' : result.error.issues[0].message;
    setError(message);
    return message;
  }
  return <label className="block min-w-0 text-xs font-semibold leading-5 text-slate-600">
    <span>{label}{required ? ' *' : ''}</span>
    <input className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      name={fieldKey} type={phone ? 'tel' : 'text'} inputMode={phone ? 'tel' : 'text'}
      autoComplete={phone ? 'tel' : 'name'} required={required} maxLength={phone ? 40 : 120}
      value={value} placeholder={phone ? 'VD: 0912345678 hoặc +84 912 345 678' : 'VD: Nguyễn Văn A'}
      aria-invalid={!!error} aria-describedby={`${fieldKey}-help${error ? ` ${fieldKey}-error` : ''}`}
      onChange={event => { event.currentTarget.setCustomValidity(''); setError(''); onChange(event.target.value); }}
      onBlur={event => event.currentTarget.setCustomValidity(validate(event.target.value))}
      onInvalid={event => event.currentTarget.setCustomValidity(validate(event.currentTarget.value))} />
    <span id={`${fieldKey}-help`} className="mt-1 block font-normal text-slate-500">{phone ? 'Số điện thoại của cá nhân liên hệ; có thể dùng mã quốc gia.' : 'Họ và tên đầu mối giao dịch hoặc bàn giao hàng.'}</span>
    {error && <span id={`${fieldKey}-error`} role="alert" className="mt-1 block font-normal text-red-700">{error}</span>}
  </label>;
}
