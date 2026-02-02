"use client";

import { signIn, getSession } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Mail, Lock, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";

function SignInForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get("registered") === "true") {
            setSuccessMessage("Account created successfully! Please sign in.");
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError("Invalid email or password");
            setLoading(false);
        } else {
            // Get session to check role
            const session = await getSession();

            if (session?.user?.role === "ADMIN" || session?.user?.role === "TEACHER") {
                router.push("/dashboard/admin");
            } else {
                router.push("/dashboard/student");
            }
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-slate-100 relative overflow-hidden">
            {/* Decorative backdrop */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[5rem] -mr-10 -mt-10"></div>

            <div className="relative z-10">
                <div className="flex flex-col items-center text-center space-y-4 mb-10">
                    <div className="h-16 w-16 bg-blue-600 rounded-3xl flex items-center justify-center rotate-12 shadow-xl shadow-blue-200">
                        <MapPin className="h-8 w-8 text-white -rotate-12" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900">StudentTrack</h1>
                        <p className="text-slate-500 font-medium">Log in to your account</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 font-medium"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 font-medium"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {successMessage && (
                        <div className="bg-emerald-50 text-emerald-600 text-sm font-bold p-4 rounded-xl text-center flex items-center justify-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            {successMessage}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-[0.98] disabled:opacity-70"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                Sign In
                                <ArrowRight className="h-5 w-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-slate-400 text-sm font-medium">
                        Don&apos;t have an account? <Link href="/auth/signup" className="text-blue-600 font-bold hover:underline">Register</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

function SignInLoading() {
    return (
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-slate-100 flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
    );
}

export default function SignIn() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <Suspense fallback={<SignInLoading />}>
                    <SignInForm />
                </Suspense>
            </div>
        </div>
    );
}

