import type { UserRole } from "@prisma/client";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: UserRole;
            phone?: string | null;
            fullName?: string | null;
            avatar?: string | null;
            email?: string | null;
            isApproved?: boolean;
        };
    }

    interface User {
        role: UserRole;
        phone?: string | null;
        fullName?: string | null;
        avatar?: string | null;
        email?: string | null;
        isApproved?: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: UserRole;
        phone?: string | null;
        fullName?: string | null;
        avatar?: string | null;
        email?: string | null;
        isApproved?: boolean;
    }
}
