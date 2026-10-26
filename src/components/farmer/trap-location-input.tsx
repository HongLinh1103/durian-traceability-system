'use client';
import { useEffect, useRef, useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { TrapLocation, locationErrorMessage, trapMapUrl } from '@/lib/trap-location';
export function TrapLocationInput({value,onChange}:{value:Partial<TrapLocation>;onChange:(value:TrapLocation)=>void}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const mounted=useRef(true),request=useRef(0);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  function capture() {
    setError('');
    if(!window.isSecureContext || !navigator.geolocation){setError('Cần HTTPS và thiết bị hỗ trợ định vị. Bạn vẫn có thể nhập tọa độ thủ công.');return;}
    setBusy(true);const id=++request.current;
    navigator.geolocation.getCurrentPosition(position=>{
      if(!mounted.current||id!==request.current)return;
      const {latitude,longitude,accuracy}=position.coords;
      onChange({latitude,longitude,accuracyMeters:Number.isFinite(accuracy)?accuracy:null,locationCapturedAt:new Date(position.timestamp).toISOString()});setBusy(false);
    },failure=>{if(mounted.current&&id===request.current){setError(locationErrorMessage(failure.code));setBusy(false);}},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }
  const hasCoordinates=value.latitude!=null&&value.longitude!=null;
  return <div className="mt-2 space-y-2 text-xs">
    <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 font-semibold text-emerald-800 disabled:opacity-50" disabled={busy} onClick={capture}><LocateFixed size={15}/>{busy?'Đang xác định vị trí...':'Lấy vị trí hiện tại'}</button>
    {hasCoordinates&&<div role="status"><p>{value.latitude!.toFixed(7)}, {value.longitude!.toFixed(7)}</p><p className="text-slate-500">{value.locationCapturedAt?'Đã lấy vị trí':'Tọa độ nhập thủ công'}{value.accuracyMeters!=null?` · Sai số khoảng ${Math.round(value.accuracyMeters)} m`:''}</p><a className="text-emerald-700 underline" href={trapMapUrl(value.latitude!,value.longitude!)} target="_blank" rel="noopener noreferrer">Xem vị trí trên bản đồ</a></div>}
    <details><summary className="cursor-pointer text-slate-600">Nhập tọa độ thủ công / điều chỉnh</summary><div className="mt-2 grid grid-cols-2 gap-2">{(['latitude','longitude'] as const).map(key=><label key={key}>{key==='latitude'?'Vĩ độ':'Kinh độ'}<input className="mt-1 w-full rounded-lg border px-2 py-1.5" type="number" step="any" min={key==='latitude'?-90:-180} max={key==='latitude'?90:180} value={value[key]??''} onChange={e=>{request.current++;setBusy(false);setError('');onChange({latitude:value.latitude??null,longitude:value.longitude??null,[key]:e.target.value===''?null:Number(e.target.value),accuracyMeters:null,locationCapturedAt:null});}}/></label>)}</div></details>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
