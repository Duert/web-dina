"use client";

import { useState, useEffect } from "react";
import { fetchJudgesCriteriaConfig, toggleJudgeCriteria, fetchJudgesGlobalConfig, updateJudgesCount, fetchJudgePool, addJudgeToPool, removeJudgeFromPool } from "@/app/actions-judges";
import { Check, X, Loader2, Save, Users, Settings, Trash2 } from "lucide-react";

const CRITERIA_LIST = [
    'Musicalidad',
    'Técnica',
    'Actitud',
    'Innovación',
    'Sincronía',
    'Ejecución de la coreografía',
    'Utilización del espacio',
    'Imagen y vestuario',
    'Variedad de estilos',
    'Impresión Global'
];

export default function JudgesConfigPanel() {
    // State: Map<"judgeId-criteriaName", boolean>
    const [config, setConfig] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState<string | null>(null);

    // Judge Settings
    const [judgesCount, setJudgesCount] = useState(4);
    const [savingCount, setSavingCount] = useState(false);

    // Pool Settings
    const [judgePool, setJudgePool] = useState<string[]>([]);
    const [newName, setNewName] = useState("");
    const [savingNames, setSavingNames] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const [configRes, settingsRes, poolRes] = await Promise.all([
            fetchJudgesCriteriaConfig(),
            fetchJudgesGlobalConfig(),
            fetchJudgePool()
        ]);

        if (configRes.success && configRes.data) {
            const newConfig: Record<string, boolean> = {};
            configRes.data.forEach((row: any) => {
                newConfig[`${row.judge_id}-${row.criteria_name}`] = row.is_active;
            });
            setConfig(newConfig);
        }

        if (settingsRes.success && settingsRes.data) {
            setJudgesCount(settingsRes.data.count);
        }

        if (poolRes.success) {
            setJudgePool(poolRes.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, []);

    const handleAddName = async () => {
        if (!newName.trim()) return;
        setSavingNames(true);
        const res = await addJudgeToPool(newName.trim());
        if (res.success && res.data) {
            setJudgePool(res.data);
            setNewName("");
        } else {
            alert("Error al añadir nombre: " + (res.error || "Desconocido"));
        }
        setSavingNames(false);
    };

    const handleRemoveName = async (name: string) => {
        if (!confirm(`¿Eliminar a "${name}" de la bolsa?`)) return;
        const res = await removeJudgeFromPool(name);
        if (res.success && res.data) {
            setJudgePool(res.data);
        } else {
            alert("Error al eliminar");
        }
    };

    const handleCountChange = async (count: number) => {
        setSavingCount(true);
        setJudgesCount(count); // Optimistic
        const res = await updateJudgesCount(count);
        if (!res.success) {
            alert("Error al actualizar número de jueces");
        }
        setSavingCount(false);
    };



    const handleToggle = async (judgeId: number, criteria: string) => {
        const key = `${judgeId}-${criteria}`;
        const currentVal = config[key] ?? true;
        const newVal = !currentVal;
        setToggling(key);

        // Optimistic update
        setConfig(prev => ({ ...prev, [key]: newVal }));

        const res = await toggleJudgeCriteria(judgeId, criteria, newVal);
        if (!res.success) {
            // Revert
            setConfig(prev => ({ ...prev, [key]: currentVal }));
            alert("Error al guardar");
        }
        setToggling(null);
    };

    if (loading) return <div className="text-center py-12"><Loader2 className="animate-spin mx-auto" /></div>;

    const activeJudges = Array.from({ length: judgesCount }, (_, i) => i + 1);

    return (
        <div className="space-y-8">
            {/* Configuración General */}
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Settings className="text-pink-500" /> Configuración General
                        </h2>
                        <p className="text-gray-400 text-sm">Define cuántos jueces participarán en el evento.</p>
                    </div>

                    <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-white/10">
                        <span className="text-xs font-bold text-gray-400 px-2 uppercase">Número de Jueces:</span>
                        {[1, 2, 3, 4].map(num => (
                            <button
                                key={num}
                                onClick={() => handleCountChange(num)}
                                disabled={savingCount}
                                className={`w-8 h-8 rounded-md font-bold text-sm transition-all ${judgesCount === num
                                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20'
                                    : 'bg-transparent text-gray-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Users size={16} className="text-blue-500" /> Bolsa de Nombres de Jurado
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Añade los nombres de todas las personas que actuarán como jurado.
                            Ellos seleccionarán su nombre al entrar.
                        </p>
                    </div>
                </div>

                <div className="bg-black/30 p-4 rounded-lg border border-white/5 space-y-4">
                    {/* Add New Name */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddName()}
                            placeholder="Nuevo nombre..."
                            className="flex-1 bg-slate-800 border-slate-700 rounded-md p-2 text-white text-sm focus:border-pink-500 focus:outline-none"
                        />
                        <button
                            onClick={handleAddName}
                            disabled={savingNames || !newName.trim()}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {savingNames ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                            Añadir
                        </button>
                    </div>

                    {/* Pool List */}
                    <div className="flex flex-wrap gap-2">
                        {judgePool.length === 0 ? (
                            <span className="text-sm text-gray-500 italic">No hay nombres en la bolsa.</span>
                        ) : (
                            judgePool.map((name) => (
                                <div key={name} className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-white/10 group animate-in zoom-in-95">
                                    <span className="text-sm font-medium text-white">{name}</span>
                                    <button
                                        onClick={() => handleRemoveName(name)}
                                        className="text-gray-500 hover:text-red-400 transition-colors"
                                        title="Eliminar"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Matriz de Criterios */}
            <div>
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-white mb-2">Matriz de Criterios</h2>
                    <p className="text-gray-400 text-sm">Define qué apartados puntúa cada jurado activo.</p>
                </div>

                <div className="overflow-x-auto bg-slate-900 border border-white/10 rounded-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="p-4 text-gray-400 font-bold uppercase text-xs tracking-wider">Criterio / Jurado</th>
                                {activeJudges.map(j => (
                                    <th key={j} className="p-4 text-center text-white font-bold animate-in fade-in">
                                        <div className="flex flex-col">
                                            <span>Juez {j}</span>
                                            {/* Name is now dynamic per login, not fixed */}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {CRITERIA_LIST.map((criteria) => (
                                <tr key={criteria} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-medium text-gray-300">{criteria}</td>
                                    {activeJudges.map(j => {
                                        const key = `${j}-${criteria}`;
                                        const isActive = config[key] ?? false;
                                        const isUpdating = toggling === key;

                                        return (
                                            <td key={j} className="p-4 text-center">
                                                <button
                                                    onClick={() => handleToggle(j, criteria)}
                                                    disabled={isUpdating}
                                                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isActive
                                                        ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                                                        : 'bg-red-500/10 text-red-500/50 hover:bg-red-500/20 hover:text-red-500'
                                                        }`}
                                                >
                                                    {isUpdating ? <Loader2 className="animate-spin w-5 h-5" /> : (
                                                        isActive ? <Check strokeWidth={3} size={20} /> : <X size={20} />
                                                    )}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
