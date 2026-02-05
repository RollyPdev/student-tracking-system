
import { NextResponse } from "next/server";
import { checkWeatherAlerts } from "@/lib/weather";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const alerts = await checkWeatherAlerts();
        return NextResponse.json(alerts);
    } catch (error) {
        return NextResponse.json({ error: "Failed to check weather" }, { status: 500 });
    }
}
