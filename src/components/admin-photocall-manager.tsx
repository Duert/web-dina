"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Eye, EyeOff, Upload, Trash2, Loader2, Image as ImageIcon, Camera } from "lucide-react";
import { fetchGroupsForPhotocall, uploadPhotocallImageAction, deletePhotocallImageAction, fetchPhotocallPublished, togglePhotocallPublishedAction } from "@/app/actions-photocall";
import { sessions } from "@/lib/data";

interface PhotocallGroup {
    id: string;
    group_name: string;
    school_name: string;
    category: string;
    order_index: number;
    is_confirmed: boolean;
    image_url: string | null;
}

export default function AdminPhotocallManager() {
    const [selectedBlock, setSelectedBlock] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [groups, setGroups] = useState<PhotocallGroup[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [isPublished, setIsPublished] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    // Client-side Supabase for Storage
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Find current block data
    const activeBlock = sessions.find(s => s.id === selectedBlock);
    
    // Flatten categories for the selected block
    const categories = activeBlock ? activeBlock.categoryRows.flat() : [];

    useEffect(() => {
        if (selectedBlock && selectedCategory) {
            loadGroups();
        } else {
            setGroups([]);
        }
    }, [selectedBlock, selectedCategory]);

    useEffect(() => {
        const loadSettings = async () => {
            const res = await fetchPhotocallPublished();
            if (res.success) {
                setIsPublished(res.data);
            }
        };
        loadSettings();
    }, []);

    const togglePublish = async () => {
        setIsPublishing(true);
        const newState = !isPublished;
        const res = await togglePhotocallPublishedAction(newState);
        if (res.success) {
            setIsPublished(newState);
        } else {
            alert("Error: " + res.error);
        }
        setIsPublishing(false);
    };

    const loadGroups = async () => {
        setIsLoading(true);
        const res = await fetchGroupsForPhotocall(selectedBlock, selectedCategory);
        if (res.success && res.data) {
            setGroups(res.data);
        } else {
            console.error(res.error);
        }
        setIsLoading(false);
    };

    const handleFileUpload = async (registrationId: string, file: File) => {
        setUploadingId(registrationId);
        try {
            // 1. Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${registrationId}-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('photocall')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('photocall')
                .getPublicUrl(fileName);

            // 2. Save URL to database
            const res = await uploadPhotocallImageAction(registrationId, publicUrl);
            
            if (res.success) {
                // Optimistic update
                setGroups(groups.map(g => g.id === registrationId ? { ...g, image_url: publicUrl } : g));
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            alert("Error al subir imagen: " + error.message);
        } finally {
            setUploadingId(null);
        }
    };

    const handleDeleteImage = async (registrationId: string) => {
        if (!confirm("¿Seguro que quieres borrar esta foto?")) return;

        setUploadingId(registrationId);
        try {
            const res = await deletePhotocallImageAction(registrationId);
            if (res.success) {
                setGroups(groups.map(g => g.id === registrationId ? { ...g, image_url: null } : g));
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            alert("Error al borrar imagen: " + error.message);
        } finally {
            setUploadingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-blue-900/20 p-6 rounded-2xl border border-blue-500/20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                        <Camera className="text-blue-400 w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Fotos del Photocall</h2>
                        <p className="text-sm text-slate-400">Sube 1 foto por actuación para que las escuelas puedan descargarla.</p>
                    </div>
                </div>
                <button
                    onClick={togglePublish}
                    disabled={isPublishing}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all border ${
                        isPublished 
                        ? 'bg-blue-600 border-blue-500 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-white'
                    }`}
                >
                    {isPublishing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isPublished ? (
                        <>
                            <Eye className="w-5 h-5" />
                            <span>Público Web: Activado</span>
                        </>
                    ) : (
                        <>
                            <EyeOff className="w-5 h-5" />
                            <span>Público Web: Oculto</span>
                        </>
                    )}
                </button>
            </div>

            {/* Selectors */}
            <div className="flex gap-4">
                <select
                    value={selectedBlock}
                    onChange={(e) => {
                        setSelectedBlock(e.target.value);
                        setSelectedCategory('');
                    }}
                    className="flex-1 bg-black border border-white/20 p-3 rounded-xl focus:border-blue-500 outline-none text-white"
                >
                    <option value="">-- Elige Bloque --</option>
                    {sessions.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>

                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    disabled={!selectedBlock}
                    className="flex-1 bg-black border border-white/20 p-3 rounded-xl focus:border-blue-500 outline-none disabled:opacity-50 text-white"
                >
                    <option value="">-- Elige Categoría --</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>
            ) : selectedBlock && selectedCategory ? (
                <div className="space-y-3">
                    {groups.length === 0 ? (
                        <div className="text-center p-8 bg-white/5 border border-white/10 rounded-xl text-slate-400">
                            No hay grupos confirmados en esta categoría.
                        </div>
                    ) : (
                        groups.map((group, index) => (
                            <div key={group.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4 hover:border-blue-500/30 transition-colors">
                                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center font-black text-xl text-slate-500 shrink-0 border border-white/10">
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white text-lg truncate leading-tight">{group.group_name}</h4>
                                    <p className="text-sm text-slate-400 truncate">{group.school_name}</p>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {group.image_url ? (
                                        <>
                                            <a href={group.image_url} target="_blank" className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/20 group/img block">
                                                <img src={group.image_url} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                                    <ImageIcon className="w-5 h-5 text-white" />
                                                </div>
                                            </a>
                                            <button
                                                className="bg-red-500/20 text-red-400 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-colors"
                                                onClick={() => handleDeleteImage(group.id)}
                                                disabled={uploadingId === group.id}
                                                title="Borrar Foto"
                                            >
                                                {uploadingId === group.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                            </button>
                                        </>
                                    ) : (
                                        <label className={`cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors ${uploadingId === group.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {uploadingId === group.id ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Upload className="w-5 h-5" />
                                            )}
                                            <span>Subir Foto</span>
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleFileUpload(group.id, file);
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="text-center p-12 bg-white/5 border border-white/10 rounded-xl text-slate-400">
                    Selecciona un bloque y una categoría para empezar.
                </div>
            )}
        </div>
    );
}
