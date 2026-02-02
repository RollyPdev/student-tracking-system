import { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
    interface User {
        role: Role;
        studentClass?: string | null;
    }

    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role: Role;
            studentClass?: string | null;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: Role;
        id: string;
        studentClass?: string | null;
    }
}
