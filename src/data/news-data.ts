// data/news-data.ts

export interface NewsArticle {
    id: string;
    title: string;
    summary: string;
    image: string;
    source: string;
    url: string; // Link bài báo thật trên mạng
    publishedAt: string;
}

export const newsArticles: NewsArticle[] = [
    {
        id: "1",
        title: "SẦU RIÊNG XUẤT KHẨU LẦN ĐẦU TIÊN CÓ QUY TRÌNH KIỂM SOÁT AN TOÀN THỰC PHẨM",
        summary:
            "Bộ Nông nghiệp và Môi trường chính thức ban hành quy trình hệ thống hóa các yêu cầu kiểm soát an toàn thực phẩm đối với quả sầu riêng tươi từ vùng trồng, thu hoạch đến xuất khẩu.",
        image:
            "https://static-images.vnncdn.net/vps_images_publish/000001/000003/2025/8/4/sau-rieng-xuat-khau-lan-dau-tien-co-quy-trinh-kiem-soat-an-toan-thuc-pham-1484.png?width=0&s=nNAuUpJC_G5D2z_I08M-Bw",
        source: "VietNamNet",
        url: "https://vietnamnet.vn/sau-rieng-xuat-khau-lan-dau-tien-co-quy-trinh-kiem-soat-an-toan-thuc-pham-2428478.html",
        publishedAt: "04/08/2025",
    },
    {
        id: "2",
        title: "THÊM 829 MÃ VÙNG TRỒNG SẦU RIÊNG ĐƯỢC CẤP PHÉP XUẤT KHẨU SANG TRUNG QUỐC",
        summary:
            "Tổng cục Hải quan Trung Quốc (GACC) phê duyệt thêm gần 1.000 mã số vùng trồng và cơ sở đóng gói sầu riêng cho Việt Nam, nâng tổng số mã được phép xuất khẩu chính ngạch.",
        image:
            "https://images2.thanhnien.vn/zoom/1200_630/528068263637045248/2025/5/22/d53e7e2996fe23a07aef-1747880433050760354666-0-0-800-1280-crop-1747880551749962404269.jpg",
        source: "Báo Thanh Niên",
        url: "https://thanhnien.vn/them-829-ma-vung-trong-sau-rieng-duoc-cap-phep-xuat-khau-185250522092318634.htm",
        publishedAt: "22/05/2025",
    },
    {
        id: "3",
        title: "SIẾT KIỂM DỊCH XUẤT KHẨU SẦU RIÊNG SAU CẢNH BÁO TỪ PHÍA TRUNG QUỐC",
        summary:
            "Cục Bảo vệ Thực vật yêu cầu các đơn vị áp dụng quy định mới, siết chặt kiểm dịch thực vật và kiểm soát dư lượng hóa chất đối với các lô hàng sầu riêng tươi xuất khẩu.",
        image:
            "https://images2.thanhnien.vn/zoom/1200_630/528068263637045248/2025/1/11/xuat-khau-sau-rieng-1690530230352179860544-27-0-427-640-crop-17365640216591957025411.jpg",
        source: "Báo Thanh Niên",
        url: "https://thanhnien.vn/siet-kiem-dich-xuat-khau-sau-rieng-sau-canh-bao-tu-trung-quoc-185250111100627463.htm",
        publishedAt: "11/01/2025",
    },
    {
        id: "4",
        title: "SẦU RIÊNG XUẤT KHẨU SANG TRUNG QUỐC BỊ TRẢ VỀ SẼ PHẢI KIỂM TRA CHẤT VÀNG O",
        summary:
            "Cục Trồng trọt và Bảo vệ thực vật yêu cầu kiểm soát chặt chẽ các chỉ tiêu an toàn thực phẩm, bao gồm Cadimi và chất vàng O đối với sầu riêng xuất khẩu bị cảnh báo.",
        image:
            "https://cdn2.tuoitre.vn/zoom/1200_630/471584752817336320/2025/8/7/edit-sau-rieng-17545423647611187321810-0-0-1340-2560-crop-175454239254226637958.jpeg",
        source: "Báo Tuổi Trẻ",
        url: "https://tuoitre.vn/sau-rieng-xuat-khau-sang-trung-quoc-bi-tra-ve-se-phai-kiem-tra-chat-vang-o-20250807120437106.htm",
        publishedAt: "07/08/2025",
    },
    {
        id: "5",
        title: "TRUNG QUỐC TIẾP TỤC TĂNG KIỂM TRA AN TOÀN THỰC PHẨM, NHẤT LÀ SẦU RIÊNG",
        summary:
            "Phía Trung Quốc tiếp tục hoàn thiện hệ thống quy định quản lý an toàn thực phẩm nhập khẩu theo Lệnh 248, 249 và đẩy mạnh kiểm tra thực tế đối với sầu riêng.",
        image:
            "https://nld.mediacdn.vn/zoom/600_315/291774122806476800/2025/9/15/sau-rieng-giong-co-sau-huu-chuong-bo-3-1751702280954960325171-1757908324436535017237-36-0-636-960-crop-17579083326011502606191.jpg",
        source: "Người Lao Động",
        url: "https://tuoitre.vn/nld/trung-quoc-tiep-tuc-tang-kiem-tra-an-toan-thuc-pham-nhat-la-sau-rieng-196250915110323271.htm",
        publishedAt: "15/09/2025",
    },
];
