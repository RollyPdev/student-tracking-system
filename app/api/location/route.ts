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
                image: true,
                school: true,
                isSharing: true,
                studentClass: true,
                locationLogs: {
                    orderBy: {
                        timestamp: "desc",
                    },
                    take: 50,
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
            if (!lastLoc) return null; // Skip users with no logs

            // Reverse logs for history to go from oldest to newest
            const history = [...u.locationLogs]
                .reverse()
                .map((l: any) => [l.lat, l.lng]);

            return {
                id: u.id,
                name: u.name || "Unknown",
                lat: lastLoc.lat,
                lng: lastLoc.lng,
                timestamp: lastLoc.timestamp,
                className: u.studentProfile?.class?.name || u.studentClass || "N/A",
                isSharing: u.isSharing ?? false,
                image: u.image,
                school: u.school,
                history: history,
            };
        }).filter(Boolean);

        return NextResponse.json(formatted);
    } catch (error) {
        console.error("Fetch locations error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
