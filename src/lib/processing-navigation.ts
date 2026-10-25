export const freshBooks = [
 {label:'Sổ Tiếp nhận & Sơ chế',key:'preprocessing'},
 {label:'Sổ Đóng gói & Nhập kho',key:'packaging'},
 {label:'Sổ Kiểm tra trước Xuất bán',key:'inspection'},
 {label:'Sổ Theo dõi Xuất bán',key:'sales'},
 {label:'Sổ Theo dõi sau Xuất bán',key:'aftersales'},
];
export const otherBooks = [freshBooks[0],
 {label:'Sổ Theo dõi Ủ chín',key:'ripening'},
 {label:'Sổ Theo dõi Cấp đông nhanh',key:'quick-freezing'},
 {label:'Sổ Theo dõi Tách múi',key:'peeling'},
 {label:'Sổ Theo dõi Bỏ hạt',key:'deseeding'},
 {label:'Sổ Theo dõi Đóng gói',key:'packing'},
 {label:'Sổ Giám sát Nhập kho TP',key:'warehouse'},
 {label:'Sổ Giám sát Xuất bán',key:'sales-monitoring'},
];
export const processingGroups = [{label:'Đóng gói trái tươi',path:'/dashboard/processing/fresh',books:freshBooks},{label:'Chế biến khác',path:'/dashboard/processing/other',books:otherBooks}].map(g=>({...g,items:g.books.map(b=>({...b,href:g.path+'/'+b.key}))}));
