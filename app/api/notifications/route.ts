
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Assuming authOptions is exported from here or similar
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 50, // Limit to last 50 notifications
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

import webPush from 'web-push';

// Configure web-push (Ideally keys should be in environment variables)
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BMsw-kEivG7iDDvQ1ZBcgjow0x12WidnMSEjk-tDUp7U-hctBMKidennFS_mBsB7oBuZX4UKGgTvTDpS30PCT6Y';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'uWLqU81spTzhL9fbWM_Owrgdh-grzk5eSZv0SNhGp8U';

webPush.setVapidDetails(
    'mailto:test@test.com',
    publicVapidKey,
    privateVapidKey
);

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    // Only Admins or Teachers can send notifications
    if (!session || !session.user || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        console.log("Notification POST body:", body);
        const { userIds, title, message } = body; // userIds can be a single ID string or an array of strings

        if (!title || !message) {
            return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
        }

        if (!userIds || (Array.isArray(userIds) && userIds.length === 0)) {
            return NextResponse.json({ error: "No recipients specified" }, { status: 400 });
        }

        const targets = Array.isArray(userIds) ? userIds : [userIds];

        // 1. Create notifications in DB (Keep existing logic)
        await prisma.notification.createMany({
            data: targets.map((userId: string) => ({
                userId,
                title,
                message,
            })),
        });

        // 2. Send Web Push Notifications
        const subscriptions = await prisma.pushSubscription.findMany({
            where: {
                userId: {
                    in: targets
                }
            }
        });

        const payload = JSON.stringify({ title, body: message });

        // Send parallel push notifications
        const pushPromises = subscriptions.map(sub => {
            const subscription = {
                endpoint: sub.endpoint,
                keys: sub.keys as any
            };
            return webPush.sendNotification(subscription, payload)
                .catch(err => console.error("Error sending push to", sub.userId, err));
        });

        await Promise.all(pushPromises);

        return NextResponse.json({ success: true, count: targets.length, pushedTo: subscriptions.length });
    } catch (error: any) {
        console.error("Error sending notifications:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
