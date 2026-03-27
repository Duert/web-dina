"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Trash2, Plus, Save, Loader2, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";

type FAQ = {
    id: string;
    question: string;
    answer: string;
    display_order: number;
    visible: boolean;
};

export default function AdminFAQManager() {
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentFAQ, setCurrentFAQ] = useState<Partial<FAQ>>({});

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchFAQs();
    }, []);

    const fetchFAQs = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('faqs')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) console.error("Error fetching FAQs:", error);
        else setFaqs(data || []);
        setIsLoading(false);
    };

    const handleSave = async () => {
        if (!currentFAQ.question || !currentFAQ.answer) {
            alert("Pregunta y Respuesta son obligatorias");
            return;
        }

        setIsSaving(true);
        try {
            const faqData = {
                question: currentFAQ.question,
                answer: currentFAQ.answer,
                display_order: currentFAQ.display_order ?? faqs.length,
                visible: currentFAQ.visible ?? true
            };

            if (currentFAQ.id) {
                const { error } = await supabase.from('faqs').update(faqData).eq('id', currentFAQ.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('faqs').insert([faqData]);
                if (error) throw error;
            }

            setIsEditing(false);
            setCurrentFAQ({});
            fetchFAQs();
        } catch (error: any) {
            alert("Error guardando FAQ: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que quieres borrar esta pregunta?")) return;
        try {
            const { error } = await supabase.from('faqs').delete().eq('id', id);
            if (error) throw error;
            fetchFAQs();
        } catch (error: any) {
            alert("Error borrando: " + error.message);
        }
    };

    const toggleVisibility = async (faq: FAQ) => {
        const { error } = await supabase.from('faqs').update({ visible: !faq.visible }).eq('id', faq.id);
        if (error) alert(error.message);
        else fetchFAQs();
    };

    const moveOrder = async (faq: FAQ, direction: 'up' | 'down') => {
        const index = faqs.findIndex(f => f.id === faq.id);
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === faqs.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const targetFaq = faqs[targetIndex];

        // Swap orders
        const { error: err1 } = await supabase.from('faqs').update({ display_order: targetFaq.display_order }).eq('id', faq.id);
        const { error: err2 } = await supabase.from('faqs').update({ display_order: faq.display_order }).eq('id', targetFaq.id);

        if (err1 || err2) alert("Error reordenando");
        else fetchFAQs();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Gestión de FAQ</h2>
                    <p className="text-sm text-slate-500">Preguntas frecuentes para la web pública.</p>
                </div>
                <button
                    onClick={() => { setCurrentFAQ({ visible: true }); setIsEditing(true); }}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                    <Plus size={18} /> Nueva Pregunta
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8 text-slate-400">Cargando...</div>
            ) : faqs.length === 0 ? (
                <div className="text-center p-12 border-2 border-dashed rounded-xl bg-slate-50 text-slate-400">
                    No hay preguntas guardadas.
                </div>
            ) : (
                <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="px-6 py-3 w-16">Orden</th>
                                <th className="px-6 py-3">Pregunta / Respuesta</th>
                                <th className="px-6 py-3 w-32">Visibilidad</th>
                                <th className="px-6 py-3 w-32 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {faqs.map((faq, idx) => (
                                <tr key={faq.id} className={faq.visible ? "" : "bg-slate-50/50"}>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-center gap-1">
                                            <button onClick={() => moveOrder(faq, 'up')} disabled={idx === 0} className="text-slate-400 hover:text-slate-900 disabled:opacity-30"><ChevronUp size={16} /></button>
                                            <span className="font-mono font-bold text-slate-600">{faq.display_order}</span>
                                            <button onClick={() => moveOrder(faq, 'down')} disabled={idx === faqs.length - 1} className="text-slate-400 hover:text-slate-900 disabled:opacity-30"><ChevronDown size={16} /></button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 max-w-lg">
                                        <p className="font-bold text-slate-900 mb-1">{faq.question}</p>
                                        <p className="text-slate-500 line-clamp-2">{faq.answer}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleVisibility(faq)}
                                            className={`flex items-center gap-2 text-[10px] font-bold px-2 py-1 rounded-full transition-colors ${faq.visible ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}
                                        >
                                            {faq.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                                            {faq.visible ? 'VISIBLE' : 'OCULTO'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => { setCurrentFAQ(faq); setIsEditing(true); }}
                                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                                                title="Editar"
                                            >
                                                <Save size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(faq.id)}
                                                className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                                                title="Borrar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">{currentFAQ.id ? 'Editar Pregunta' : 'Nueva Pregunta'}</h3>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Pregunta</label>
                                <input
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
                                    value={currentFAQ.question || ''}
                                    onChange={e => setCurrentFAQ({ ...currentFAQ, question: e.target.value })}
                                    placeholder="Ej. ¿A qué hora abren las puertas?"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Respuesta</label>
                                <textarea
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-32 text-slate-900 bg-white"
                                    value={currentFAQ.answer || ''}
                                    onChange={e => setCurrentFAQ({ ...currentFAQ, answer: e.target.value })}
                                    placeholder="Explica los detalles aquí..."
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        checked={currentFAQ.visible ?? true}
                                        onChange={e => setCurrentFAQ({ ...currentFAQ, visible: e.target.checked })}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Públicamente visible</span>
                                </label>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium">Cancelar</button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50"
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
