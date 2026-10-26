import ExcelJS from 'exceljs';
export type RegisterColumn={key:string;label:string;group?:string};
export function monitoringWorkbook(title:string,code:string,columns:RegisterColumn[],rows:(string|number)[][]){
 const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('Sổ theo dõi');
 sheet.addRow([title]);sheet.mergeCells(1,1,1,columns.length);sheet.getRow(1).font={bold:true,size:16};sheet.getRow(1).height=32;
 sheet.addRow([code]);sheet.mergeCells(2,1,2,columns.length);
 const grouped=columns.some(c=>c.group);const header=3,body=grouped?5:4;
 for(let i=0;i<columns.length;){
  const column=columns[i];let count=1;
  if(column.group)while(i+count<columns.length&&columns[i+count].group===column.group)count++;
  sheet.getCell(header,i+1).value=column.group||column.label;
  if(column.group){if(count>1)sheet.mergeCells(header,i+1,header,i+count);for(let j=i;j<i+count;j++)sheet.getCell(header+1,j+1).value=columns[j].label;}
  else if(grouped)sheet.mergeCells(header,i+1,header+1,i+1);
  i+=count;
 }
 rows.forEach((row,i)=>{row.forEach((value,j)=>{const cell=sheet.getCell(body+i,j+1);if(columns[j].key==='customer'&&typeof value==='string'&&value.includes('\n')){const[name,...address]=value.split('\n');cell.value={richText:[{text:name+'\n',font:{bold:true}},{text:address.join('\n'),font:{bold:false}}]};}else cell.value=value;if(columns[j].key==='total'||columns[j].key==='quantity')cell.numFmt='#,##0';if(columns[j].key==='weight')cell.numFmt='#,##0.###';});});
 sheet.columns.forEach((column,i)=>{column.width=columns[i].key==='lotCode'?23:columns[i].key==='correction'?30:22;});
 sheet.eachRow((row,index)=>{row.alignment={vertical:'middle',horizontal:'center',wrapText:true};if(index>=header){row.eachCell({includeEmpty:true},cell=>{cell.border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}};if(index<body){cell.font={bold:true};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE2E8F0'}};}});row.height=index<body?48:Math.min(180,Math.max(30,...rows[index-body].map(value=>typeof value==='string'?value.split('\n').reduce((lines,line)=>lines+Math.max(1,Math.ceil(line.length/20)),0)*14:30)));}});
 sheet.views=[{state:'frozen',ySplit:body-1,xSplit:1}];sheet.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0};
 return workbook;
}
