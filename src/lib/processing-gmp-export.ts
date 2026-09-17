import JSZip from 'jszip';
import { Field, GmpRecord, REGISTERS, Stage } from './processing-gmp';

const xml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
function paragraph(text:unknown,bold=false,size=18) { return `<w:p><w:pPr><w:spacing w:after="50"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>${bold?'<w:b/>':''}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`; }
function cell(text:unknown,width:number,span=1,merge?:'restart'|'continue',bold=false) { return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${span>1?`<w:gridSpan w:val="${span}"/>`:''}${merge?`<w:vMerge w:val="${merge}"/>`:''}<w:vAlign w:val="center"/></w:tcPr>${paragraph(text,bold)}</w:tc>`; }
function row(cells:string,header=false) {return `<w:tr><w:trPr>${header?'<w:tblHeader/>':''}<w:cantSplit/></w:trPr>${cells}</w:tr>`;}
const exportGroups:Partial<Record<Stage,string[]>>={receiving:['Số lượng tiếp nhận (kg)'],preprocessing:['Đánh giá công đoạn vệ sinh tạp chất (Đ/K)','Đánh giá công đoạn phơi khô sản phẩm (Đ/K)'],packaging:['Đánh giá công đoạn đóng gói - đóng thùng (Đ/K)','Nhập kho thành phẩm'],inspection:['Số lượng/khối lượng tiếp nhận kiểm tra','Số lượng kiểm tra 2% (thùng)','Kết quả kiểm tra phát hiện/không đạt','Số lượng/khối lượng đưa qua xuất bán'],sales:['Thông tin lô hàng'],aftersales:['Thông tin lô hàng','Kết quả hậu kiểm lô hàng có phát hiện (Đ/K)']};
export function displayValue(field:Field,value:unknown) {
 if(field.type==='date' && value) return String(value).split('-').reverse().join('/');
 if(typeof value==='number') return value.toLocaleString('vi-VN');
 if(field.type==='finding') return value==='Có'?'Đ':value==='Không'?'K':'';
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
 return str.replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();
}
export async function buildRegisterDocx(stage:Stage,records:GmpRecord[],company:string,period:string) {
 const config=REGISTERS[stage];
 const fields:Field[]=stage==='purchases'?[{key:'purchaseCode',label:'Mã hồ sơ thu mua'},...config.fields.filter(f=>!f.internal)]:config.fields.filter(f=>!f.internal);
 const width=15118; // A4 landscape, 1.5 cm margins.
 const weights=fields.map(f=>['origin','customerInfo','productLot','correction','gardenInfo','treatmentPlan'].includes(f.key)?1.8: f.type==='number'||f.type==='finding'||f.type==='check'?0.7:1.1);
 const widths=weights.map(w=>Math.floor(width*w/weights.reduce((a,b)=>a+b,0)));
 const groups=exportGroups[stage]||[];
 const major=stage==='preprocessing'?'TIẾP NHẬN NGUYÊN LIỆU - SƠ CHẾ TRƯỚC KHI ĐÓNG GÓI':stage==='packaging'?'THEO DÕI ĐÓNG GÓI/ĐÓNG THÙNG - NHẬP KHO THÀNH PHẨM':'';
 const top=major?row(cell(fields[0].label,widths[0],1,'restart',true)+cell(fields[1].label,widths[1],1,'restart',true)+cell(major,widths.slice(2).reduce((a,b)=>a+b,0),fields.length-2,undefined,true),true):'';
 let first='',second='';
 for(let i=0;i<fields.length;) {
  const field=fields[i];
  const grouped=field.group && groups.includes(field.group);
  let count=1;
  if(grouped) while(i+count<fields.length && fields[i+count].group===field.group) count++;
  first+=cell(major&&i<2?'':grouped?field.group:field.label,widths.slice(i,i+count).reduce((a,b)=>a+b,0),count,major&&i<2?'continue':grouped?undefined:'restart',true);
  for(let j=i;j<i+count;j++) second+=cell(grouped?fields[j].label:'',widths[j],1,grouped?undefined:'continue',true);
  i+=count;
 }
 const body=records.map(r=>row(fields.map((f,i)=>cell(displayValue(f,f.key==='purchaseCode'?r.lotCode:r.values[f.key]),widths[i])).join(''))).join('');
 const empty=records.length? '':row(fields.map((_,i)=>cell('',widths[i])).join(''));
 const title=stage==='preprocessing'?'TIẾP NHẬN NGUYÊN LIỆU - SƠ CHẾ TRƯỚC KHI ĐÓNG GÓI':stage==='packaging'?'THEO DÕI ĐÓNG GÓI/ĐÓNG THÙNG - NHẬP KHO THÀNH PHẨM':config.title.toLocaleUpperCase('vi');
 const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(company.toLocaleUpperCase('vi'),true,24)}${paragraph(`${config.code} · ${period}`,true,22)}${paragraph(title,true,22)}<w:tbl><w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(s=>`<w:${s} w:val="single" w:sz="4" w:color="000000"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="45" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="45" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${top}${row(first,true)}${row(second,true)}${body}${empty}</w:tbl>${paragraph(stage==='inspection'?'Kết quả kiểm tra: Đ = có phát hiện; K = không phát hiện.':'Đ = Đạt; K = Không đạt.',false,18)}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="425" w:footer="425"/></w:sectPr></w:body></w:document>`;
 const zip=new JSZip();
 zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 zip.file('word/document.xml',doc);
 return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
export function downloadFile(data:BlobPart,name:string,type:string) {
 const url=URL.createObjectURL(new Blob([data],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
