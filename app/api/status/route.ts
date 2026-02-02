import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { isSharing } = await req.json();

        if (typeof isSharing !== "boolean") {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: {
                id: session.user.id,
            },
            data: {
                isSharing,
            },
        });

        return NextResponse.json({ success: true, isSharing: updatedUser.isSharing });
    } catch (error) {
        console.error("Status update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
