import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcryptjs.hash("123456", 10);
    const result = await prisma.user.updateMany({
        where: { role: "FARMER" },
        data: {
            password: hashedPassword,
            accountStatus: "APPROVED",
            isApproved: true,
            isLocked: false,
        },
    });

    console.log(`✅ Đã đặt mật khẩu "123456" và kích hoạt thành công cho ${result.count} tài khoản FARMER!`);
}

main().finally(() => prisma.$disconnect());
