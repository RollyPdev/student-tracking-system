"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState, useMemo } from "react";
import { Bell, Check, Loader2 } from "lucide-react";

// Fix for default marker icon - use CDN URLs
const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MarkerData {
    id: string;
    name: string;
    position: [number, number];
    lastSeen: string;
    history?: [number, number][];
    isSharing?: boolean;
    image?: string | null;
    school?: string | null;
    className?: string;
}

interface MapProps {
    center: [number, number];
    zoom?: number;
    markers?: MarkerData[];
}

function RecenterMap({ position }: { position: [number, number] }) {
    const map = useMap();
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (mountedRef.current && map) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return null;
}

// Component for individual marker with location fetching
function MapMarkerWithLocation({ marker }: { marker: MarkerData }) {
    const [locationName, setLocationName] = useState<string>("Loading location...");
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const fetchedRef = useRef<string>("");

    const fetchLocationName = async (lat: number, lng: number) => {
        const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

        // Don't refetch if we already have this location
        if (fetchedRef.current === cacheKey) return;

        setIsLoadingLocation(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'en',
                        'User-Agent': 'StudentTrackingSystem/1.0'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();

                // Build a readable address from the response
                const address = data.address;
                let locationParts = [];

                if (address.road) locationParts.push(address.road);
                if (address.neighbourhood) locationParts.push(address.neighbourhood);
                if (address.suburb) locationParts.push(address.suburb);
                if (address.city || address.town || address.municipality) {
                    locationParts.push(address.city || address.town || address.municipality);
                }
                if (address.state || address.region) locationParts.push(address.state || address.region);

                const locationStr = locationParts.length > 0
                    ? locationParts.slice(0, 3).join(", ")
                    : data.display_name?.split(",").slice(0, 3).join(",") || "Unknown location";

                setLocationName(locationStr);
                fetchedRef.current = cacheKey;
            } else {
                setLocationName("Location unavailable");
            }
        } catch (error) {
            console.error("Failed to fetch location:", error);
            setLocationName("Location unavailable");
        } finally {
            setIsLoadingLocation(false);
        }
    };

    // Fetch location when marker position changes
    // Fetch location when marker position changes (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLocationName(marker.position[0], marker.position[1]);
        }, 1000); // 1s delay to prevent spamming the API while moving

        return () => clearTimeout(timer);
    }, [marker.position[0], marker.position[1]]);

    const createCustomIcon = (image: string | null | undefined, isSharing: boolean = false) => {
        if (image) {
            return L.divIcon({
                className: "custom-marker",
                html: `
                    <div class="relative group">
                        <div class="w-12 h-12 rounded-full border-4 ${isSharing ? 'border-emerald-500 shadow-emerald-200' : 'border-slate-300 shadow-slate-200'} overflow-hidden shadow-lg bg-white box-border transition-transform transform group-hover:scale-110">
                            <img src="${image}" class="w-full h-full object-cover" alt="Student" />
                        </div>
                        <div class="absolute -bottom-1 -right-1 w-4 h-4 ${isSharing ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'} rounded-full border-2 border-white"></div>
                    </div>
                `,
                iconSize: [48, 48],
                iconAnchor: [24, 24],
                popupAnchor: [0, -28],
            });
        }
        return DefaultIcon;
    };

    return (
        <>
            {/* Movement History Trail */}
            {marker.history && marker.history.length > 1 && (
                <>
                    <Polyline
                        positions={marker.history}
                        smoothFactor={1}
                        pathOptions={{
                            color: marker.isSharing ? '#10b981' : '#94a3b8',
                            weight: 6,
                            opacity: 0.8,
                            dashArray: marker.isSharing ? undefined : '5, 10'
                        }}
                    />
                    {/* Journey Start Point */}
                    <CircleMarker
                        center={marker.history[0]}
                        radius={5}
                        pathOptions={{
                            fillColor: '#ef4444',
                            color: 'white',
                            weight: 2,
                            fillOpacity: 1
                        }}
                    >
                        <Popup>Journey started here</Popup>
                    </CircleMarker>
                </>
            )}

            <Marker
                position={marker.position}
                icon={createCustomIcon(marker.image, marker.isSharing)}
            >
                <Popup>
                    <div className="p-3 min-w-[220px]">
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                            {marker.image ? (
                                <img src={marker.image} alt={marker.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                    {marker.name.charAt(0)}
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">{marker.name}</h3>
                                <div className={`text-[10px] font-bold uppercase tracking-wider ${marker.isSharing ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {marker.isSharing ? '• Live Tracking' : '• Offline'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="grid grid-cols-[20px_1fr] items-center gap-1">
                                <span className="text-gray-400">🏫</span>
                                <span className="font-medium text-gray-700 truncate">{marker.school || "School not set"}</span>
                            </div>
                            <div className="grid grid-cols-[20px_1fr] items-center gap-1">
                                <span className="text-gray-400">🎓</span>
                                <span className="font-medium text-gray-700 truncate">{marker.className || "Class N/A"}</span>
                            </div>
                            <div className="grid grid-cols-[20px_1fr] items-start gap-1">
                                <span className="text-gray-400">📍</span>
                                <div>
                                    <span className={`font-medium ${isLoadingLocation ? 'text-gray-400 italic' : 'text-gray-700'}`}>
                                        {locationName}
                                    </span>
                                    <div className="text-gray-400 font-mono text-[10px] mt-0.5">
                                        {marker.position[0].toFixed(5)}, {marker.position[1].toFixed(5)}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-[20px_1fr] items-center gap-1">
                                <span className="text-gray-400">🕒</span>
                                <span className="text-gray-500">{marker.lastSeen}</span>
                            </div>

                            {/* Notification Button */}
                            <div className="pt-3 mt-3 border-t border-gray-100">
                                <SendReminderButton studentId={marker.id} studentName={marker.name} />
                            </div>
                        </div>
                    </div>
                </Popup>
            </Marker>
        </>
    );
}

function SendReminderButton({ studentId, studentName }: { studentId: string, studentName: string }) {
    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

    const sendReminder = async () => {
        setStatus("sending");
        try {
            console.log("Sending reminder to:", studentId);
            const res = await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userIds: [studentId],
                    title: "Action Required",
                    message: "The admin is requesting you to update your status or location."
                }),
            });

            console.log("Response status:", res.status);

            if (!res.ok) {
                const errText = await res.text();
                console.error("Notification failed:", res.status, errText);
                throw new Error(`Failed: ${res.status} ${errText}`);
            }

            setStatus("sent");
            setTimeout(() => setStatus("idle"), 3000);
        } catch (error) {
            console.error("Error sending reminder:", error);
            setStatus("error");
            setTimeout(() => setStatus("idle"), 3000);
        }
    };

    if (status === "sent") {
        return (
            <button disabled className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all">
                <Check className="h-3 w-3" />
                Reminder Sent
            </button>
        );
    }

    if (status === "sending") {
        return (
            <button disabled className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold transition-all cursor-wait">
                <Loader2 className="h-3 w-3 animate-spin" />
                Sending...
            </button>
        );
    }

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                sendReminder();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-all"
        >
            <Bell className="h-3 w-3" />
            Send Reminder
        </button>
    );
}

function MapMarkers({ markers }: { markers: MarkerData[] }) {
    const memoizedMarkers = useMemo(() => markers, [JSON.stringify(markers)]);

    return (
        <>
            {memoizedMarkers.map((marker) => (
                <MapMarkerWithLocation key={marker.id} marker={marker} />
            ))}
        </>
    );
}

export default function Map({ center, zoom = 13, markers = [] }: MapProps) {
    const [mapReady, setMapReady] = useState(false);
    const mapRef = useRef<L.Map | null>(null);

    const memoizedCenter = useMemo(() => center, [center[0], center[1]]);

    return (
        <MapContainer
            center={memoizedCenter}
            zoom={zoom}
            scrollWheelZoom={true}
            className="h-full w-full rounded-xl shadow-lg border border-gray-100"
            ref={mapRef}
            whenReady={() => setMapReady(true)}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapReady && <MapMarkers markers={markers} />}
            {mapReady && <RecenterMap position={memoizedCenter} />}
        </MapContainer>
    );
}
