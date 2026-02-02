"use client";

import { useState, useEffect } from "react";
import MapWrapper from "@/components/MapWrapper";
import { Users, Map as MapIcon, RefreshCw, Search, Filter, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import UserManagement from "@/components/UserManagement";

interface StudentLocation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    timestamp: string;
    className: string;
}

export default function AdminDashboard() {
    const [students, setStudents] = useState<StudentLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
    const [view, setView] = useState<"map" | "list" | "users">("map");
    const [mounted, setMounted] = useState(false);

    const fetchLocations = async () => {
        try {
            const res = await fetch("/api/location");
            const data = await res.json();
            if (Array.isArray(data)) {
                setStudents(data);
            }
            setLastRefreshed(new Date());
        } catch (err) {
            console.error("Failed to fetch student locations:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchLocations();
        const interval = setInterval(fetchLocations, 10000); // Poll every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const markers = students.map((s) => ({
        id: s.id,
        name: s.name,
        position: [s.lat, s.lng] as [number, number],
        lastSeen: mounted ? new Date(s.timestamp).toLocaleTimeString() : "",
    }));

    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
            {/* Top Navbar */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl">
                        <MapIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Live Student Tracker</h1>
                        <p className="text-xs text-slate-500 font-medium">Monitoring {students.length} active students</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center px-4 py-2 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 gap-2">
                        <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                        Last update: {mounted ? lastRefreshed.toLocaleTimeString() : "--:--:--"}
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setView("map")}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                view === "map" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Map View
                        </button>
                        <button
                            onClick={() => setView("list")}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                view === "list" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            List View
                        </button>
                        <button
                            onClick={() => setView("users")}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                view === "users" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Users
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Sidebar for student list (on desktop Map view) */}
                <div className={cn(
                    "w-80 bg-white border-r border-slate-200 flex flex-col transition-all duration-300",
                    view === "list" ? "w-full" : "hidden lg:flex"
                )}>
                    <div className="p-4 border-b border-slate-100 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search students..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <button className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100">
                            <Filter className="h-5 w-5 text-slate-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {students.length === 0 && !loading && (
                            <div className="text-center py-20 text-slate-400">
                                <Users className="h-10 w-10 mx-auto mb-4 opacity-20" />
                                <p className="text-sm font-medium">No students active</p>
                            </div>
                        )}
                        {students.map((student) => (
                            <div
                                key={student.id}
                                className="p-4 rounded-2xl hover:bg-blue-50/50 cursor-pointer border border-transparent hover:border-blue-100 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600">
                                        {student.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">{student.name}</p>
                                        <p className="text-xs text-slate-500 font-medium">Class: {student.className}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold text-emerald-500">Live</p>
                                        <p className="text-[10px] text-slate-400">{mounted ? new Date(student.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Map Area */}
                <div className={cn(
                    "flex-1 relative",
                    view === "list" && "hidden"
                )}>
                    {students.length > 0 ? (
                        <MapWrapper
                            center={[students[0].lat, students[0].lng]}
                            markers={markers}
                        />
                    ) : (
                        <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                            <div className="text-center">
                                <div className="h-12 w-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                                    <MapIcon className="h-6 w-6 text-slate-300" />
                                </div>
                                <p className="text-slate-400 font-medium">Waiting for location data...</p>
                            </div>
                        </div>
                    )}

                    {/* Floating Mobile Controls */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 lg:hidden flex bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-white/20 gap-2 z-[1000]">
                        <button onClick={() => setView("list")} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm">
                            Show List
                        </button>
                    </div>
                </div>
                {/* Users Management View */}
                {view === "users" && <UserManagement />}
            </main>
        </div>
    );
}
