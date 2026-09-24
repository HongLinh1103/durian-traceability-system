import { summarizeFinanceCharts } from './processing-finance-charts';
export type FinanceChartData = ReturnType<typeof summarizeFinanceCharts>;
export function financeChartImages(data: FinanceChartData): string[] {
  const colors = ['#059669', '#2563eb', '#d97706', '#9333ea', '#e11d48', '#0891b2', '#64748b'];
  function canvas(title: string, height: number) {
    const element = document.createElement('canvas'); element.width = 1200; element.height = height;
    const ctx = element.getContext('2d'); if (!ctx) throw new Error('Không thể tạo ảnh biểu đồ.');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1200, height);
    ctx.fillStyle = '#0f172a'; ctx.font = 'bold 28px Arial'; ctx.fillText(title, 35, 45);
    return { element, ctx };
  }
  const donut = canvas('Cơ cấu chi phí hoạt động', Math.max(500, data.expenses.length * 65 + 100));
  const positive = data.expenses.filter(item => item.value > 0);
  const total = positive.reduce((sum, item) => sum + item.value, 0);
  let angle = -Math.PI / 2;
  positive.forEach((item, i) => {
    const end = angle + item.value / total * Math.PI * 2;
    const ctx = donut.ctx; ctx.beginPath(); ctx.arc(265, 265, 150, angle, end); ctx.arc(265, 265, 88, end, angle, true); ctx.closePath(); ctx.fillStyle = colors[i % colors.length]; ctx.fill(); angle = end;
    ctx.fillRect(500, 93 + i * 65, 18, 18); ctx.fillStyle = '#0f172a'; ctx.font = '20px Arial'; ctx.fillText(item.name, 535, 110 + i * 65);
    ctx.font = '18px Arial'; ctx.fillText(`${item.value.toLocaleString('vi-VN')} đ (${(item.value / total * 100).toFixed(1)}%)`, 535, 136 + i * 65);
  });
  if (!total) { donut.ctx.font = '22px Arial'; donut.ctx.fillText('Không có chi phí trong kỳ đã chọn.', 40, 120); }
  const max = Math.max(500000000, ...data.cashFlow.flatMap(row => [row.inflow, row.outflow]));
  const axisMax = Math.ceil(max / 500000000) * 500000000;
  const height = Math.max(550, Math.ceil(axisMax / 500000000) * 28 + 160);
  if (height > 16000) throw new Error('Giá trị biểu đồ quá lớn. Vui lòng thu hẹp kỳ báo cáo.');
  const bars = canvas('Thu – Chi thực tế', height); const ctx = bars.ctx;
  ctx.font = '18px Arial'; ctx.fillText('Đơn vị: Tỷ đồng', 35, 80);
  const top = 115, bottom = height - 100, left = 100, right = 1160;
  const y = (value: number) => bottom - value / axisMax * (bottom - top);
  for (let value = 0; value <= axisMax; value += 500000000) {
    ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(left, y(value)); ctx.lineTo(right, y(value)); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.fillText((value / 1e9).toLocaleString('vi-VN', { minimumFractionDigits: 1 }), 35, y(value) + 6);
  }
  const slot = (right - left) / Math.max(1, data.cashFlow.length);
  data.cashFlow.forEach((row, i) => {
    const center = left + slot * (i + 0.5), width = Math.min(35, slot * 0.3);
    ctx.fillStyle = '#059669'; ctx.fillRect(center - width - 2, y(row.inflow), width, bottom - y(row.inflow));
    ctx.fillStyle = '#e11d48'; ctx.fillRect(center + 2, y(row.outflow), width, bottom - y(row.outflow));
    ctx.fillStyle = '#475569'; ctx.font = '16px Arial'; ctx.save(); ctx.translate(center, bottom + 24); if (data.cashFlow.length > 12) ctx.rotate(-Math.PI / 4); ctx.textAlign = 'center'; ctx.fillText(row.month.slice(5) + '/' + row.month.slice(0, 4), 0, 0); ctx.restore();
  });
  ctx.font = '20px Arial'; ctx.fillStyle = '#059669'; ctx.fillText('■ Tiền vào', 450, height - 20); ctx.fillStyle = '#e11d48'; ctx.fillText('■ Tiền ra', 620, height - 20);
  if (!data.cashFlow.length) { ctx.fillStyle = '#475569'; ctx.fillText('Không có dòng tiền trong kỳ đã chọn.', 300, 250); }
  return [donut.element.toDataURL('image/png'), bars.element.toDataURL('image/png')];
}
