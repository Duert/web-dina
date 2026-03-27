"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Trash2, Plus, Save, Loader2, Tag, Percent, Calendar as CalendarIcon, Hash } from "lucide-react";

type Coupon = {
    id: string;
    code: string;
    discount_type: 'fixed' | 'percentage';
    discount_value: number;
    max_uses: number | null;
    current_uses: number;
    is_active: boolean;
    expires_at: string | null;
    created_at: string;
};

export default function AdminCouponManager() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentCoupon, setCurrentCoupon] = useState<Partial<Coupon>>({});

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error("Error fetching coupons:", error);
        else setCoupons(data || []);
        setIsLoading(false);
    };

    const handleSave = async () => {
        if (!currentCoupon.code || !currentCoupon.discount_value) {
            alert("Código y Valor son obligatorios");
            return;
        }

        setIsSaving(true);
        try {
            const couponData = {
                code: currentCoupon.code.toUpperCase(),
                discount_type: currentCoupon.discount_type || 'fixed',
                discount_value: currentCoupon.discount_value,
                max_uses: currentCoupon.max_uses || null,
                is_active: currentCoupon.is_active ?? true,
                expires_at: currentCoupon.expires_at || null
            };

            if (currentCoupon.id) {
                const { error } = await supabase.from('coupons').update(couponData).eq('id', currentCoupon.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('coupons').insert([couponData]);
                if (error) throw error;
            }

            setIsEditing(false);
            setCurrentCoupon({});
            fetchCoupons();
        } catch (error: any) {
            console.error(error);
            alert("Error guardando cupón: " + (error.message || "Código duplicado o formato inválido"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que quieres borrar este cupón?")) return;
        try {
            const { error } = await supabase.from('coupons').delete().eq('id', id);
            if (error) throw error;
            fetchCoupons();
        } catch (error: any) {
            alert("Error borrando: " + error.message);
        }
    };

    const toggleStatus = async (coupon: Coupon) => {
        const { error } = await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
        if (error) alert(error.message);
        else fetchCoupons();
    };

    return (
        <div className="space-y-6 text-slate-900">
            <div className="flex justify-between items-center text-white">
                <div>
                    <h2 className="text-xl font-bold">Gestión de Cupones</h2>
                    <p className="text-sm text-gray-400">Crea códigos de descuento para las entradas.</p>
                </div>
                <button
                    onClick={() => {
                        setCurrentCoupon({ discount_type: 'fixed', is_active: true });
                        setIsEditing(true);
                    }}
                    className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-pink-600 transition-colors shadow-lg"
                >
                    <Plus size={18} /> Nuevo Cupón
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8 text-gray-500">Cargando...</div>
            ) : coupons.length === 0 ? (
                <div className="text-center p-12 border-2 border-dashed rounded-xl bg-white/5 border-white/10 text-gray-500">
                    No hay cupones creados todavía.
                </div>
            ) : (
                <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Código</th>
                                <th className="px-6 py-3">Descuento</th>
                                <th className="px-6 py-3">Uso / Límite</th>
                                <th className="px-6 py-3">Estado</th>
                                <th className="px-6 py-3">Expira</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {coupons.map((coupon) => (
                                <tr key={coupon.id} className={coupon.is_active ? "" : "opacity-60 bg-black/20"}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Tag size={14} className="text-pink-400" />
                                            <span className="font-mono font-bold text-white text-base">{coupon.code}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 font-bold text-white text-base">
                                            {coupon.discount_type === 'percentage' ? <Percent size={14} /> : '€'}
                                            <span>{coupon.discount_value}</span>
                                            <span className="text-[10px] font-normal text-gray-400 uppercase ml-1">
                                                {coupon.discount_type === 'percentage' ? 'De descuento' : 'Fijo'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Hash size={14} className="text-gray-500" />
                                            <span>{coupon.current_uses}</span>
                                            <span className="text-gray-600">/</span>
                                            <span className={coupon.max_uses ? "text-gray-300" : "text-gray-600 italic"}>
                                                {coupon.max_uses || "∞"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleStatus(coupon)}
                                            className={`text-[10px] font-bold px-2 py-1 rounded-full transition-colors ${coupon.is_active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
                                        >
                                            {coupon.is_active ? 'ACTIVO' : 'PAUSADO'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                                        {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : "Nunca"}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => { setCurrentCoupon(coupon); setIsEditing(true); }}
                                                className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
                                                title="Editar"
                                            >
                                                <Save size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(coupon.id)}
                                                className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-all"
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center text-slate-800">
                            <h3 className="font-bold">{currentCoupon.id ? 'Editar Cupón' : 'Nuevo Cupón'}</h3>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 transition-colors text-xl">✕</button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">Código (Mayúsculas)</label>
                                <input
                                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-[var(--primary)] outline-none text-slate-900 bg-slate-50 font-mono font-black placeholder:font-normal placeholder:text-slate-300"
                                    value={currentCoupon.code || ''}
                                    onChange={e => setCurrentCoupon({ ...currentCoupon, code: e.target.value.toUpperCase() })}
                                    placeholder="EJ: DANCE26"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">Tipo</label>
                                    <select
                                        className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-[var(--primary)] outline-none bg-slate-50 text-slate-900 font-bold"
                                        value={currentCoupon.discount_type || 'fixed'}
                                        onChange={e => setCurrentCoupon({ ...currentCoupon, discount_type: e.target.value as any })}
                                    >
                                        <option value="fixed">Euros (€)</option>
                                        <option value="percentage">Porcentaje (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">Valor</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-[var(--primary)] outline-none text-slate-900 bg-slate-50 font-black"
                                        value={currentCoupon.discount_value || ''}
                                        onChange={e => setCurrentCoupon({ ...currentCoupon, discount_value: parseFloat(e.target.value) })}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">Máx. Usos</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-[var(--primary)] outline-none text-slate-900 bg-slate-50"
                                        value={currentCoupon.max_uses || ''}
                                        onChange={e => setCurrentCoupon({ ...currentCoupon, max_uses: parseInt(e.target.value) || null })}
                                        placeholder="Ilimitado"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">F. Expiración</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-[var(--primary)] outline-none text-slate-900 bg-slate-50 text-sm"
                                        value={currentCoupon.expires_at ? currentCoupon.expires_at.split('T')[0] : ''}
                                        onChange={e => setCurrentCoupon({ ...currentCoupon, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-3 rounded-xl border-2 border-slate-100 hover:border-slate-200 transition-all">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)] transition-all"
                                    checked={currentCoupon.is_active ?? true}
                                    onChange={e => setCurrentCoupon({ ...currentCoupon, is_active: e.target.checked })}
                                />
                                <span className="text-sm font-bold text-slate-700">Código activo para el público</span>
                            </label>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
                            <button onClick={() => setIsEditing(false)} className="px-5 py-2 text-slate-500 hover:text-slate-800 font-bold transition-colors">Cancelar</button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-[var(--primary)] text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-pink-600 disabled:opacity-50 shadow-lg shadow-pink-500/20 active:scale-95 transition-all"
                            >
                                {isSaving && <Loader2 size={18} className="animate-spin" />}
                                {currentCoupon.id ? 'Guardar Cambios' : 'Crear Cupón'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
