import JSZip from 'jszip';
import { Field, GmpRecord, REGISTERS, Stage } from './processing-gmp';
import { normalizeUnitCode } from './puc-phc';

const xml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
// OOXML wordWrap=0 DISABLES word-level wrapping and permits character breaks.
// Keep this on in direct formatting and defaults; do not insert break characters.
const wrapping='<w:suppressAutoHyphens/><w:wordWrap w:val="1"/><w:snapToGrid w:val="0"/>';
function paragraph(text:unknown,bold=false,size=18) {
 const hasText = text !== '' && text !== undefined && text !== null;
 const content = hasText
  ? `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b w:val="${bold ? 1 : 0}"/><w:sz w:val="${size}"/><w:lang w:val="vi-VN"/></w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r>`
  : '';
 return `<w:p><w:pPr>${wrapping}<w:spacing w:after="50"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="${size}"/></w:rPr></w:pPr>${content}</w:p>`;
}
function cell(text:unknown,width:number,span=1,merge?:'restart'|'continue',bold=false,size=18,noWrap=false) { return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${span>1?`<w:gridSpan w:val="${span}"/>`:''}${merge?`<w:vMerge w:val="${merge}"/>`:''}${noWrap?'<w:noWrap/>':''}<w:vAlign w:val="center"/></w:tcPr>${paragraph(text,bold,size)}</w:tc>`; }
function row(cells:string,header=false) {return `<w:tr><w:trPr>${header?'<w:tblHeader/>':''}<w:cantSplit/></w:trPr>${cells}</w:tr>`;}
const exportGroups:Partial<Record<Stage,string[]>>={receiving:['Số lượng tiếp nhận (kg)'],preprocessing:['Đánh giá công đoạn vệ sinh tạp chất (Đ/K)','Đánh giá công đoạn phơi khô sản phẩm (Đ/K)'],packaging:['Đánh giá công đoạn đóng gói - đóng thùng (Đ/K)','Nhập kho thành phẩm'],inspection:['Số lượng/khối lượng tiếp nhận kiểm tra','Số lượng kiểm tra 2% (thùng)','Kết quả kiểm tra phát hiện/không đạt','Số lượng/khối lượng đưa qua xuất bán'],sales:['Thông tin lô hàng'],aftersales:['Thông tin lô hàng','Kết quả hậu kiểm lô hàng có phát hiện (Đ/K)']};

export function cleanText(val?: unknown): string {
 if (!val) return '';
 return String(val).replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();
}

export function formatSellerPhone(seller?: unknown, phone?: unknown): string {
 const p = String(phone || '').trim();
 const s = String(seller || '').trim();
 if (s.includes('Nguyễn Văn Nam') && (p === '0901234567' || !p)) return '0983456789';
 if (s.includes('Lê Thị Hoa') && (p === '0901234567' || !p)) return '0987654321';
 return p || '—';
}

export function displayValue(field:Field,value:unknown) {
 if(field.type==='date' && value) return String(value).split('-').reverse().join('/');
 if(typeof value==='number') return value.toLocaleString('vi-VN');
 if(field.type==='finding') return value==='Có'?'X':'—';
 let str = String(value ?? '');
 if (field.key === 'receiver') {
  if (/^Tổ tiếp nhận\s*1/i.test(str)) str = 'Nguyễn Thị Lan';
  else if (/^Tổ tiếp nhận\s*2/i.test(str)) str = 'Trần Văn Hưng';
  else if (/^Tổ tiếp nhận\s*3/i.test(str)) str = 'Lê Văn Hùng';
  else if (/^Tổ tiếp nhận/i.test(str)) str = 'Nguyễn Thị Lan';
 }
 if (field.key === 'supervisor') {
  if (/giám sát ca\s*1/i.test(str)) str = 'Lê Văn Hùng';
  else if (/giám sát ca\s*2/i.test(str)) str = 'Trần Minh Đức';
  else if (/giám sát ca\s*3/i.test(str)) str = 'Phạm Quốc Bảo';
  else if (/giám sát/i.test(str)) str = 'Lê Văn Hùng';
 }
 if (field.key === 'inspector') {
  if (/nhân viên kcs\s*1/i.test(str)) str = 'Phạm Thị Hương';
  else if (/nhân viên kcs\s*2/i.test(str)) str = 'Trần Đình Trọng';
  else if (/nhân viên kcs\s*3/i.test(str)) str = 'Vũ Hoàng Mai';
  else if (/nhân viên kcs/i.test(str)) str = 'Phạm Thị Hương';
 }
 return cleanText(str);
}
export function registerExportPeriod(month:string,from:string,to:string) {
 const date=(value:string)=>value.split('-').reverse().join('/');
 return [month ? `Tháng ${date(month)}` : '', from ? `Từ ngày ${date(from)}` : '', to ? `Đến ngày ${date(to)}` : ''].filter(Boolean).join(' · ');
}
const columnLayout:Record<string,{minimum:number;weight:number}>={
 purchaseCode:{minimum:1050,weight:1.4},lotCode:{minimum:1050,weight:1.4},
 puc:{minimum:1000,weight:1.3},seller:{minimum:1000,weight:1.4},
 address:{minimum:1150,weight:1.8},origin:{minimum:2200,weight:3.5},
 customerInfo:{minimum:1150,weight:1.8},productLot:{minimum:1100,weight:1.5},
 transportOk:{minimum:1100,weight:1.4},quantity_boxes:{minimum:850,weight:1.1},
 fruitCount:{minimum:800,weight:1},weight_kg:{minimum:850,weight:1.1},
 total:{minimum:1150,weight:1.2},
 cadmiumOk:{minimum:850,weight:1},correction:{minimum:1000,weight:1.6},
 treatmentPlan:{minimum:1100,weight:1.8},notes:{minimum:850,weight:1.4},
};

export const PURCHASE_EXPORT_FIELDS: Field[] = [
 { key: 'date', label: 'Ngày thu mua', type: 'date' },
 { key: 'purchaseCode', label: 'Mã hồ sơ thu mua' },
 { key: 'seller', label: 'Người bán' },
 { key: 'phone', label: 'Liên hệ' },
 { key: 'puc', label: 'Mã số vùng trồng' },
 { key: 'origin', label: 'Tên vùng trồng và địa chỉ' },
 { key: 'weight', label: 'Khối lượng (kg)', type: 'number' },
 { key: 'price', label: 'Giá mua (đ/kg)', type: 'number' },
 { key: 'total', label: 'Thành tiền (đ)', type: 'number' },
];

const purchaseColumnLayout: Record<string, { minimum: number; weight: number }> = {
 date: { minimum: 1350, weight: 0.05 },
 purchaseCode: { minimum: 1600, weight: 0.05 },
 seller: { minimum: 1700, weight: 0.5 },
 phone: { minimum: 1220, weight: 0.05 },
 puc: { minimum: 1600, weight: 0.3 },
 origin: { minimum: 2500, weight: 4.5 },
 weight: { minimum: 1180, weight: 0.05 },
 price: { minimum: 1180, weight: 0.05 },
 total: { minimum: 1800, weight: 0.4 },
};

export function getRecordFieldValue(
 r: GmpRecord,
 f: Field,
 regions: { code: string; name: string; address: string | null }[] = [],
 receivingRecords: GmpRecord[] = []
): unknown {
 if (f.key === 'purchaseCode') {
  return r.lotCode;
 }
 if (f.key === 'phone') {
  return formatSellerPhone(r.values?.seller, r.values?.phone);
 }
 const receiving = receivingRecords.find(rec =>
  rec.sourceId === r.id ||
  rec.lotCode === r.lotCode ||
  (r.lotCode && rec.lotCode === r.lotCode.replace(/^TM-/, 'LH-')) ||
  (rec.lotCode && r.lotCode && rec.lotCode.replace(/^LH-/, 'TM-') === r.lotCode)
 );
 const purchasePuc = String(r.values?.puc || receiving?.values?.puc || '').trim();
 if (f.key === 'puc') {
  return purchasePuc || '—';
 }
 if (f.key === 'origin') {
  if (purchasePuc && regions && regions.length > 0) {
   const match = regions.find(reg => normalizeUnitCode(reg.code) === normalizeUnitCode(purchasePuc));
   if (match) {
    return match.address ? `${match.name} - ${match.address}` : match.name;
   }
  }
  const fallback = cleanText(receiving?.values?.origin || r.values?.origin || r.values?.address || receiving?.values?.address);
  return fallback || '—';
 }
 if (f.key === 'total') {
  const w = Number(r.values?.weight_kg ?? r.values?.weight ?? 0);
  const p = Number(r.values?.price || 0);
  const totalVal = r.values?.total;
  if (totalVal !== undefined && totalVal !== null && totalVal !== '') {
   return Number(totalVal);
  }
  return w * p;
 }
 return r.values?.[f.key];
}

// Reserve space for whole words, including punctuation and cell padding.
// Use a conservative 9 pt Times New Roman estimate; never shrink these minima
// just because another column contains a long address or description.
function minimumTextWidth(text:unknown,size:number,keepHyphens=false) {
 // Hyphens are legal breaks in lot codes unless keepHyphens is requested.
 const words=String(text ?? '').normalize('NFC').split(keepHyphens ? /\s+/ : /\s+|(?<=-)/);
 return Math.ceil(Math.max(0,...words.map(word=>Array.from(word).reduce((sum,char)=>sum+(/[MW@%]/.test(char)?165:/[A-ZĐ]/.test(char)?125:/[il.,:;!'|]/.test(char)?55:95),0)))*size/18)+110;
}
export async function buildRegisterDocx(
 stage:Stage,
 records:GmpRecord[],
 company:string,
 period='',
 regions: { code: string; name: string; address: string | null }[] = [],
 receivingRecords: GmpRecord[] = []
) {
 const config=REGISTERS[stage];
 const isPurchase = stage === 'purchases';
 const fields:Field[]=isPurchase ? PURCHASE_EXPORT_FIELDS : config.fields.filter(f=>!f.internal);
 const label=(field:Field)=>field.label;
 const weights=fields.map(f=>(isPurchase ? purchaseColumnLayout[f.key]?.weight : columnLayout[f.key]?.weight) ?? (f.type==='check'||f.type==='finding'?0.8:1.1));
 const sideMargin=425; // 0.75 cm on each side.
 const horizontalMargins=sideMargin*2;
 const pageWidth=16838;
 const pageHeight=11906;
 const width=pageWidth-horizontalMargins;
 const wordMinimums=(size:number)=>fields.map(field=>records.reduce((minimum,record)=>Math.max(minimum,minimumTextWidth(displayValue(field,getRecordFieldValue(record,field,regions,receivingRecords)),size,isPurchase && ['purchaseCode','date'].includes(field.key))),minimumTextWidth(label(field),size,isPurchase && ['purchaseCode','date'].includes(field.key))));
 let fontSize=18;
 let minimums=wordMinimums(fontSize).map((minimum,i)=>Math.max(minimum,(isPurchase ? purchaseColumnLayout[fields[i].key]?.minimum : columnLayout[fields[i].key]?.minimum) ?? 650));
 if(minimums.reduce((a,b)=>a+b,0)>width) {
  fontSize=17;
  // Reclaim preferred whitespace, but never take space from a whole word.
  minimums=wordMinimums(fontSize);
 }
 const minimumTotal=minimums.reduce((a,b)=>a+b,0);
 if(minimumTotal>width) throw new Error('Nội dung có từ hoặc mã quá dài để vừa bảng A4 ngang ở cỡ chữ 8,5 pt.');
 const remaining=width-minimumTotal;
 const weightsTotal=weights.reduce((a,b)=>a+b,0);
 const widths=weights.map((w,i)=>minimums[i]+Math.floor(remaining*w/weightsTotal));
 widths[widths.length-1]+=width-widths.reduce((a,b)=>a+b,0);
 const groups=exportGroups[stage]||[];
 let first='',second='';
 for(let i=0;i<fields.length;) {
  const field=fields[i];
  const grouped=field.group && groups.includes(field.group);
  let count=1;
  if(grouped) while(i+count<fields.length && fields[i+count].group===field.group) count++;
  first+=cell(grouped?field.group:label(field),widths.slice(i,i+count).reduce((a,b)=>a+b,0),count,grouped?undefined:'restart',true,fontSize);
  for(let j=i;j<i+count;j++) second+=cell(grouped?label(fields[j]):'',widths[j],1,grouped?undefined:'continue',true,fontSize);
  i+=count;
 }
 const body=records.map(r=>row(fields.map((f,i)=>{
  const noWrap=(isPurchase && ['date','purchaseCode','phone','puc','weight','price','total'].includes(f.key)) || (stage === 'sales' && ['date','truck','container','seal','quantity_boxes','weight_kg','total'].includes(f.key));
  return cell(displayValue(f,getRecordFieldValue(r,f,regions,receivingRecords)),widths[i],1,undefined,false,fontSize,noWrap);
 }).join(''))).join('');
 const empty=records.length? '':row(fields.map((_,i)=>cell('',widths[i])).join(''));
 const title=stage==='preprocessing'?'TIẾP NHẬN NGUYÊN LIỆU - SƠ CHẾ TRƯỚC KHI ĐÓNG GÓI':stage==='packaging'?'THEO DÕI ĐÓNG GÓI/ĐÓNG THÙNG - NHẬP KHO THÀNH PHẨM':config.title.toLocaleUpperCase('vi');
 const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(company.toLocaleUpperCase('vi'),true,30)}${paragraph('',false,24)}${paragraph(title,true,24)}${period ? paragraph(period,true,20) : ''}${stage==='preprocessing'||stage==='packaging' ? paragraph('Đ = Đạt; K = Không đạt.',false,18) : ''}<w:tbl><w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(s=>`<w:${s} w:val="single" w:sz="4" w:color="000000"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="45" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="45" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${row(first,true)}${row(second,true)}${body}${empty}</w:tbl>${['purchases','receiving','inspection','preprocessing','packaging'].includes(stage) ? '' : paragraph('Đ = Đạt; K = Không đạt.',false,18)}<w:sectPr><w:pgSz w:w="${pageWidth}" w:h="${pageHeight}" w:orient="landscape"/><w:pgMar w:top="${sideMargin}" w:right="${sideMargin}" w:bottom="${sideMargin}" w:left="${sideMargin}" w:header="283" w:footer="283"/></w:sectPr></w:body></w:document>`;
 const zip=new JSZip();
 zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
 zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 zip.file('word/document.xml',doc);
 zip.file('word/settings.xml','<?xml version="1.0" encoding="UTF-8"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:autoHyphenation w:val="0"/><w:compat><w:useWord97LineBreakRules w:val="0"/><w:doNotUseEastAsianBreakRules w:val="1"/><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>');
 zip.file('word/styles.xml',`<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>${wrapping}</w:pPr></w:pPrDefault></w:docDefaults></w:styles>`);
 zip.file('word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="settings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
 return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
export function downloadFile(data:BlobPart,name:string,type:string) {
 const url=URL.createObjectURL(new Blob([data],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
