'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';

export function ImageFilePreviews({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  const urls = useMemo(() => files.map(file => URL.createObjectURL(file)), [files]);
  useEffect(() => () => urls.forEach(url => URL.revokeObjectURL(url)), [urls]);
  return <div className="flex flex-wrap gap-3">{urls.map((url,index) => <div key={url} className="relative">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={url} alt={files[index].name} className="h-24 w-24 rounded-xl border object-cover" />
    <button type="button" aria-label={`Xóa ảnh ${index+1}`} className="absolute right-0 top-0 rounded bg-white p-1 text-red-700" onClick={() => onRemove(index)}><Trash2 size={16}/></button>
  </div>)}</div>;
}

export function DiaryVoiceInput({ file, storedUrl, onChange, onRemoveStored, onRecordingChange, disabled = false }: {
  file: File | null; storedUrl?: string | null; onChange: (file: File | null) => void; onRemoveStored?: () => void; onRecordingChange: (recording: boolean) => void; disabled?: boolean;
}) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording,setRecording] = useState(false);
  const [starting,setStarting] = useState(false);
  const [error,setError] = useState('');
  const preview = useMemo(() => file ? URL.createObjectURL(file) : storedUrl || '', [file,storedUrl]);
  useEffect(() => () => { if (file && preview) URL.revokeObjectURL(preview); },[file,preview]);
  useEffect(() => { mounted.current=true; return () => { mounted.current=false; if(timer.current)clearTimeout(timer.current); if(recorder.current?.state==='recording')recorder.current.stop(); stream.current?.getTracks().forEach(track=>track.stop()); }; },[]);
  function stop() { if(recorder.current?.state==='recording')recorder.current.stop(); }
  async function start() {
    setError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('Trình duyệt chưa hỗ trợ ghi âm tại đây. Dùng HTTPS và Chrome/Safari mới, hoặc chọn file âm thanh từ thiết bị.'); return; }
    setStarting(true); onRecordingChange(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio:true });
      if(!mounted.current){media.getTracks().forEach(track=>track.stop());return;}
      stream.current=media;
      const mimeType=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type));
      const instance=new MediaRecorder(media,{...(mimeType?{mimeType}:{}),audioBitsPerSecond:64000});
      recorder.current=instance;
      const chunks:Blob[]=[];
      instance.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      instance.onerror=()=>{if(mounted.current)setError('Không thể hoàn tất bản ghi âm. Hãy ghi lại hoặc chọn file.');stop();};
      instance.onstop=()=>{
        media.getTracks().forEach(track=>track.stop());if(timer.current)clearTimeout(timer.current);
        if(!mounted.current)return;
        setRecording(false);onRecordingChange(false);
        const type=instance.mimeType.split(';')[0] || mimeType?.split(';')[0] || 'audio/webm';
        const blob=new Blob(chunks,{type});
        if(!blob.size || blob.size>2*1024*1024){setError('Bản ghi trống hoặc vượt 2 MB. Hãy ghi âm lại ngắn hơn.');return;}
        const extension=type.includes('mp4')?'m4a':type.includes('ogg')?'ogg':'webm';
        onChange(new File([blob],`voice-${Date.now()}.${extension}`,{type}));
      };
      instance.start(1000);setRecording(true);timer.current=setTimeout(stop,90000);
    } catch(e) {
      stream.current?.getTracks().forEach(track=>track.stop());onRecordingChange(false);
      setError(e instanceof DOMException && e.name==='NotAllowedError' ? 'Quyền microphone đã bị từ chối. Cho phép microphone trong cài đặt trình duyệt để ghi lại.' : 'Không thể mở microphone. Kiểm tra thiết bị hoặc chọn file âm thanh.');
    } finally {if(mounted.current)setStarting(false);}
  }
  return <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-sm font-semibold">Ghi âm đính kèm</p><p className="text-xs text-slate-600">Ghi tối đa 90 giây; nghe lại trước khi lưu. File được lưu cùng nhật ký khi nhấn Lưu.</p>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm" disabled={starting || (disabled && !recording)} onClick={()=>recording?stop():void start()}>{recording?<Square size={16}/>:<Mic size={16}/>} {starting?'Đang mở microphone...':recording?'Dừng ghi âm':'Bắt đầu ghi âm'}</button>
      <label className="cursor-pointer rounded-xl border bg-white px-3 py-2 text-sm">Chọn file âm thanh<input className="hidden" type="file" accept="audio/webm,audio/mp4,audio/ogg,audio/wav,audio/x-m4a" disabled={recording||starting||disabled} onChange={e=>{const next=e.target.files?.[0];if(next){if(next.size>2*1024*1024)setError('File âm thanh tối đa 2 MB.');else{onChange(next);setError('');}}e.target.value='';}}/></label>
      {preview && <button type="button" className="text-sm text-red-700" disabled={recording||disabled} onClick={()=>{onChange(null);onRemoveStored?.();}}>Xóa ghi âm</button>}
    </div>
    {recording && <p role="status" className="text-sm text-red-700">Đang ghi âm… Nhấn Dừng trước khi lưu nhật ký.</p>}
    {preview && <audio controls preload="metadata" src={preview} className="w-full" />}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
