"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import MapWrapper from "@/components/MapWrapper";
import { Users, Map as MapIcon, RefreshCw, Search, Filter, UserCog, LogOut, Settings, X, Pencil, Bell, Send, TriangleAlert, Siren, CloudLightning, MoreHorizontal, LayoutList, Map as MapIcon2 } from "lucide-react";
import { cn } from "@/lib/utils";
import UserManagement from "@/components/UserManagement";

interface StudentLocation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    timestamp: string;
    className: string;
    isSharing: boolean;
    history?: [number, number][];
    image?: string | null;
    school?: string | null;
}

export default function AdminDashboard() {
    const { data: session, update: updateSession } = useSession();
    const [students, setStudents] = useState<StudentLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
    const [view, setView] = useState<"map" | "list">("map");
    const [mounted, setMounted] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showUserManagement, setShowUserManagement] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: "",
        email: "",
        currentPassword: "",
        newPassword: "",
    });
    const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Broadcast State
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [sendingBroadcast, setSendingBroadcast] = useState(false);
    const [broadcastForm, setBroadcastForm] = useState({ title: "", message: "", type: "normal" });
    const [broadcastStatus, setBroadcastStatus] = useState<{ type: "success" | "error", text: string } | null>(null);
    const [showTyphoonModal, setShowTyphoonModal] = useState(false);
    const [showToolsMenu, setShowToolsMenu] = useState(false);
    const [weatherAutoMode, setWeatherAutoMode] = useState(false);
    const lastWeatherAlertRef = useRef<number>(0);
    const [alerts, setAlerts] = useState<{ id: string, title: string, message: string, type: 'info' | 'success' | 'warning' }[]>([]);
    const prevStudentsRef = useRef<StudentLocation[]>([]);

    const addAlert = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
        const id = Math.random().toString(36).substring(7);
        setAlerts(prev => [...prev, { id, title, message, type }]);
        setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== id));
        }, 5000);
    };

    const fetchLocations = async () => {
        try {
            const res = await fetch("/api/location");
            const data = await res.json();
            if (Array.isArray(data)) {
                // Check for status changes
                if (prevStudentsRef.current.length > 0) {
                    data.forEach(newS => {
                        const oldS = prevStudentsRef.current.find(s => s.id === newS.id);
                        // Alert if student started sharing
                        if (newS.isSharing && (!oldS || !oldS.isSharing)) {
                            addAlert("Live Session Started", `${newS.name} is now sharing their location`, 'success');
                        }
                        // Alert if student stopped sharing
                        else if (!newS.isSharing && oldS && oldS.isSharing) {
                            addAlert("Live Session Ended", `${newS.name} stopped sharing location`, 'warning');
                        }
                    });
                }
                prevStudentsRef.current = data;
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
        const interval = setInterval(fetchLocations, 3000);
        return () => clearInterval(interval);
    }, []);

    // Weather Polling
    useEffect(() => {
        if (!weatherAutoMode) return;

        const checkWeather = async () => {
            try {
                const res = await fetch("/api/weather/alert");
                const alerts = await res.json();

                if (Array.isArray(alerts) && alerts.length > 0) {
                    const typhoonAlert = alerts[0]; // Take the first one
                    const now = Date.now();

                    // Only trigger if we haven't sent one in the last 24 hours to avoid spam
                    // or if it's the very first time detecting it
                    if (now - lastWeatherAlertRef.current > 24 * 60 * 60 * 1000) {
                        setBroadcastForm({
                            title: `AUTOMATED ALERT: ${typhoonAlert.event || "Severe Weather Detected"}`,
                            message: `PAGASA/Weather Update: ${typhoonAlert.description || "Severe weather conditions detected near your area."} Please take necessary precautions.`,
                            type: "typhoon"
                        });
                        setShowTyphoonModal(true);
                        addAlert("Automatic Weather Trigger", "Severe weather detected! Please confirm broadcast.", "warning");
                        lastWeatherAlertRef.current = now;
                    }
                }
            } catch (err) {
                console.error("Weather check failed:", err);
            }
        };

        checkWeather(); // Check immediately on enable
        const interval = setInterval(checkWeather, 10 * 60 * 1000); // Every 10 mins
        return () => clearInterval(interval);
    }, [weatherAutoMode]);

    useEffect(() => {
        if (session?.user) {
            setProfileForm({
                name: session.user.name || "",
                email: session.user.email || "",
                currentPassword: "",
                newPassword: "",
            });
        }
    }, [session]);

    const handleLogout = () => {
        signOut({ callbackUrl: "/auth/signin" });
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMessage(null);
        setSavingProfile(true);

        try {
            const res = await fetch("/api/admin/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profileForm),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update profile");
            }

            setProfileMessage({ type: "success", text: "Profile updated successfully!" });
            await updateSession();
            setTimeout(() => {
                setShowEditProfile(false);
                setProfileMessage(null);
            }, 1500);
        } catch (err: any) {
            setProfileMessage({ type: "error", text: err.message });
        } finally {
            setSavingProfile(false);
        }
    };

    const handleBroadcastSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSendingBroadcast(true);
        setBroadcastStatus(null);

        try {
            // Get all student IDs (or filter based on selection if we had one)
            const allStudentIds = students.map(s => s.id);

            if (allStudentIds.length === 0) {
                throw new Error("No active students to message.");
            }

            const res = await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userIds: allStudentIds,
                    title: broadcastForm.title,
                    message: broadcastForm.message,
                    type: broadcastForm.type
                }),
            });

            if (!res.ok) throw new Error("Failed to send broadcast");

            setBroadcastStatus({ type: "success", text: `Sent to ${allStudentIds.length} students!` });
            setBroadcastStatus({ type: "success", text: `Sent to ${allStudentIds.length} students!` });
            setTimeout(() => {
                setShowBroadcastModal(false);
                setShowTyphoonModal(false);
                setBroadcastForm({ title: "", message: "", type: "normal" });
                setBroadcastStatus(null);
            }, 2000);
        } catch (error: any) {
            setBroadcastStatus({ type: "error", text: error.message });
        } finally {
            setSendingBroadcast(false);
        }
    };

    const markers = students.map((s) => ({
        id: s.id,
        name: s.name,
        position: [s.lat, s.lng] as [number, number],
        lastSeen: mounted ? new Date(s.timestamp).toLocaleTimeString() : "",
        isSharing: s.isSharing,
        history: s.history,
        image: s.image,
        school: s.school,
        className: s.className,
    }));

    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
            {/* Top Navbar */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0 relative z-[1000]">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl">
                        <MapIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="hidden lg:flex p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            <Users className={cn("h-5 w-5 transition-transform", sidebarCollapsed ? "rotate-180" : "")} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 leading-none">Live Student Tracker</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-1">Monitoring {students.length} active students</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Toggle - Compact */}
                    <div className="hidden md:flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setView("map")}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                view === "map" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                            title="Map View"
                        >
                            <MapIcon2 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setView("list")}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                view === "list" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                            title="List View"
                        >
                            <LayoutList className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Typhoon Alert Button - Compact but distinctive */}
                    <button
                        onClick={() => {
                            setBroadcastForm({
                                title: "TYPHOON WARNING SIGNAL",
                                message: "Please seek shelter immediately. Heavy rains and strong winds expected.",
                                type: "typhoon"
                            });
                            setShowTyphoonModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold text-xs transition-all border border-red-200"
                        title="Emergency Typhoon Alert"
                    >
                        <Siren className="h-4 w-4 animate-pulse" />
                        <span className="hidden xl:inline">Emergency Alert</span>
                    </button>

                    {/* Quick Tools Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowToolsMenu(!showToolsMenu)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all"
                        >
                            <Settings className="h-4 w-4" />
                            <span className="hidden md:inline">Tools</span>
                        </button>

                        {showToolsMenu && (
                            <>
                                <div className="fixed inset-0 z-[1001]" onClick={() => setShowToolsMenu(false)} />
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[1002] animate-in fade-in zoom-in-95">
                                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Quick Actions
                                    </div>

                                    <button
                                        onClick={() => {
                                            setShowToolsMenu(false);
                                            setShowBroadcastModal(true);
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <Bell className="h-4 w-4 text-indigo-600" />
                                        Broadcast Message
                                    </button>

                                    <button
                                        onClick={() => {
                                            setShowToolsMenu(false);
                                            setShowUserManagement(true);
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <UserCog className="h-4 w-4 text-purple-600" />
                                        Manage Users
                                    </button>

                                    <div className="my-2 border-t border-slate-100" />

                                    <div className="px-4 py-2">
                                        <button
                                            onClick={() => setWeatherAutoMode(!weatherAutoMode)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all border",
                                                weatherAutoMode
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                                    : "bg-slate-50 text-slate-400 border-slate-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <CloudLightning className="h-3 w-3" />
                                                <span>Auto-Weather</span>
                                            </div>
                                            <div className={cn(
                                                "w-8 h-4 rounded-full relative transition-colors",
                                                weatherAutoMode ? "bg-emerald-500" : "bg-slate-300"
                                            )}>
                                                <div className={cn(
                                                    "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow-sm",
                                                    weatherAutoMode ? "left-4.5" : "left-0.5"
                                                )} />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Profile Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {session?.user?.name?.charAt(0) || "A"}
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-bold text-slate-900">{session?.user?.name || "Admin"}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">{session?.user?.role || "Admin"}</p>
                            </div>
                        </button>

                        {showProfileMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-[1001]"
                                    onClick={() => setShowProfileMenu(false)}
                                />
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-[1002] animate-in fade-in slide-in-from-top-2">
                                    <div className="px-4 py-3 border-b border-slate-100">
                                        <p className="text-sm font-bold text-slate-900">{session?.user?.name}</p>
                                        <p className="text-xs text-slate-500">{session?.user?.email}</p>
                                    </div>
                                    <div className="p-2">
                                        <button
                                            onClick={() => {
                                                setShowProfileMenu(false);
                                                setShowEditProfile(true);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors font-medium"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Edit Profile
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Sidebar for student list (on desktop Map view) */}
                <div className={cn(
                    "bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out relative",
                    view === "list" ? "w-full" : (sidebarCollapsed ? "w-0 overflow-hidden lg:w-0 border-none" : "w-full lg:w-80"),
                    view === "map" && "hidden lg:flex"
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
                                        <div className="flex items-center justify-end gap-1">
                                            <div className={cn("h-1.5 w-1.5 rounded-full", student.isSharing ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                                            <p className={cn(
                                                "text-[10px] uppercase font-bold",
                                                student.isSharing ? "text-emerald-500" : "text-slate-400"
                                            )}>
                                                {student.isSharing ? "Live" : "Offline"}
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-slate-400">{mounted ? new Date(student.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Map Area */}
                <div className={cn(
                    "flex-1 relative transition-all duration-300",
                    view === "list" && "hidden"
                )}>
                    {/* Floating Expand Sidebar Button (only when collapsed) */}
                    {sidebarCollapsed && view === "map" && (
                        <button
                            onClick={() => setSidebarCollapsed(false)}
                            className="absolute left-4 top-4 z-[500] bg-white p-3 rounded-2xl shadow-xl border border-slate-100 text-blue-600 hover:bg-blue-50 transition-all animate-in slide-in-from-left-4"
                            title="Expand Student List"
                        >
                            <Users className="h-5 w-5" />
                        </button>
                    )}

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
            </main>

            {/* User Management Modal */}
            {showUserManagement && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-in zoom-in-95">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-600 p-2 rounded-xl">
                                    <UserCog className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">User Management</h2>
                                    <p className="text-xs text-slate-500">Create, edit, and manage user accounts</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUserManagement(false)}
                                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="overflow-auto max-h-[calc(90vh-80px)]">
                            <UserManagement />
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Profile Modal */}
            {showEditProfile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Edit Profile</h3>
                            <button
                                onClick={() => {
                                    setShowEditProfile(false);
                                    setProfileMessage(null);
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        {profileMessage && (
                            <div className={cn(
                                "p-3 rounded-xl mb-4 text-sm font-medium",
                                profileMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            )}>
                                {profileMessage.text}
                            </div>
                        )}

                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Full Name</label>
                                <input
                                    required
                                    type="text"
                                    value={profileForm.name}
                                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Email Address</label>
                                <input
                                    required
                                    type="email"
                                    value={profileForm.email}
                                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div className="border-t border-slate-100 pt-4 mt-4">
                                <p className="text-sm font-bold text-slate-700 mb-4">Change Password (optional)</p>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600">Current Password</label>
                                        <input
                                            type="password"
                                            value={profileForm.currentPassword}
                                            onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                                            placeholder="Enter current password"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600">New Password</label>
                                        <input
                                            type="password"
                                            value={profileForm.newPassword}
                                            onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                                            placeholder="Min. 6 characters"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditProfile(false);
                                        setProfileMessage(null);
                                    }}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingProfile}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                                >
                                    {savingProfile ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Broadcast Modal */}
            {showBroadcastModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-xl">
                                    <Send className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Broadcast Message</h2>
                                    <p className="text-xs text-slate-500">Send to all {students.length} active students</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowBroadcastModal(false);
                                    setBroadcastForm({ title: "", message: "", type: "normal" });
                                    setBroadcastStatus(null);
                                }}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleBroadcastSubmit} className="p-6 space-y-4">
                            {broadcastStatus && (
                                <div className={cn(
                                    "p-4 rounded-xl text-sm font-medium",
                                    broadcastStatus.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                                )}>
                                    {broadcastStatus.text}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Title</label>
                                <input
                                    required
                                    type="text"
                                    value={broadcastForm.title}
                                    onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                                    placeholder="e.g., Important Announcement"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Message</label>
                                <textarea
                                    required
                                    value={broadcastForm.message}
                                    onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                                    placeholder="Type your message here..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowBroadcastModal(false);
                                        setBroadcastForm({ title: "", message: "", type: "normal" });
                                        setBroadcastStatus(null);
                                    }}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingBroadcast || students.length === 0}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {sendingBroadcast ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" />
                                            Send to All
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Typhoon Modal */}
            {showTyphoonModal && (
                <div className="fixed inset-0 bg-red-900/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-4 border-red-500 animate-in zoom-in-95 duration-300">
                        <div className="p-6 bg-red-50 border-b border-red-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-red-600 rounded-full animate-bounce">
                                    <TriangleAlert className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-red-700 uppercase tracking-wide">Emergency Alert</h2>
                                    <p className="text-xs text-red-600 font-bold">Sending to ALL students with HIGH PRIORITY</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowTyphoonModal(false);
                                    setBroadcastForm({ title: "", message: "", type: "normal" });
                                }}
                                className="p-2 hover:bg-red-100 rounded-xl transition-colors"
                            >
                                <X className="h-5 w-5 text-red-400" />
                            </button>
                        </div>

                        <form onSubmit={handleBroadcastSubmit} className="p-6 space-y-4">
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-4">
                                <p className="text-xs font-medium text-red-800 flex gap-2">
                                    <Siren className="h-4 w-4" />
                                    This will trigger a loud alarm on student devices.
                                </p>
                            </div>

                            {broadcastStatus && (
                                <div className={cn(
                                    "p-4 rounded-xl text-sm font-medium",
                                    broadcastStatus.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                                )}>
                                    {broadcastStatus.text}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Alert Title</label>
                                <input
                                    required
                                    type="text"
                                    value={broadcastForm.title}
                                    onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                                    className="w-full px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 outline-none transition-all font-bold text-red-900 placeholder:text-red-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Message</label>
                                <textarea
                                    required
                                    value={broadcastForm.message}
                                    onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 outline-none transition-all resize-none font-medium text-red-900"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowTyphoonModal(false);
                                        setBroadcastForm({ title: "", message: "", type: "normal" });
                                    }}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingBroadcast}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-200"
                                >
                                    {sendingBroadcast ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Sending Alert...
                                        </>
                                    ) : (
                                        <>
                                            <Siren className="h-4 w-4" />
                                            SEND ALERT
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Alert Notifications */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {alerts.map(alert => (
                    <div
                        key={alert.id}
                        className={cn(
                            "pointer-events-auto flex items-start gap-4 p-4 rounded-2xl border shadow-2xl min-w-[320px] transition-all duration-500",
                            "animate-in slide-in-from-right fade-in zoom-in-95",
                            alert.type === 'success' ? "bg-white border-emerald-100 shadow-emerald-100/50" :
                                alert.type === 'warning' ? "bg-white border-amber-100 shadow-amber-100/50" :
                                    "bg-white border-blue-100"
                        )}
                    >
                        <div className={cn(
                            "p-2 rounded-xl flex-shrink-0",
                            alert.type === 'success' ? "bg-emerald-100 text-emerald-600" :
                                alert.type === 'warning' ? "bg-amber-100 text-amber-600" :
                                    "bg-blue-100 text-blue-600"
                        )}>
                            <Bell className="h-5 w-5 animate-bounce" />
                        </div>
                        <div className="flex-1 pt-0.5">
                            <h4 className="font-bold text-slate-900 text-sm">{alert.title}</h4>
                            <p className="text-xs text-slate-500 mt-1">{alert.message}</p>
                        </div>
                        <button
                            onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
