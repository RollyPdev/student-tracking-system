"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { MapPin, Power, Cloud, Navigation, History, Shield, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudentDashboard() {
    const { data: session } = useSession();
    const [isTracking, setIsTracking] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const watchId = useRef<number | null>(null);

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

        watchId.current = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                setLocation({ lat: latitude, lng: longitude, accuracy });
                setLastSync(new Date());

                // Send to server
                try {
                    await fetch("/api/location", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            lat: latitude,
                            lng: longitude,
                            accuracy,
                        }),
                    });
                } catch (err) {
                    console.error("Failed to sync location:", err);
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

    const stopTracking = () => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
        setIsTracking(false);
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
                    <div className="relative">
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
        </div>
    );
}
