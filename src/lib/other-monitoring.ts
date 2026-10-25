import { GmpRecord, GmpState, Values, formatCbLotCode } from './processing-gmp';
import { productionSources } from './production-lots';
import { dryingTimestamp, dryingInput } from './drying-time';
export const MONITOR_BOOKS=['ripening','quick-freezing','peeling','deseeding','packing','warehouse','sales-monitoring'] as const;
export type MonitorBook=typeof MONITOR_BOOKS[number];
export type MonitorField={key:string;label:string;type:'date'|'datetime'|'number'|'check'|'text';group?:string;optional?:boolean;negative?:boolean};
export type MonitorRecord={id:string;book:MonitorBook;sourceId:string;lotCode:string;confirmed:boolean;values:Values;sample?:boolean;history:{actor:string;at:string;values:Values;confirmed:boolean}[]};
export type MonitorState=GmpState&{otherMonitoring?:MonitorRecord[]};
const f=(key:string,label:string,type:MonitorField['type']='text',extra:Partial<MonitorField>={}):MonitorField=>({key,label,type,...extra});
const correction=f('correction','Hành động sửa chữa','text',{optional:true});
const people=[f('receiver','Người tiếp nhận'),f('supervisor','Người giám sát')];
export const MONITOR_CONFIG:Record<MonitorBook,{title:string;code:string;fields:MonitorField[];widths:number[];serial?:boolean}>={
 ripening:{title:'SỔ THEO DÕI Ủ CHÍN',code:'BM-GMP.04',fields:[f('startDate','Ngày bắt đầu','date'),f('endDate','Ngày kết thúc','date'),f('processOk','Đánh giá công đoạn (Đ/K)','check'),correction,...people],widths:[170,140,140,160,220,170,170,150]},
 'quick-freezing':{title:'SỔ THEO DÕI CẤP ĐÔNG NHANH',code:'BM-GMP.05',serial:true,fields:[f('warehouse','Kho / IQF'),f('startAt','Ngày giờ bắt đầu','datetime'),f('endAt','Ngày giờ kết thúc','datetime'),...['1','2','3'].map((i)=>f('temperature'+i,'Lần '+i,'number',{group:'Nhiệt độ tâm sản phẩm (°C)',negative:true})),f('productOk','Tình trạng sản phẩm (Đ/K)','check'),correction,...people],widths:[65,170,140,185,185,105,105,105,150,200,160,160,150]},
 peeling:{title:'SỔ THEO DÕI TÁCH MÚI',code:'BM-GMP.06',fields:[f('monitoredAt','Ngày giờ giám sát','datetime'),f('equipmentOk','Tình trạng vệ sinh thiết bị (Đ/K)','check'),f('productOk','Tình trạng sản phẩm (Đ/K)','check'),correction,...people],widths:[170,190,180,170,220,170,170,150]},
 deseeding:{title:'SỔ THEO DÕI TÁCH BỎ HẠT',code:'BM-GMP.07',serial:true,fields:[f('monitoredAt','Ngày giờ giám sát','datetime'),f('equipmentOk','Tình trạng vệ sinh thiết bị (Đ/K)','check'),f('productOk','Tình trạng sản phẩm (Đ/K)','check'),correction,...people],widths:[65,170,190,180,170,220,170,170,150]},
 packing:{title:'SỔ THEO DÕI ĐÓNG GÓI',code:'BM-GMP.08',serial:true,fields:[f('date','Ngày tháng','date'),f('packagingOk','Tình trạng vệ sinh bao bì (Đ/K)','check'),f('packingOk','Đóng gói','check',{group:'Đánh giá công đoạn (Đ/K)'}),f('boxingOk','Đóng thùng','check',{group:'Đánh giá công đoạn (Đ/K)'}),correction,...people],widths:[65,170,140,180,140,140,220,170,170,150]},
 warehouse:{title:'SỔ GIÁM SÁT NHẬP KHO THÀNH PHẨM',code:'BM-GMP.09',fields:[f('recordedAt','Thời gian','datetime'),f('product','Sản phẩm'),f('quantity','Số lượng','number',{group:'Số lượng / khối lượng'}),f('weight','Khối lượng (kg)','number',{group:'Số lượng / khối lượng'}),f('appearanceOk','Đánh giá cảm quan (Đ/K)','check'),f('storageTemperature','Nhiệt độ kho lạnh (°C)','number',{negative:true}),f('operator','Người thực hiện')],widths:[170,190,200,130,150,180,180,180,150]},
 'sales-monitoring':{title:'SỔ GIÁM SÁT XUẤT BÁN',code:'BM-GMP.10',fields:[f('date','Ngày tháng năm','date'),f('recordedAt','Thời gian','datetime'),f('product','Sản phẩm'),f('quantity','Số lượng','number',{group:'Số lượng / khối lượng'}),f('weight','Khối lượng (kg)','number',{group:'Số lượng / khối lượng'}),f('appearanceOk','Đánh giá cảm quan (Đ/K)','check'),f('customer','Tên, địa chỉ khách hàng'),f('transportOk','Vệ sinh phương tiện vận chuyển (Đ/K)','check'),f('operator','Người thực hiện')],widths:[170,140,190,190,130,150,170,280,190,180,150]},
};
export function cbSources(state:GmpState):GmpRecord[]{
 return productionSources(state,'CB').filter(r=>!r.draft&&Number(r.values.otherProcessing)>0&&r.values.sourceEligible==='1'&&r.values.sourceConflict!=='1'&&r.values.processingEligible==='1').flatMap(r=>{
  const codes=String(r.values.cbLotCodes||'').split(/[\n,]/).map(s=>s.trim()).filter(Boolean);
  if(!r.values.productionLotId&&codes.length>1)return [];
  const lotCode=r.values.productionRoute==='CB'?r.lotCode:(codes[0]||(/^(LH|DG)-/.test(r.lotCode)?r.lotCode.replace(/^(LH|DG)-/,'CB-'):formatCbLotCode(r.values.date)));
  const values:Values={...r.values,input:Number(r.values.otherProcessing)};
  return [{...r,lotCode,values}];
 });
}
const validDay=(v:unknown)=>/^\d{4}-\d{2}-\d{2}$/.test(String(v))&&Number.isFinite(Date.parse(String(v)))&&new Date(String(v)).toISOString().slice(0,10)===v;
export function saveMonitor(state:MonitorState,book:MonitorBook,input:{id?:string;sourceId:string;values:Values;confirmed:boolean},id:string,actor:string):MonitorState{
 if(!MONITOR_BOOKS.includes(book))throw Error('Sổ không hợp lệ.');
 const rows=state.otherMonitoring||[],old=input.id?rows.find(r=>r.id===input.id):undefined;
 if(input.id&&(!old||old.book!==book))throw Error('Không tìm thấy bản ghi.');
 if(old&&old.sourceId!==input.sourceId)throw Error('Không được thay đổi lô nguồn của bản ghi đã tạo.');
 const source=cbSources(state).find(r=>r.id===input.sourceId);
 if(!source)throw Error('Lô CB chưa đủ điều kiện hoặc không thuộc sổ nhập hàng của cơ sở.');
 const values:Values={};
 for(const field of MONITOR_CONFIG[book].fields){
  const raw=input.values[field.key]??'';
  if(typeof raw!=='string'&&typeof raw!=='number')throw Error('Dữ liệu không hợp lệ.');
  if(input.confirmed&&!field.optional&&String(raw).trim()==='')throw Error('Vui lòng nhập '+field.label+'.');
  if(raw===''){values[field.key]='';continue;}
  if(field.type==='number'){
   const n=Number(raw);if(!Number.isFinite(n)||(!field.negative&&n<0))throw Error(field.label+': số liệu không hợp lệ.');
   if(field.key==='quantity'&&!Number.isInteger(n))throw Error('Số lượng phải là số nguyên.');
   values[field.key]=n;
  }else if(field.type==='check'){
   if(!['Đ','K'].includes(String(raw)))throw Error('Đánh giá phải là Đ hoặc K.');values[field.key]=String(raw);
  }else if(field.type==='date'){
   if(!validDay(raw))throw Error('Ngày không hợp lệ.');values[field.key]=String(raw);
  }else if(field.type==='datetime'){
   const stamp=dryingTimestamp(raw);if(!stamp&&input.confirmed)throw Error('Vui lòng nhập đầy đủ ngày giờ hợp lệ.');values[field.key]=stamp||String(raw);
  }else values[field.key]=String(raw).trim();
 }
 if(values.startDate&&values.endDate&&String(values.endDate)<String(values.startDate))throw Error('Ngày kết thúc không được trước ngày bắt đầu.');
 if(dryingTimestamp(values.startAt)&&dryingTimestamp(values.endAt)&&Date.parse(String(values.endAt))<=Date.parse(String(values.startAt)))throw Error('Ngày giờ kết thúc phải sau ngày giờ bắt đầu.');
 const eventDay=String(values.date||values.startDate||dryingInput(values.monitoredAt||values.recordedAt||values.startAt)||'').slice(0,10);
 if(book==='sales-monitoring'&&values.date&&dryingInput(values.recordedAt)&&String(values.date)!==dryingInput(values.recordedAt).slice(0,10))throw Error('Ngày xuất bán phải trùng ngày của thời điểm xuất bán.');
 if(input.confirmed&&source.values.date&&eventDay<String(source.values.date))throw Error('Ngày thực hiện không được trước ngày nhập nguyên liệu.');
 if(input.confirmed&&MONITOR_CONFIG[book].fields.some(f=>f.type==='check'&&values[f.key]==='K')&&!String(values.correction||input.values.correction||'').trim())throw Error('Vui lòng ghi hành động sửa chữa khi kết quả không đạt.');
 if(input.values.correction)values.correction=String(input.values.correction).trim();
 const candidate:MonitorRecord={id:old?.id||id,book,sourceId:source.id,lotCode:source.lotCode,values,confirmed:input.confirmed,...(old?.sample?{sample:true}:{}),history:[...(old?.history||[]),{actor,at:new Date().toISOString(),values:{...values},confirmed:input.confirmed}]};
 const updated=[...rows.filter(r=>r.id!==candidate.id),candidate];
 if(book==='warehouse'||book==='sales-monitoring'){
  if(input.confirmed&&(Number(values.quantity)<=0||Number(values.weight)<=0))throw Error('Số lượng và khối lượng phải lớn hơn 0.');
  const active=updated.filter(r=>r.sourceId===source.id&&r.confirmed);
  const warehouse=active.filter(r=>r.book==='warehouse');
  const good=warehouse.filter(r=>r.values.appearanceOk==='Đ');
  const sales=active.filter(r=>r.book==='sales-monitoring');
  const sum=(rs:MonitorRecord[],key:string)=>rs.reduce((n,r)=>n+Number(r.values[key]||0),0);
  const priorProcessed=(state as MonitorState&{otherProcessing?:{book:string;sourceId:string;confirmed:boolean;values:Values}[]}).otherProcessing?.find(r=>r.book==='preprocessing'&&r.sourceId===source.id&&r.confirmed);
  const limit=priorProcessed?Number(priorProcessed.values.output):Number(source.values.input);
  if(sum(warehouse,'weight')>limit+.001)throw Error('Khối lượng nhập kho vượt nguyên liệu CB đã sơ chế.');
  if(sum(sales,'quantity')>sum(good,'quantity')||sum(sales,'weight')>sum(good,'weight')+.001)throw Error('Xuất bán vượt tồn kho thành phẩm đạt cảm quan.');
  if(input.confirmed&&book==='sales-monitoring'&&(values.appearanceOk!=='Đ'||values.transportOk!=='Đ'))throw Error('Chỉ xuất bán khi sản phẩm và phương tiện vận chuyển đều đạt.');
  const warehousesBefore=good.filter(r=>String(r.values.recordedAt)<=String(values.recordedAt));
  if(input.confirmed&&book==='sales-monitoring'&&(Number(values.quantity)>sum(warehousesBefore,'quantity')||Number(values.weight)>sum(warehousesBefore,'weight')+.001))throw Error('Chưa đủ thành phẩm nhập kho trước thời điểm xuất bán.');
  let quantity=0,weight=0;
  const events=[...good.map(r=>({r,sign:1})),...sales.map(r=>({r,sign:-1}))].sort((a,b)=>String(a.r.values.recordedAt).localeCompare(String(b.r.values.recordedAt))||b.sign-a.sign);
  for(const event of events){quantity+=event.sign*Number(event.r.values.quantity);weight+=event.sign*Number(event.r.values.weight);if(quantity<0||weight<-.001)throw Error('Tồn kho không đủ tại thời điểm xuất bán.');}
 }
 return {...state,otherMonitoring:updated};
}
