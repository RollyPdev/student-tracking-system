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
        const { lat, lng, accuracy } = await req.json();

        if (typeof lat !== "number" || typeof lng !== "number") {
            return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
        }

        const locationLog = await prisma.locationLog.create({
            data: {
                lat,
                lng,
                accuracy,
                userId: session.user.id,
            },
        });

        return NextResponse.json(locationLog);
    } catch (error) {
        console.error("Location update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get latest location for each student
        const latestLocations = await prisma.user.findMany({
            where: {
                role: "STUDENT",
                locationLogs: {
                    some: {},
                },
            },
            select: {
                id: true,
                name: true,
                locationLogs: {
                    orderBy: {
                        timestamp: "desc",
                    },
                    take: 1,
                },
                studentProfile: {
                    include: {
                        class: true,
                    },
                },
            },
        });

        const formatted = latestLocations.map((u: any) => {
            const lastLoc = u.locationLogs[0];
            return {
                id: u.id,
                name: u.name || "Unknown",
                lat: lastLoc.lat,
                lng: lastLoc.lng,
                timestamp: lastLoc.timestamp,
                className: u.studentProfile?.class?.name || "N/A",
            };
        });

        return NextResponse.json(formatted);
    } catch (error) {
        console.error("Fetch locations error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
