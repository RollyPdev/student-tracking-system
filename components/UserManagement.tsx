"use client";

import { useState, useEffect } from "react";
import { UserPlus, Mail, Shield, BookOpen, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    studentClass?: string | null;
    createdAt: string;
}

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "STUDENT",
        studentClass: "",
    });
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/users");
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setLoading(true);

        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create user");
            }

            setMessage({ type: "success", text: "User created successfully!" });
            setFormData({
                name: "",
                email: "",
                password: "",
                role: "STUDENT",
                studentClass: "",
            });
            setIsAddingUser(false);
            fetchUsers();
        } catch (err: any) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 overflow-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
                    <p className="text-slate-500">Manage all registered users and their permissions.</p>
                </div>
                <button
                    onClick={() => setIsAddingUser(!isAddingUser)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-200"
                >
                    <UserPlus className="h-4 w-4" />
                    {isAddingUser ? "Close Form" : "Add New User"}
                </button>
            </div>

            {message && (
                <div className={cn(
                    "p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
                    message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                )}>
                    {message.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    <p className="font-medium text-sm">{message.text}</p>
                </div>
            )}

            {isAddingUser && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 animate-in zoom-in-95 duration-200">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Full Name</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Email Address</label>
                            <input
                                required
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                                placeholder="john@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Password</label>
                            <input
                                required
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                                placeholder="Min. 6 characters"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Role</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium"
                            >
                                <option value="STUDENT">Student</option>
                                <option value="TEACHER">Teacher</option>
                                <option value="ADMIN">Administrator</option>
                            </select>
                        </div>
                        {formData.role === "STUDENT" && (
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-slate-700">Class / Section</label>
                                <select
                                    required
                                    value={formData.studentClass}
                                    onChange={(e) => setFormData({ ...formData, studentClass: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-medium"
                                >
                                    <option value="">Select a class</option>
                                    <option value="Board Exam Takers for Criminologist">Board Exam Takers for Criminologist</option>
                                    <option value="Student">Student</option>
                                </select>
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                            >
                                {loading ? "Creating User..." : "Create User"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs uppercase font-bold text-slate-500">User</th>
                            <th className="px-6 py-4 text-xs uppercase font-bold text-slate-500">Role</th>
                            <th className="px-6 py-4 text-xs uppercase font-bold text-slate-500">Class</th>
                            <th className="px-6 py-4 text-xs uppercase font-bold text-slate-500">Joined Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{user.name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase",
                                        user.role === "ADMIN" ? "bg-purple-50 text-purple-600 border border-purple-100" :
                                            user.role === "TEACHER" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                                "bg-blue-50 text-blue-600 border border-blue-100"
                                    )}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm text-slate-600">{user.studentClass || "—"}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm text-slate-500 font-medium">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && !loading && (
                    <div className="py-20 text-center">
                        <Users className="h-12 w-12 mx-auto mb-4 text-slate-200" />
                        <p className="text-slate-400 font-medium">No users found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function Users({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}
