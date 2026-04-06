'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { sessions } from '@/lib/data';
import { fetchGroupsForPhotocall } from '@/app/actions-photocall';
import { Camera, Loader2, Download, X, ImageIcon, Search } from 'lucide-react';
import Link from 'next/link';

export default function PhotocallPage() {
    const [selectedBlock, setSelectedBlock] = useState(sessions[0]?.id || 'block1');
    const [selectedCategory, setSelectedCategory] = useState(() => {
        const firstBlock = sessions[0];
        return firstBlock?.categoryRows?.flat()[0] || '';
    });
    
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [selectedPhotoMatch, setSelectedPhotoMatch] = useState<{ url: string, groupName: string, schoolName: string } | null>(null);

    const activeCategories = useMemo(() => {
        return sessions.find(s => s.id === selectedBlock)?.categoryRows?.flat() || [];
    }, [selectedBlock]);

    const loadGroups = useCallback(async () => {
        setLoading(true);
        setError(null);
        setResults([]);

        try {
            const res = await fetchGroupsForPhotocall(selectedBlock, selectedCategory);

            if (res.success) {
                setResults(res.data || []);
            } else {
                setError(res.error || "Error cargando grupos");
            }
        } catch (err) {
            console.error("Error connecting when fetching photocall images:", err);
            setError("Error de conexión al servidor");
        } finally {
            setLoading(false);
        }
    }, [selectedBlock, selectedCategory]);

    useEffect(() => {
        if (activeCategories.length > 0) {
            if (!selectedCategory || !activeCategories.includes(selectedCategory)) {
                setSelectedCategory(activeCategories[0]);
                return;
            }
        }

        if (selectedBlock && selectedCategory && activeCategories.includes(selectedCategory)) {
            loadGroups();
        }
    }, [selectedBlock, selectedCategory, activeCategories, loadGroups]);

    // Force download logic
    const handleDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Failed downloading image:", err);
            // Fallback: open in new tab
            window.open(url, '_blank');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans">
            <header className="bg-slate-900 border-b border-white/10 p-4 sticky top-0 z-40 backdrop-blur-md bg-opacity-80">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            DINA 2026
                        </Link>
                        <span className="text-slate-500">|</span>
                        <h1 className="font-bold text-slate-200">Fotos del Photocall</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
                {/* Filters */}
                <section className="space-y-4 bg-slate-900 p-6 rounded-2xl border border-white/5 shadow-xl relative z-10">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Bloque de Actuación</label>
                        <div className="flex flex-wrap gap-2">
                            {sessions.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => {
                                        setSelectedBlock(s.id);
                                        setResults([]);
                                        setLoading(true);
                                    }}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedBlock === s.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedBlock && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Categoría</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full md:w-auto min-w-[300px] p-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {activeCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </section>

                {/* Results */}
                <section className="min-h-[400px]">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                        <h2 className="text-2xl font-black flex items-center gap-3">
                            <Camera className="text-cyan-400" />
                            Listado: <span className="text-blue-400">{selectedCategory}</span>
                        </h2>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <Loader2 size={48} className="animate-spin mb-4 text-cyan-500" />
                            <p>Cargando grupos...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 bg-red-900/20 border border-red-500/20 rounded-2xl text-red-400 text-center">
                            {error}
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-700">
                            <Search size={48} className="mb-4 text-slate-600 mx-auto" />
                            <h3 className="text-xl font-bold text-slate-400">Sin grupos confirmados</h3>
                            <p className="text-slate-500 mt-2 max-w-md text-center mx-auto">
                                No hay ningún grupo verificado en esta categoría actualmente.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            {results.map((item, idx) => (
                                <div
                                    key={item.id}
                                    onClick={() => item.image_url && setSelectedPhotoMatch({ url: item.image_url, groupName: item.group_name, schoolName: item.school_name })}
                                    className={`relative p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between transition-all ${
                                        item.image_url 
                                            ? 'bg-slate-800/80 border-cyan-500/30 cursor-pointer hover:shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-400 hover:scale-[1.01] active:scale-[0.99] group' 
                                            : 'bg-slate-900/50 border-slate-800/50 opacity-80'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 shrink-0 bg-slate-950 rounded-full flex items-center justify-center font-black text-slate-500 border border-white/5">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h3 className={`text-lg md:text-xl font-bold truncate pr-4 transition-colors ${item.image_url ? 'text-white group-hover:text-cyan-300' : 'text-slate-400'}`}>
                                                {item.group_name}
                                            </h3>
                                            <p className="text-slate-500 text-sm mt-1">{item.school_name}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 md:mt-0 ml-14 md:ml-0 shrink-0">
                                        {item.image_url ? (
                                            <div className="flex items-center gap-3 text-cyan-400 font-bold bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors">
                                                <ImageIcon size={18} />
                                                <span>Ver Foto</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs uppercase font-bold text-slate-600 tracking-wider">Pendiente de subir</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* Photo Modal */}
            {selectedPhotoMatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200">
                    <button 
                        onClick={() => setSelectedPhotoMatch(null)}
                        className="absolute top-4 right-4 md:top-8 md:right-8 text-white/50 hover:text-white bg-white/5 hover:bg-white/20 p-3 rounded-full transition-all"
                    >
                        <X size={24} />
                    </button>
                    
                    <div className="max-w-6xl w-full flex flex-col h-full max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 shrink-0 gap-4">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">{selectedPhotoMatch.groupName}</h2>
                                <p className="text-cyan-400 font-medium">{selectedPhotoMatch.schoolName}</p>
                            </div>
                            <button
                                onClick={() => handleDownload(selectedPhotoMatch.url, `DINA_2026_${selectedPhotoMatch.groupName}`)}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-3 transition-colors shrink-0"
                            >
                                <Download size={20} />
                                <span>Descargar Foto Original</span>
                            </button>
                        </div>
                        
                        {/* Photo Viewer */}
                        <div className="flex-1 min-h-0 bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center relative shadow-2xl">
                            <img 
                                src={selectedPhotoMatch.url} 
                                alt={`Photocall ${selectedPhotoMatch.groupName}`} 
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
