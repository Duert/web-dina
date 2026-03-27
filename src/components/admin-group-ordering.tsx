"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchGroupsForVoting, updateGroupOrder, fetchJudgesGlobalConfig, toggleOrderPublishedAction, updateEscaletaImageAction } from "@/app/actions-judges";
import { Loader2, ArrowUp, ArrowDown, Save, Search, Eye, EyeOff, Upload, Trash2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { sessions } from "@/lib/data";

export default function AdminGroupOrdering() {
    const [block, setBlock] = useState('block1');

    // Compute categories for the selected block
    const blockCategories = useMemo(() => {
        const session = sessions.find(s => s.id === block);
        if (!session || !session.categoryRows) return [];
        const cats = session.categoryRows.flat();
        console.log('AdminGroupOrdering: selected block:', block);
        console.log('AdminGroupOrdering: computed categories:', cats);
        return cats;
    }, [block]);

    const [category, setCategory] = useState('');
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [isPublished, setIsPublished] = useState(false);
    const [togglingPublish, setTogglingPublish] = useState(false);
    const [escaletasImages, setEscaletasImages] = useState<Record<string, string>>({});
    const [isUploadingEscaleta, setIsUploadingEscaleta] = useState(false);

    // Client-side Supabase for Storage and DB
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
            }
        }
    );

    // Update category when block changes (default to first one)
    useEffect(() => {
        setTimeout(() => {
            if (blockCategories.length > 0) {
                setCategory(blockCategories[0]);
            } else {
                setCategory('');
            }
        }, 0);
    }, [blockCategories]);

    // Load global settings once on mount
    useEffect(() => {
        const loadSettings = async () => {
            const configRes = await fetchJudgesGlobalConfig();
            if (configRes.success && configRes.data) {
                setIsPublished(configRes.data.is_order_published);
            }
            // Fetch escaletas definitively
            const res = await import('@/app/actions-judges').then(m => m.fetchAllEscaletas());
            if (res.success && res.data) {
                setEscaletasImages(res.data);
            }
        };
        loadSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only fetch once

    const loadGroups = async () => {
        setLoading(true);
        const groupsRes = await fetchGroupsForVoting(block, category);
        
        if (groupsRes.success) {
            setGroups(groupsRes.data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (category) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadGroups();
        } else {
            setGroups([]);
        }
    }, [block, category]);

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === groups.length - 1) return;

        const newGroups = [...groups];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap
        const temp = newGroups[index];
        newGroups[index] = newGroups[newIndex];
        newGroups[newIndex] = temp;

        // Update local state immediately for UI response
        // Re-assign order_index based on new position
        newGroups.forEach((g, idx) => g.order_index = idx + 1);
        setGroups(newGroups);

        setSaving('reordering');
        try {
            await Promise.all(newGroups.map((g, idx) =>
                updateGroupOrder(g.id, idx + 1)
            ));
        } catch (e) {
            console.error(e);
            alert("Error al guardar el orden");
            loadGroups(); // Revert on error
        }
        setSaving(null);
    };

    const handleManualOrderChange = async (group: any, newOrder: string) => {
        const val = parseInt(newOrder);
        if (isNaN(val)) return;

        setSaving(group.id);
        await updateGroupOrder(group.id, val);
        setSaving(null);
        loadGroups(); // Reload to sort
    };

    const handleTogglePublish = async () => {
        setTogglingPublish(true);
        const newState = !isPublished;
        const res = await toggleOrderPublishedAction(newState);
        if (res.success) {
            setIsPublished(newState);
        } else {
            alert("Error al cambiar el estado de publicación");
        }
        setTogglingPublish(false);
    };

    const handleUploadEscaleta = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !category) return;
        const file = e.target.files[0];
        setIsUploadingEscaleta(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `escaleta_${category.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('judges')
                .upload(`escaletas/${fileName}`, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('judges')
                .getPublicUrl(`escaletas/${fileName}`);

            const res = await updateEscaletaImageAction(category, publicUrl);
            if (res.success) {
                setEscaletasImages(prev => ({ ...prev, [category]: publicUrl }));
            } else {
                alert("Error al guardar la URL de la imagen.");
            }
        } catch (error: any) {
            console.error("Upload error:", error);
            alert("Error al subir la imagen: " + error.message);
        } finally {
            setIsUploadingEscaleta(false);
        }
    };

    const handleDeleteEscaletaImage = async () => {
        if (!category || !confirm("¿Borrar la imagen de escaleta para esta categoría?")) return;
        setIsUploadingEscaleta(true);
        try {
            const res = await updateEscaletaImageAction(category, null);
            if (res.success) {
                setEscaletasImages(prev => {
                    const newMap = { ...prev };
                    delete newMap[category];
                    return newMap;
                });
            }
        } catch (error: any) {
            alert("Error al borrar: " + error.message);
        } finally {
            setIsUploadingEscaleta(false);
        }
    };

    return (
        <div>
            <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-end bg-neutral-900/50 p-4 rounded-xl border border-white/5">
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Orden de Actuación (v2)</h2>
                    <p className="text-gray-400 text-sm">Define el orden en el que aparecerán los grupos para el jurado.</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <button
                        onClick={handleTogglePublish}
                        disabled={togglingPublish}
                        className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-all ${
                            isPublished 
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50' 
                                : 'bg-white/10 text-gray-400 hover:bg-white/20 border border-white/20'
                        }`}
                    >
                        {togglingPublish ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : isPublished ? (
                            <Eye size={16} />
                        ) : (
                            <EyeOff size={16} />
                        )}
                        {isPublished ? 'Orden Publicado' : 'Oculto a Escuelas'}
                    </button>
                </div>

                <div className="flex gap-2">
                    <select
                        value={block}
                        onChange={(e) => setBlock(e.target.value)}
                        className="bg-black border border-zinc-700 text-white rounded-lg p-2 text-sm"
                    >
                        {sessions.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="bg-black border border-zinc-700 text-white rounded-lg p-2 text-sm max-w-[200px]"
                        disabled={blockCategories.length === 0}
                    >
                        {blockCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* ESCALETA IMAGE UPLOAD */}
            {category && (
                <div className="mb-6 bg-slate-800/50 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                    <div>
                        <h3 className="font-bold text-white text-sm">Imagen de Escaleta ({category})</h3>
                        <p className="text-xs text-gray-400">Sube el diseño para mostrarlo públicamente cuando actives "Orden Publicado".</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {escaletasImages[category] && (
                            <a href={escaletasImages[category]} target="_blank" className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1 font-bold">
                                <Eye size={14} /> Ver Imagen (GUARDADA)
                            </a>
                        )}

                        {isUploadingEscaleta ? (
                            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                <Loader2 size={14} className="animate-spin" /> Subiendo...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-emerald-500/50 flex items-center gap-2 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                    <Upload size={14} />
                                    {escaletasImages[category] ? 'Cambiar Imagen (NUEVO)' : 'Subir Imagen (NUEVO)'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadEscaleta} />
                                </label>
                                {escaletasImages[category] && (
                                    <button 
                                        onClick={handleDeleteEscaletaImage}
                                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1.5 rounded-lg border border-red-500/20 transition-colors"
                                        title="Borrar imagen"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-pink-500" /></div>
            ) : (
                <div className="space-y-2">
                    {groups.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-xl text-gray-400 border border-white/10 border-dashed">
                            No hay grupos verificados en esta categoría.
                        </div>
                    ) : (
                        groups.map((group, idx) => (
                            <div key={group.id} className="bg-slate-800 border border-white/10 p-3 rounded-lg flex items-center gap-4 transition-all hover:border-white/20">
                                <div className="flex flex-col items-center gap-1">
                                    <button
                                        onClick={() => handleMove(idx, 'up')}
                                        disabled={idx === 0 || saving !== null}
                                        className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                    <span className="font-mono font-bold text-lg w-8 text-center">{idx + 1}</span>
                                    <button
                                        onClick={() => handleMove(idx, 'down')}
                                        disabled={idx === groups.length - 1 || saving !== null}
                                        className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                                    >
                                        <ArrowDown size={16} />
                                    </button>
                                </div>

                                <div className="flex-1">
                                    <h3 className="font-bold text-white">{group.group_name}</h3>
                                    <p className="text-sm text-gray-400">{group.school_name}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 uppercase font-bold mr-2">Manual:</span>
                                    <input
                                        type="number"
                                        defaultValue={group.order_index}
                                        onBlur={(e) => handleManualOrderChange(group, e.target.value)}
                                        className="w-16 bg-black border border-zinc-700 rounded px-2 py-1 text-center font-mono text-sm focus:border-pink-500 outline-none"
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {saving === 'reordering' && (
                <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2">
                    <Loader2 className="animate-spin" size={16} /> Guardando orden...
                </div>
            )}
        </div>
    );
}
