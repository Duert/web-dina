"use client";

import { useState, useEffect } from "react";
import { fetchAllScores, fetchJudgesGlobalConfig, resetAllScoresAction } from "@/app/actions-judges";
import { Loader2, Trophy, RefreshCw, FileDown, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminLiveResults() {
    const [scores, setScores] = useState<any[]>([]);
    const [judgesCount, setJudgesCount] = useState(4);
    const [loading, setLoading] = useState(true);
    const [isResetting, setIsResetting] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const load = async () => {
        setLoading(true);
        // Load settings first (or parallel, but settings rarely change so ok)
        const [scoresRes, settingsRes] = await Promise.all([
            fetchAllScores(),
            fetchJudgesGlobalConfig()
        ]);

        if (settingsRes.success && settingsRes.data) {
            setJudgesCount(settingsRes.data.count);
        }

        if (scoresRes.success) {
            setScores(scoresRes.data || []);
            setLastUpdated(new Date());
        }
        setLoading(false);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, []);

    const activeJudges = Array.from({ length: judgesCount }, (_, i) => i + 1);

    // Process data to group by Registration and extract Judge Names
    const processData = () => {
        const grouped: Record<string, {
            registration_id: string,
            group_name: string,
            school_name: string,
            block: string,
            category: string,
            total: number,
            judges: Record<number, number>
        }> = {};

        const namesMap: Record<number, Set<string>> = {};

        scores.forEach((score) => {
            const regId = score.registration_id;
            if (!grouped[regId]) {
                grouped[regId] = {
                    registration_id: regId,
                    group_name: score.registrations?.group_name || 'Desconocido',
                    school_name: score.registrations?.school_name || 'Desconocido',
                    block: score.block,
                    category: score.category,
                    total: 0,
                    judges: {}
                };
            }
            grouped[regId].total += score.score;
            grouped[regId].judges[score.judge_id] = (grouped[regId].judges[score.judge_id] || 0) + score.score;

            // Track names
            if (score.judge_name) {
                if (!namesMap[score.judge_id]) namesMap[score.judge_id] = new Set();
                namesMap[score.judge_id].add(score.judge_name);
            }
        });

        // Convert Map to simplified object for display
        const resolvedNames: Record<number, string> = {};
        activeJudges.forEach(id => {
            const set = namesMap[id];
            if (set && set.size === 1) {
                resolvedNames[id] = Array.from(set)[0];
            } else if (set && set.size > 1) {
                resolvedNames[id] = "Varios"; // Mixed names
            } else {
                resolvedNames[id] = "";
            }
        });

        // Convert to array and sort by Total Descending
        return {
            rows: Object.values(grouped).sort((a, b) => b.total - a.total),
            judgeNames: resolvedNames
        };
    };



    const { rows, judgeNames } = processData();

    const exportPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Clasificación - Dance IN Action 2026", 14, 20);
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 28);

        // Dynamic headers based on judges count
        // Format: "J1\n(Pepito)" if name exists
        const judgeHeaders = activeJudges.map(j => {
            const name = judgeNames[j];
            return name ? `J${j}\n(${name})` : `J${j}`;
        });

        const headers = ['#', 'Grupo', 'Escuela', 'Categoría', 'Bloque', ...judgeHeaders, 'TOTAL'];

        const tableBody = rows.map((row, idx) => [
            idx + 1,
            row.group_name,
            row.school_name,
            row.category,
            row.block,
            ...activeJudges.map(j => row.judges[j] || '-'),
            row.total
        ]);

        // Dynamic column styles to center judge columns
        const columnStyles: any = {
            0: { cellWidth: 10 },
        };
        // Judges columns start at index 5
        activeJudges.forEach((_, i) => {
            columnStyles[5 + i] = { cellWidth: 15, halign: 'center' };
        });
        // Total column is after judges
        columnStyles[5 + activeJudges.length] = { fontStyle: 'bold', halign: 'center' };

        autoTable(doc, {
            startY: 35,
            head: [headers],
            body: tableBody,
            headStyles: {
                fillColor: [219, 39, 119],
                valign: 'middle',
                halign: 'center'
            },
            styles: { fontSize: 8 },
            columnStyles: columnStyles
        });

        doc.save("clasificacion_dina_2026.pdf");
    };

    const handleReset = async () => {
        if (!confirm("⚠️ ¡ADVERTENCIA CRÍTICA! ⚠️\n\n¿Estás seguro de que deseas BORRAR TODAS LAS PUNTUACIONES de todos los jueces? Esta acción NO se puede deshacer y pondrá el marcador a cero.")) {
            return;
        }

        const doubleCheck = prompt("Escribe 'BORRAR' para confirmar la eliminación de todas las puntuaciones:");
        if (doubleCheck !== 'BORRAR') {
            return;
        }

        setIsResetting(true);
        const res = await resetAllScoresAction();
        if (res.success) {
            await load(); // Refresh the table
            alert("✅ Todas las puntuaciones han sido reseteadas a cero.");
        } else {
            alert("❌ Error al borrar las puntuaciones: " + res.error);
        }
        setIsResetting(false);
    };

    if (loading) return <div className="text-center py-20"><Loader2 className="animate-spin mx-auto w-8 h-8 text-blue-500" /></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Clasificación en Tiempo Real</h2>
                    <p className="text-gray-400 text-sm">Actualizado: {lastUpdated.toLocaleTimeString()}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportPDF}
                        disabled={rows.length === 0}
                        className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileDown size={18} /> Exportar PDF
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={isResetting || rows.length === 0}
                        className="flex items-center gap-2 bg-red-900/30 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-500 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Borrar todas las puntuaciones"
                    >
                        {isResetting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        Resetear
                    </button>
                    <button
                        onClick={load}
                        className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto bg-slate-900 border border-white/10 rounded-xl">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-gray-400 font-bold uppercase text-xs">
                            <th className="p-4">#</th>
                            <th className="p-4">Grupo / Escuela</th>
                            <th className="p-4">Categoría</th>
                            {activeJudges.map(j => (
                                <th key={j} className="p-4 text-center">
                                    <div>Juez {j}</div>
                                    <div className="text-[10px] text-pink-500 font-normal normal-case">
                                        {judgeNames[j]}
                                    </div>
                                </th>
                            ))}
                            <th className="p-4 text-center text-white text-base">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row, idx) => (
                            <tr key={row.registration_id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 text-gray-500 font-mono">{idx + 1}</td>
                                <td className="p-4">
                                    <div className="font-bold text-white text-base">{row.group_name}</div>
                                    <div className="text-gray-500 text-xs">{row.school_name}</div>
                                </td>
                                <td className="p-4 text-gray-400">
                                    <div className="font-medium">{row.category}</div>
                                    <div className="text-[10px] uppercase opacity-50">{row.block}</div>
                                </td>
                                {activeJudges.map(j => (
                                    <td key={j} className="p-4 text-center text-gray-300 font-mono">
                                        {row.judges[j] > 0 ? row.judges[j] : '-'}
                                    </td>
                                ))}
                                <td className="p-4 text-center">
                                    <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full font-black text-lg border border-blue-500/20">
                                        {row.total}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={activeJudges.length + 4} className="p-8 text-center text-gray-500">
                                    No hay puntuaciones registradas todavía.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
