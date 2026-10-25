// Local form values always represent Vietnam time, independently of the browser timezone.
export function dryingTimestamp(value: unknown): string {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/.test(text)) return '';
  const local = !/(Z|[+-]\d{2}:\d{2})$/.test(text);
  const date = new Date(local ? `${text}+07:00` : text);
  if (!Number.isFinite(date.getTime())) return '';
  if (local && vietnamInput(date.toISOString()) !== text.slice(0, 16)) return '';
  return date.toISOString();
}
export function vietnamInput(value: unknown): string {
  const date = new Date(String(value || ''));
  return Number.isFinite(date.getTime()) ? new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 16) : '';
}
export function dryingInput(value: unknown): string {
  const stamp = dryingTimestamp(value);
  return stamp ? vietnamInput(stamp) : '';
}
export function formatDryingTime(value: unknown): string {
  const text = dryingInput(value);
  if (!text) return value ? `${value} · Cần bổ sung ngày` : 'Chưa ghi nhận';
  return `${text.slice(8, 10)}/${text.slice(5, 7)}/${text.slice(0, 4)} ${text.slice(11)}`;
}
export function dryingDuration(start: unknown, end: unknown): string {
  const a = dryingTimestamp(start), b = dryingTimestamp(end);
  if (!a || (end && !b)) return 'Cần bổ sung ngày giờ';
  if (!b) return 'Đang thực hiện';
  let minutes = (Date.parse(b) - Date.parse(a)) / 60000;
  if (minutes <= 0) return 'Ngày giờ kết thúc phải lớn hơn ngày giờ bắt đầu';
  const days = Math.floor(minutes / 1440); minutes %= 1440;
  const hours = Math.floor(minutes / 60); minutes %= 60;
  return [days && `${days} ngày`, hours && `${hours} giờ`, minutes && `${minutes} phút`].filter(Boolean).join(' ');
}
