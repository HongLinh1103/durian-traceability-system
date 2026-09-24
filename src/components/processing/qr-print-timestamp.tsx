'use client';

import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export default function QrPrintTimestamp({ initialTime }: { initialTime: string }) {
  const [time, setTime] = useState(initialTime);
  useEffect(() => {
    const update = () => flushSync(() => setTime(new Date().toISOString()));
    window.addEventListener('beforeprint', update);
    return () => window.removeEventListener('beforeprint', update);
  }, []);
  return <time dateTime={time} className="qr-print-timestamp">{new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(time))}</time>;
}
