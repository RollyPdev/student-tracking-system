"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { MapPin, Power, Cloud, Navigation, History, Shield, LogOut, User, Bell, X, Check, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudentDashboard() {
    const { data: session } = useSession();
    const [isTracking, setIsTracking] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const watchId = useRef<number | null>(null);
    const lastSentLocation = useRef<{ lat: number; lng: number; time: number } | null>(null);

    // Notification State
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [emergencyAlert, setEmergencyAlert] = useState<{ title: string, message: string } | null>(null);
    const audioContextRef = useRef<any>(null);

    const playSiren = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sawtooth';
            const now = ctx.currentTime;

            // Urgent siren pattern
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.linearRampToValueAtTime(900, now + 0.3);
            osc.frequency.linearRampToValueAtTime(600, now + 0.6);
            osc.frequency.linearRampToValueAtTime(900, now + 0.9);
            osc.frequency.linearRampToValueAtTime(600, now + 1.2);
            osc.frequency.linearRampToValueAtTime(900, now + 1.5);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0, now + 2.0);

            osc.start(now);
            osc.stop(now + 2.0);
        } catch (e) {
            console.error(e);
        }
    };

    // Fetch notifications periodically
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await fetch("/api/notifications");
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data);
                    setUnreadCount(data.filter((n: any) => !n.isRead).length);

                    // Check for emergency
                    const latestUnread = data.find((n: any) => !n.isRead &&
                        (n.title.toUpperCase().includes("TYPHOON") || n.message.toUpperCase().includes("EMERGENCY")));

                    if (latestUnread) {
                        setEmergencyAlert({
                            title: latestUnread.title,
                            message: latestUnread.message
                        });
                        playSiren();
                    }
                }
            } catch (err) {
                console.error("Failed to fetch notifications:", err);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    // Register Push Notifications
    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            import('@/lib/push').then(async ({ registerServiceWorker, subscribeUserToPush }) => {
                await registerServiceWorker();
                // Replace with your VAPID public key
                const publicKey = 'BMsw-kEivG7iDDvQ1ZBcgjow0x12WidnMSEjk-tDUp7U-hctBMKidennFS_mBsB7oBuZX4UKGgTvTDpS30PCT6Y';
                await subscribeUserToPush(publicKey);
            });
        }
    }, [session]);

    const markAsRead = async (id: string) => {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error(err);
        }
    };

    const startTracking = () => {
        // Check if running in a secure context (HTTPS or localhost)
        if (typeof window !== 'undefined' && !window.isSecureContext) {
            setError("Location sharing requires HTTPS. Please access this site via a secure connection.");
            return;
        }

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            return;
        }

        // Request permission first
        navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
            if (result.state === 'denied') {
                setError("Location permission was denied. Please enable location access in your browser settings.");
                return;
            }
        }).catch(() => {
            // Permissions API not supported, continue anyway
        });

        setIsTracking(true);
        setError(null);

        // Update status to online
        fetch("/api/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isSharing: true }),
        }).catch(err => console.error("Failed to update status:", err));

        watchId.current = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                setLocation({ lat: latitude, lng: longitude, accuracy });
                setLastSync(new Date());

                // Always send the first location, or if moved significantly (> 0.0001 degrees, approx 11 meters)
                const isFirstLocation = !lastSentLocation.current;
                const hasMoved = isFirstLocation ||
                    Math.abs(lastSentLocation.current!.lat - latitude) > 0.0001 ||
                    Math.abs(lastSentLocation.current!.lng - longitude) > 0.0001;

                // Also send periodic heartbeat every 30 seconds even without movement
                const lastSentTime = lastSentLocation.current?.time || 0;
                const shouldSendHeartbeat = Date.now() - lastSentTime > 30000;

                if (hasMoved || shouldSendHeartbeat) {
                    try {
                        fetchAddress(latitude, longitude);
                        await fetch("/api/location", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                lat: latitude,
                                lng: longitude,
                                accuracy,
                            }),
                        });
                        lastSentLocation.current = { lat: latitude, lng: longitude, time: Date.now() };
                    } catch (err) {
                        console.error("Failed to sync location:", err);
                    }
                }
            },
            (err) => {
                let errorMessage = err.message;

                // Provide more user-friendly error messages
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        errorMessage = "Location permission denied. Please allow location access in your browser settings.";
                        break;
                    case err.POSITION_UNAVAILABLE:
                        errorMessage = "Location information is unavailable. Please make sure GPS is enabled.";
                        break;
                    case err.TIMEOUT:
                        errorMessage = "Location request timed out. Please try again.";
                        break;
                }

                setError(errorMessage);
                setIsTracking(false);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 15000,
            }
        );
    };

    const fetchAddress = async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`
            );
            if (response.ok) {
                const data = await response.json();
                const addr = data.address;
                const parts = [];
                if (addr.road) parts.push(addr.road);
                if (addr.neighbourhood) parts.push(addr.neighbourhood);
                if (addr.city || addr.town) parts.push(addr.city || addr.town);
                setAddress(parts.join(", ") || "Unknown Location");
            }
        } catch (err) {
            console.error("Failed to fetch address:", err);
        }
    };

    const stopTracking = () => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
        setIsTracking(false);

        // Update status to offline
        fetch("/api/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isSharing: false }),
        }).catch(err => console.error("Failed to update status:", err));
    };

    useEffect(() => {
        return () => {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, []);

    const handleLogout = () => {
        signOut({ callbackUrl: "/auth/signin" });
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-md mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Student Portal</h1>
                        <p className="text-slate-500 text-sm">Welcome back, {session?.user?.name}</p>
                    </div>
                    <div className="relative flex items-center gap-3">
                        {/* Notification Bell */}
                        <div className="relative mr-2">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="h-10 w-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                        <p className="text-sm font-bold text-slate-900">Notifications</p>
                                        <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-slate-500 hidden-if-empty">
                                                No notifications yet
                                            </div>
                                        ) : (
                                            notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    className={cn(
                                                        "p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer",
                                                        n.isRead ? "opacity-60" : "bg-blue-50/30"
                                                    )}
                                                    onClick={() => !n.isRead && markAsRead(n.id)}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={cn("mt-1 h-2 w-2 rounded-full flex-shrink-0", n.isRead ? "bg-slate-300" : "bg-blue-600")} />
                                                        <div className="flex-1">
                                                            <p className={cn("text-xs font-bold", n.isRead ? "text-slate-600" : "text-blue-700")}>{n.title}</p>
                                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                                            <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        </div>
                                                        {!n.isRead && (
                                                            <div className="text-blue-600" title="Mark as read">
                                                                <Check className="h-3 w-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold hover:bg-blue-700 transition-colors"
                        >
                            {session?.user?.name?.charAt(0)}
                        </button>

                        {showProfileMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                                <div className="px-4 py-3 border-b border-slate-100">
                                    <p className="text-sm font-bold text-slate-900">{session?.user?.name}</p>
                                    <p className="text-xs text-slate-500">{session?.user?.email}</p>
                                </div>
                                <div className="p-2">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Card */}
                <div className={cn(
                    "relative overflow-hidden rounded-3xl p-8 transition-all duration-500",
                    isTracking ? "bg-blue-600 text-white shadow-blue-200" : "bg-white text-slate-900 shadow-slate-200",
                    "shadow-2xl border border-transparent"
                )}>
                    {/* Decorative circles */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                        <div className={cn(
                            "p-4 rounded-2xl",
                            isTracking ? "bg-white/20" : "bg-blue-50"
                        )}>
                            <MapPin className={cn(
                                "h-8 w-8 animate-bounce",
                                isTracking ? "text-white" : "text-blue-600"
                            )} />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-xl font-bold uppercase tracking-wider">
                                {isTracking ? "Live Tracking Active" : "Tracking Paused"}
                            </h2>
                            <p className={cn(
                                "text-sm",
                                isTracking ? "text-blue-100" : "text-slate-500"
                            )}>
                                {isTracking
                                    ? "Your location is being shared with admins in real-time."
                                    : "Tap the button below to start sharing your live location."}
                            </p>
                        </div>

                        <button
                            onClick={isTracking ? stopTracking : startTracking}
                            className={cn(
                                "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 group",
                                isTracking
                                    ? "bg-white text-blue-600 hover:bg-slate-50"
                                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                            )}
                        >
                            <Power className="h-5 w-5" />
                            {isTracking ? "Stop Sharing" : "Start Live Sharing"}
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="p-2 bg-blue-50 rounded-xl w-fit">
                                <MapPin className="h-5 w-5 text-blue-600" />
                            </div>
                            {location && (
                                <span className="text-[10px] font-mono text-slate-400">
                                    {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider text-[10px]">Current Location</p>
                            <p className="text-lg font-bold text-slate-900 mt-1">
                                {isTracking ? (address || "Fetching address...") : "Tracking Paused"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
                        <div className="p-2 bg-purple-50 rounded-xl w-fit">
                            <Navigation className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Latitude</p>
                            <p className="text-lg font-bold text-slate-900">{location?.lat.toFixed(6) ?? "---"}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
                        <div className="p-2 bg-emerald-50 rounded-xl w-fit">
                            <Cloud className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Longitude</p>
                            <p className="text-lg font-bold text-slate-900">{location?.lng.toFixed(6) ?? "---"}</p>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 divide-y divide-slate-50">
                    <div className="flex items-center justify-between pb-3">
                        <div className="flex items-center gap-3 text-slate-600 text-sm">
                            <History className="h-4 w-4" />
                            <span>Last synced</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                            {lastSync ? lastSync.toLocaleTimeString() : "Never"}
                        </span>
                    </div>
                    <div className="flex items-center justify-between pt-3">
                        <div className="flex items-center gap-3 text-slate-600 text-sm">
                            <Shield className="h-4 w-4" />
                            <span>Privacy status</span>
                        </div>
                        <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold">
                            Protected
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100">
                        {error}
                    </div>
                )}
            </div>

            {/* Emergency Overlay */}
            {emergencyAlert && (
                <div className="fixed inset-0 z-[9999] bg-red-600 animate-pulse flex flex-col items-center justify-center p-8 text-white text-center">
                    <div className="bg-white p-6 rounded-full mb-8 animate-bounce">
                        <TriangleAlert className="h-16 w-16 text-red-600" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black uppercase mb-4 tracking-tighter">{emergencyAlert.title}</h1>
                    <p className="text-xl md:text-2xl font-bold max-w-2xl mb-12">{emergencyAlert.message}</p>

                    <button
                        onClick={() => {
                            setEmergencyAlert(null);
                            if (audioContextRef.current) audioContextRef.current.close();
                            audioContextRef.current = null;
                        }}
                        className="bg-white text-red-600 px-8 py-4 rounded-full font-black text-xl hover:bg-red-50 transition-colors shadow-2xl"
                    >
                        I AM SAFE - DISMISS
                    </button>
                    <p className="fixed bottom-8 text-sm opacity-80 font-medium">Please follow local evacuation guidelines immediately.</p>
                </div>
            )}
        </div>
    );
}
