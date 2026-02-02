import Link from "next/link";
import { ArrowRight, MapPin, Shield, Smartphone, Users } from "lucide-react";

export default function Home() {
    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-2 rounded-xl">
                        <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tight text-slate-900">StudentTrack</span>
                </div>
                <div className="space-x-8 hidden md:block">
                    <Link href="#features" className="text-sm font-bold text-slate-500 hover:text-blue-600">Features</Link>
                    <Link href="#security" className="text-sm font-bold text-slate-500 hover:text-blue-600">Security</Link>
                </div>
                <Link
                    href="/auth/signin"
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95"
                >
                    Portal Login
                </Link>
            </nav>

            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-bold animate-fade-in">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Live Monitoring Active
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
                        Safety and <span className="text-blue-600">Precision</span> for Students.
                    </h1>
                    <p className="text-xl text-slate-500 font-medium max-w-xl mx-auto lg:mx-0">
                        Real-time GPS tracking designed for educational institutions. Keep students safe and admins informed with our high-precision location system.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                        <Link
                            href="/auth/signin"
                            className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-100"
                        >
                            Launch Application <ArrowRight className="h-5 w-5" />
                        </Link>
                        <Link
                            href="/dashboard/admin"
                            className="bg-white text-slate-900 border-2 border-slate-100 px-8 py-4 rounded-2xl text-lg font-bold hover:bg-slate-50 transition-all flex items-center justify-center"
                        >
                            Admin Demo
                        </Link>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute -inset-4 bg-blue-600/5 rounded-[3rem] blur-2xl"></div>
                    <div className="relative bg-slate-900 rounded-[3rem] p-4 shadow-2xl overflow-hidden aspect-[4/3] flex items-center justify-center text-white">
                        {/* Abstract Map UI */}
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                        <div className="relative z-10 flex flex-col items-center gap-6">
                            <div className="h-20 w-20 bg-blue-600 rounded-3xl flex items-center justify-center animate-bounce shadow-2xl shadow-blue-500">
                                <MapPin className="h-10 w-10" />
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold">Live Tracking Demo</p>
                                <p className="text-blue-400 font-medium">Precision: 5 meters</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="bg-slate-50 py-32">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20 space-y-4">
                        <h2 className="text-4xl font-black text-slate-900">Why StudentTrack?</h2>
                        <p className="text-slate-500 font-medium max-w-2xl mx-auto">Built with modern technologies to ensure reliability and speed.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Smartphone className="h-8 w-8 text-blue-600" />}
                            title="Mobile First"
                            description="Progressive web app designed to work seamlessly on any smartphone browser."
                        />
                        <FeatureCard
                            icon={<Users className="h-8 w-8 text-emerald-600" />}
                            title="Role Access"
                            description="Granular permissions for Students, Teachers, and Administrators."
                        />
                        <FeatureCard
                            icon={<Shield className="h-8 w-8 text-purple-600" />}
                            title="End-to-End Privacy"
                            description="Location data is encrypted and only accessible to authorized personnel."
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-500 group border border-slate-100">
            <div className="mb-6 p-4 bg-slate-50 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">{title}</h3>
            <p className="text-slate-500 leading-relaxed font-medium">{description}</p>
        </div>
    );
}