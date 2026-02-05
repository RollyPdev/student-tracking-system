
export interface WeatherAlert {
    sender_name: string;
    event: string;
    start: Date;
    end: Date;
    description: string;
    tags: string[];
}

// Coordinates for the Philippines (Manila center primarily, or can be general)
const LAT = 12.8797;
const LNG = 121.7740;

export async function checkWeatherAlerts(): Promise<WeatherAlert[]> {
    try {
        // Fetch alerts from Open-Meteo (Free, No Key)
        // We use a broader range to cover the region
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&current=weather_code&hourly=visibility&alerts=true&timezone=Asia%2FManila`
        );

        if (!response.ok) return [];

        const data = await response.json();

        if (!data.alerts || data.alerts.length === 0) {
            return [];
        }

        // Map and filter for specific storm keywords
        const typhoonKeywords = ['typhoon', 'storm', 'cyclone', 'hurricane', 'signal no', 'hanging amihan', 'tropical depression'];

        const activeAlerts = data.alerts.filter((alert: any) => {
            const description = (alert.description || '').toLowerCase();
            const event = (alert.event || '').toLowerCase();

            return typhoonKeywords.some(keyword =>
                description.includes(keyword) || event.includes(keyword)
            );
        }).map((alert: any) => ({
            sender_name: alert.sender_name,
            event: alert.event,
            start: new Date(alert.start),
            end: new Date(alert.end),
            description: alert.description,
            tags: alert.tags || []
        }));

        return activeAlerts;
    } catch (error) {
        console.error("Failed to check weather alerts:", error);
        return [];
    }
}
