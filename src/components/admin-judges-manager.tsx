"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Trash2, Upload, Plus, Save, Loader2 } from "lucide-react";

// Types
type Judge = {
    id: string;
    name: string;
    role: string;
    bio: string;
    image_url: string;
    display_order: number;
};

export default function AdminJudgesManager() {
    const [judges, setJudges] = useState<Judge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [currentJudge, setCurrentJudge] = useState<Partial<Judge>>({});
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Client-side Supabase for Storage & Data
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchJudges();
    }, []);

    const fetchJudges = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('judges')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) console.error("Error fetching judges:", error);
        else setJudges(data || []);
        setIsLoading(false);
    };

    const handleSave = async () => {
        if (!currentJudge.name || !currentJudge.role) {
            alert("Nombre y Rol son obligatorios");
            return;
        }

        setIsSaving(true);
        try {
            let imageUrl = currentJudge.image_url;

            // 1. Upload Image if new file selected
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('judges')
                    .upload(fileName, imageFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('judges')
                    .getPublicUrl(fileName);

                imageUrl = publicUrl;
            }

            // 2. Insert or Update
            const judgeData = {
                name: currentJudge.name,
                role: currentJudge.role,
                bio: currentJudge.bio || '',
                image_url: imageUrl,
                display_order: currentJudge.display_order || judges.length + 1
            };

            if (currentJudge.id) {
                // Update
                const { error } = await supabase
                    .from('judges')
                    .update(judgeData)
                    .eq('id', currentJudge.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('judges')
                    .insert([judgeData]);
                if (error) throw error;
            }

            // Reset
            setIsEditing(false);
            setCurrentJudge({});
            setImageFile(null);
            fetchJudges();

        } catch (error: any) {
            console.error(error);
            alert("Error guardando jurado: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que quieres borrar este jurado?")) return;

        try {
            const { error } = await supabase.from('judges').delete().eq('id', id);
            if (error) throw error;
            fetchJudges();
        } catch (error: any) {
            alert("Error borrando: " + error.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Gestión del Jurado</h2>
                    <p className="text-sm text-slate-500">Muestra u oculta a los jueces en la página principal.</p>
                </div>
                <button
                    onClick={() => { setCurrentJudge({}); setImageFile(null); setIsEditing(true); }}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                    <Plus size={18} /> Nuevo Jurado
                </button>
            </div>

            {/* LIST */}
            {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : judges.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed rounded-xl bg-slate-50">
                    <p className="text-slate-500 mb-2">No hay jueces publicados.</p>
                    <p className="text-xs text-slate-400">En la web aparecerá el cartel "PRÓXIMAMENTE".</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {judges.map(judge => (
                        <div key={judge.id} className="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col group">
                            <div className="relative h-48 bg-slate-100">
                                {judge.image_url ? (
                                    <img src={judge.image_url} alt={judge.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">Sin Foto</div>
                                )}
                            </div>
                            <div className="p-4 flex-1">
                                <h3 className="font-bold text-slate-900">{judge.name}</h3>
                                <p className="text-sm text-blue-600 font-medium mb-2">{judge.role}</p>
                                <p className="text-xs text-slate-500 line-clamp-3">{judge.bio}</p>
                            </div>
                            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                                <button
                                    onClick={() => { setCurrentJudge(judge); setImageFile(null); setIsEditing(true); }}
                                    className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1 rounded hover:bg-white border border-transparent hover:border-slate-200"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(judge.id)}
                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* EDIT/CREATE MODAL */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">
                                {currentJudge.id ? 'Editar Jurado' : 'Nuevo Jurado'}
                            </h3>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Image Upload */}
                            <div className="flex justify-center mb-6">
                                <label className="cursor-pointer group relative w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors">
                                    {(imageFile || currentJudge.image_url) ? (
                                        <img
                                            src={imageFile ? URL.createObjectURL(imageFile) : currentJudge.image_url}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                            <Upload size={24} className="mb-1" />
                                            <span className="text-[10px] uppercase font-bold">Subir Foto</span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => e.target.files?.[0] && setImageFile(e.target.files[0])}
                                    />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">
                                        CAMBIAR
                                    </div>
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre</label>
                                <input
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={currentJudge.name || ''}
                                    onChange={e => setCurrentJudge({ ...currentJudge, name: e.target.value })}
                                    placeholder="Ej. Lola Índigo"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rol / Título</label>
                                <input
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={currentJudge.role || ''}
                                    onChange={e => setCurrentJudge({ ...currentJudge, role: e.target.value })}
                                    placeholder="Ej. Coreógrafa & Bailarina"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Biografía (Opcional)</label>
                                <textarea
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 text-sm"
                                    value={currentJudge.bio || ''}
                                    onChange={e => setCurrentJudge({ ...currentJudge, bio: e.target.value })}
                                    placeholder="Breve descripción de su trayectoria..."
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-white rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSaving && <Loader2 size={16} className="animate-spin" />}
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
