"use client";

import { useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import JudgesConfigPanel from "@/components/admin-judges-config";
import AdminLiveResults from "@/components/admin-live-results";
import AdminGroupOrdering from "@/components/admin-group-ordering";
import AdminRankingsManager from "@/components/admin-rankings-manager";

export default function AdminScoresPage() {
    const [activeTab, setActiveTab] = useState<'config' | 'results' | 'ordering' | 'rankings'>('results');

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                            <ArrowLeft />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                Panel de Puntuaciones
                            </h1>
                            <p className="text-gray-400 text-sm">Gestión de Jurados y Clasificaciones</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-white/10 pb-4 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'config' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Configuración Jurados
                    </button>
                    <button
                        onClick={() => setActiveTab('results')}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'results' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Monitor en Vivo
                    </button>
                    <button
                        onClick={() => setActiveTab('ordering')}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'ordering' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Orden de Actuación
                    </button>
                    <button
                        onClick={() => setActiveTab('rankings')}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'rankings' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Clasificaciones
                    </button>
                </div>

                {/* Content Area */}
                <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 min-h-[500px]">
                    {activeTab === 'config' && (
                        <JudgesConfigPanel />
                    )}
                    {activeTab === 'results' && (
                        <AdminLiveResults />
                    )}
                    {activeTab === 'ordering' && (
                        <AdminGroupOrdering />
                    )}
                    {activeTab === 'rankings' && (
                        <AdminRankingsManager />
                    )}
                </div>
            </div>
        </div>
    );
}
