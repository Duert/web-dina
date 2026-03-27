"use client";

import { useState, useEffect } from "react";
import { fetchAllScores, fetchJudgesGlobalConfig, resetAllScoresAction, resetScoresByCategoryAction, updateRegistrationPenalty, fetchCategoryStatus, toggleCategoryStatusAction, updateAdminScore } from "@/app/actions-judges";
import { Loader2, Trophy, RefreshCw, FileDown, Trash2, Lock, Unlock, Edit3, Check } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function PenaltyInput({ registrationId, initialPenalty, onUpdate }: { registrationId: string, initialPenalty: number, onUpdate: () => void }) {
    const [val, setVal] = useState(initialPenalty.toString());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setVal(initialPenalty.toString());
    }, [initialPenalty]);

    const handleBlur = async () => {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0) {
            setVal(initialPenalty.toString());
            return;
        }
        if (num === initialPenalty) return;

        setIsSaving(true);
        const res = await updateRegistrationPenalty(registrationId, num);
        setIsSaving(false);
        if (res.success) {
            onUpdate();
        } else {
            alert("Error al actualizar la penalización: " + res.error);
            setVal(initialPenalty.toString());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    return (
        <div className="flex items-center justify-center gap-1">
            <span className="text-red-400 font-bold">-</span>
            <input
                type="number"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                className={`w-16 bg-red-950/30 border ${initialPenalty > 0 ? 'border-red-500' : 'border-red-500/30'} text-red-200 text-center rounded px-1 py-1 focus:outline-none focus:border-red-500 disabled:opacity-50`}
                step="0.5"
                min="0"
            />
        </div>
    );
}

export default function AdminLiveResults() {
    const [scores, setScores] = useState<any[]>([]);
    const [judgesCount, setJudgesCount] = useState(4);
    const [loading, setLoading] = useState(true);
    const [isResetting, setIsResetting] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [selectedBlock, setSelectedBlock] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isCategoryClosed, setIsCategoryClosed] = useState(false);
    const [editingScoresGroup, setEditingScoresGroup] = useState<any | null>(null);

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
            penalty: number,
            total: number,
            finalTotal: number,
            impresionGlobal: number,
            judges: Record<number, number>,
            detailedJudges: Record<number, Record<string, number>>
        }> = {};

        const namesMap: Record<number, Set<string>> = {};

        scores.forEach((score) => {
            const regId = score.registration_id;
            grouped[regId] = {
                registration_id: regId,
                group_name: (score.registrations?.group_name || 'Desconocido').toUpperCase(),
                school_name: score.registrations?.school_name || 'Desconocido',
                block: score.block,
                category: score.category,
                penalty: score.registrations?.penalty || 0,
                total: 0,
                finalTotal: 0,
                impresionGlobal: 0,
                judges: {},
                detailedJudges: {}
            };
            grouped[regId].total += score.score;
            grouped[regId].judges[score.judge_id] = (grouped[regId].judges[score.judge_id] || 0) + score.score;

            if (score.criteria_name === 'Impresión Global') {
                grouped[regId].impresionGlobal += score.score;
            }

            if (!grouped[regId].detailedJudges[score.judge_id]) {
                grouped[regId].detailedJudges[score.judge_id] = {};
            }
            grouped[regId].detailedJudges[score.judge_id][score.criteria_name] = score.score;

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

        const allCriteriaConfigRow = Array.from(new Set(scores.map(s => s.criteria_name).filter(Boolean))).sort() as string[];

        // Convert to array and sort by Final Total Descending, then by Impresion Global Descending
        return {
            rows: Object.values(grouped).map(g => {
                g.finalTotal = g.total - (g.penalty || 0);
                return g;
            }).sort((a, b) => {
                if (b.finalTotal !== a.finalTotal) return b.finalTotal - a.finalTotal;
                return b.impresionGlobal - a.impresionGlobal; // Desempate
            }),
            judgeNames: resolvedNames,
            allCriteria: allCriteriaConfigRow
        };
    };



    const { rows: unfilteredRows, judgeNames, allCriteria } = processData();

    const uniqueBlocks = Array.from(new Set(unfilteredRows.map((r: any) => r.block).filter(Boolean))).sort() as string[];
    
    let rows = unfilteredRows;
    if (selectedBlock !== 'all') {
        rows = rows.filter((r: any) => r.block === selectedBlock);
    }
    
    const uniqueCategories = Array.from(new Set(rows.map((r: any) => r.category).filter(Boolean))).sort() as string[];
    
    if (selectedCategory !== 'all') {
        rows = rows.filter((r: any) => r.category === selectedCategory);
    }

    const formatBlockName = (name: string) => {
        if (!name) return '';
        return name.replace(/Block/gi, 'Bloque ');
    };

    useEffect(() => {
        if (selectedCategory !== 'all') {
            fetchCategoryStatus(selectedCategory).then(res => {
                if (res.success) setIsCategoryClosed(res.is_closed);
            });
        } else {
            setIsCategoryClosed(false);
        }
    }, [selectedCategory]);

    const handleToggleCategory = async () => {
        if (selectedCategory === 'all') return;
        const newStatus = !isCategoryClosed;
        const res = await toggleCategoryStatusAction(selectedCategory, newStatus);
        if (res.success) {
            setIsCategoryClosed(newStatus);
        } else {
            alert("Error al cambiar estado: " + res.error);
        }
    };

    const getBase64Image = async (url: string) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            return new Promise<{base: string, w: number, h: number}>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const img = new Image();
                    img.onload = () => resolve({ base: reader.result as string, w: img.width, h: img.height });
                    img.src = reader.result as string;
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Error loading logo", e);
            return null;
        }
    };

    const exportPDF = async () => {
        const doc = new jsPDF();
        const logoData = await getBase64Image('/logo-inscripciones.png');

        doc.setFontSize(18);
        doc.text("Clasificación - Dance IN Action 2026", 14, 20);
        doc.setFontSize(10);
        
        const formattedBlock = formatBlockName(selectedBlock);
        const subtitle = selectedCategory !== 'all' && selectedBlock !== 'all' ? `${formattedBlock} / Categoría: ${selectedCategory}` : (selectedCategory !== 'all' ? `Categoría: ${selectedCategory}` : (selectedBlock !== 'all' ? `${formattedBlock}` : 'Todas las categorías'));
        doc.text(subtitle, 14, 28);
        
        if (logoData) {
            const targetHeight = 16;
            const targetWidth = (logoData.w / logoData.h) * targetHeight;
            doc.addImage(logoData.base, 'PNG', doc.internal.pageSize.getWidth() - 14 - targetWidth, 8, targetWidth, targetHeight);
        }

        const judgeHeaders = activeJudges.map(j => {
            const name = judgeNames[j];
            return name ? `J${j}\n(${name})` : `J${j}`;
        });

        const headers = ['Posición', 'Grupo', ...judgeHeaders, 'Subtotal', 'Penalización', 'TOTAL'];

        const tableBody = rows.map((row, idx) => [
            idx + 1,
            row.group_name,
            ...activeJudges.map(j => row.judges[j] > 0 ? row.judges[j] : '-'),
            row.total,
            row.penalty > 0 ? `-${row.penalty}` : '0',
            row.finalTotal
        ]);

        autoTable(doc, {
            startY: 35,
            head: [headers],
            body: tableBody,
            headStyles: {
                fillColor: [236, 72, 153],
                valign: 'middle',
                halign: 'center'
            },
            styles: { fontSize: 8, halign: 'center', valign: 'middle' }
        });

        doc.save("clasificacion_dina_2026.pdf");
    };

    const exportPDFDetailed = async () => {
        const doc = new jsPDF('landscape');
        const logoData = await getBase64Image('/logo-inscripciones.png');

        doc.setFontSize(18);
        doc.text("Puntuaciones Detalladas por Juez - Dance IN Action 2026", 14, 20);
        doc.setFontSize(10);

        const formattedBlock = formatBlockName(selectedBlock);
        const subtitle = selectedCategory !== 'all' && selectedBlock !== 'all' ? `${formattedBlock} / Categoría: ${selectedCategory}` : (selectedCategory !== 'all' ? `Categoría: ${selectedCategory}` : (selectedBlock !== 'all' ? `${formattedBlock}` : 'Todas las categorías'));
        doc.text(subtitle, 14, 28);
        
        if (logoData) {
            const targetHeight = 16;
            const targetWidth = (logoData.w / logoData.h) * targetHeight;
            doc.addImage(logoData.base, 'PNG', doc.internal.pageSize.getWidth() - 14 - targetWidth, 8, targetWidth, targetHeight);
        }

        const formatHeader = (text: string) => {
            if (text === 'Ejecución de la coreografía') {
                return 'Ejecución\nde la\ncoreografía';
            }
            if (text === 'Utilización del espacio') {
                return 'Utilización\ndel\nespacio';
            }
            if (text === 'Imagen y vestuario') {
                return 'Imagen y\nvestuario';
            }
            if (text === 'Variedad de estilos') {
                return 'Variedad\nde\nestilos';
            }
            
            if (text.length > 10) {
                const words = text.split(' ');
                const lines = [];
                let currentLine = '';
                for (const w of words) {
                    if ((currentLine + w).length > 12) {
                        if (currentLine) lines.push(currentLine.trim());
                        currentLine = w + ' ';
                    } else {
                        currentLine += w + ' ';
                    }
                }
                if (currentLine) lines.push(currentLine.trim());
                return lines.join('\n');
            }
            return text;
        };

        const formattedCriteria = allCriteria.map(formatHeader);
        const headers = ['Pos', 'Grupo', 'Juez', ...formattedCriteria, 'Total\nJuez', 'Sub\ntotal', 'Pen.', 'TOTAL\nFINAL'];
        const tableBody: any[][] = [];

        rows.forEach((row, rowIdx) => {
            const pos = rowIdx + 1;
            const judges = activeJudges;
            
            judges.forEach((j, jIdx) => {
                const judgeName = judgeNames[j] ? `J${j}\n(${judgeNames[j]})` : `J${j}`;
                
                const judgeDetails = row.detailedJudges[j] || {};
                const criteriaScores = allCriteria.map(c => judgeDetails[c] !== undefined ? judgeDetails[c] : '-');
                const judgeTotal = row.judges[j] > 0 ? row.judges[j] : '-';
                
                if (jIdx === 0) {
                    tableBody.push([
                        { content: pos, rowSpan: judges.length, styles: { halign: 'center', valign: 'middle' } },
                        { content: row.group_name, rowSpan: judges.length, styles: { halign: 'center', valign: 'middle', cellWidth: 40 } },
                        judgeName,
                        ...criteriaScores,
                        { content: judgeTotal, styles: { halign: 'center', fontStyle: 'bold' } },
                        { content: row.total, rowSpan: judges.length, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
                        { content: row.penalty > 0 ? `-${row.penalty}` : '0', rowSpan: judges.length, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', textColor: [220, 38, 38] } },
                        { content: row.finalTotal, rowSpan: judges.length, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: [236, 72, 153], textColor: 255, fontSize: 13 } }
                    ]);
                } else {
                    tableBody.push([
                        judgeName,
                        ...criteriaScores,
                        { content: judgeTotal, styles: { halign: 'center', fontStyle: 'bold' } }
                    ]);
                }
            });
        });

        autoTable(doc, {
            startY: 35,
            head: [headers],
            body: tableBody,
            headStyles: {
                fillColor: [60, 60, 60],
                valign: 'middle',
                halign: 'center',
                fontSize: 6,
                minCellHeight: 12
            },
            styles: { fontSize: 7, cellPadding: 1, halign: 'center', valign: 'middle', overflow: 'linebreak' },
            columnStyles: {
                1: { cellWidth: 35 } // Group name max width constraints
            },
            theme: 'grid'
        });

        doc.save("puntuaciones_detalladas.pdf");
    };

    const handleReset = async () => {
        const isCategorySpecific = selectedBlock !== 'all' && selectedCategory !== 'all';
        
        const message = isCategorySpecific 
            ? `⚠️ ¿Estás seguro de que deseas BORRAR TODAS LAS PUNTUACIONES de la categoría "${selectedCategory}" (Bloque: ${selectedBlock})?\n\nEsta acción no se puede deshacer.`
            : `⚠️ ¡ADVERTENCIA CRÍTICA! ⚠️\n\n¿Estás seguro de que deseas BORRAR TODAS LAS PUNTUACIONES de todos los bloques y categorías?\n\nEsta acción no se puede deshacer y pondrá todo el evento a cero.`;

        if (!confirm(message)) {
            return;
        }

        const doubleCheckStr = isCategorySpecific ? 'BORRAR CATEGORIA' : 'BORRAR TODO';
        const doubleCheck = prompt(`Escribe '${doubleCheckStr}' para confirmar la eliminación:`);
        
        if (doubleCheck !== doubleCheckStr) {
            return;
        }

        setIsResetting(true);
        let res;
        if (isCategorySpecific) {
            res = await resetScoresByCategoryAction(selectedBlock, selectedCategory);
        } else {
            res = await resetAllScoresAction();
        }

        if (res.success) {
            await load(); // Refresh the table
            alert(isCategorySpecific ? `✅ Categoría borrada con éxito.` : "✅ Todas las puntuaciones han sido reseteadas a cero.");
        } else {
            alert("❌ Error al borrar las puntuaciones: " + res.error);
        }
        setIsResetting(false);
    };

    if (loading) return <div className="text-center py-20"><Loader2 className="animate-spin mx-auto w-8 h-8 text-blue-500" /></div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Clasificación en Tiempo Real</h2>
                    <p className="text-gray-400 text-sm">Actualizado: {lastUpdated.toLocaleTimeString()}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={exportPDFDetailed}
                        disabled={rows.length === 0}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Exportar desglose por apartados para cada juez"
                    >
                        <FileDown size={18} /> Exportar PDF Detallado
                    </button>
                    <button
                        onClick={exportPDF}
                        disabled={rows.length === 0}
                        className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileDown size={18} /> Exportar PDF
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={isResetting || unfilteredRows.length === 0}
                        className="flex items-center gap-2 bg-red-900/30 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-500 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title={selectedBlock !== 'all' && selectedCategory !== 'all' ? `Borrar puntuaciones de ${selectedCategory}` : "Borrar todas las puntuaciones"}
                    >
                        {isResetting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        {selectedBlock !== 'all' && selectedCategory !== 'all' ? 'Resetear Categoría' : 'Resetear Todo'}
                    </button>
                    {selectedBlock !== 'all' && selectedCategory !== 'all' && (
                        <button
                            onClick={handleToggleCategory}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg ${isCategoryClosed ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'}`}
                            title={isCategoryClosed ? "Abrir categoría para permitir que los jueces voten" : "Cerrar categoría para bloquear cambios de los jueces"}
                        >
                            {isCategoryClosed ? <Lock size={18}/> : <Unlock size={18}/>}
                            {isCategoryClosed ? 'Cerrada' : 'Abierta'}
                        </button>
                    )}
                    <button
                        onClick={load}
                        className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-4 p-4 bg-slate-900/50 rounded-xl border border-white/5">
                <div className="flex flex-col gap-1 w-full md:w-1/3">
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Bloque</label>
                    <select
                        className="bg-slate-800 text-white border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-pink-500"
                        value={selectedBlock}
                        onChange={(e) => {
                            setSelectedBlock(e.target.value);
                            setSelectedCategory('all');
                        }}
                    >
                        <option value="all">Todos los bloques</option>
                        {uniqueBlocks.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                </div>
                
                {selectedBlock !== 'all' && (
                    <div className="flex flex-col gap-1 w-full md:w-1/3">
                        <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Categoría</label>
                        <select
                            className="bg-slate-800 text-white border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-pink-500"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">Todas las categorías</option>
                            {uniqueCategories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                )}
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
                            <th className="p-4 text-center">Subtotal</th>
                            <th className="p-4 text-center text-red-500 font-bold">Penalización</th>
                            <th className="p-4 text-center text-white text-base">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row, idx) => (
                            <tr key={row.registration_id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 text-gray-500 font-mono">{idx + 1}</td>
                                <td className="p-4">
                                    <div className="flex items-center justify-between group/row">
                                        <div>
                                            <div className="font-bold text-white text-base">{row.group_name}</div>
                                            <div className="text-gray-500 text-xs">{row.school_name}</div>
                                        </div>
                                        <button 
                                            onClick={() => setEditingScoresGroup(row)} 
                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 opacity-0 group-hover/row:opacity-100 transition-all"
                                            title="Editar notas de los jueces"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                    </div>
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
                                <td className="p-4 text-center text-gray-400 font-mono">
                                    {row.total}
                                </td>
                                <td className="p-4 text-center">
                                    <PenaltyInput 
                                        registrationId={row.registration_id} 
                                        initialPenalty={row.penalty || 0} 
                                        onUpdate={load} 
                                    />
                                </td>
                                <td className="p-4 text-center">
                                    <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full font-black text-lg border border-blue-500/20">
                                        {row.finalTotal}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={activeJudges.length + 6} className="p-8 text-center text-gray-500">
                                    No hay puntuaciones registradas todavía.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal for editing specific scores */}
            {editingScoresGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-white/10 p-6 xl:p-8 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-white">{editingScoresGroup.group_name}</h3>
                                <p className="text-gray-400">{editingScoresGroup.category} • Corrección de notas</p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-pink-500">TOTAL ACTUAL</div>
                                <div className="text-3xl font-black text-white">{editingScoresGroup.finalTotal}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
                            {activeJudges.map(j => (
                                <div key={j} className="bg-black/50 p-5 rounded-2xl border border-white/5">
                                    <h4 className="font-black text-pink-500 mb-4 flex items-center gap-2">
                                        <span className="bg-pink-500/20 px-2 py-0.5 rounded text-sm">J{j}</span>
                                        <span className="truncate">{judgeNames[j] || 'Juez'}</span>
                                    </h4>
                                    <div className="space-y-3">
                                        {allCriteria.map(criteria => (
                                            <div key={criteria} className="flex justify-between items-center text-sm gap-2">
                                                <label className="text-zinc-400 truncate flex-1 text-xs font-bold uppercase tracking-wider">{criteria}</label>
                                                <input 
                                                    type="number"
                                                    min="0"
                                                    max="10"
                                                    defaultValue={editingScoresGroup.detailedJudges[j]?.[criteria] || 0}
                                                    onBlur={async (e) => {
                                                        const val = parseInt(e.target.value);
                                                        if (!isNaN(val)) {
                                                            await updateAdminScore(
                                                                editingScoresGroup.registration_id, 
                                                                j, 
                                                                criteria, 
                                                                val, 
                                                                editingScoresGroup.block, 
                                                                editingScoresGroup.category, 
                                                                judgeNames[j] || `Juez ${j}`
                                                            );
                                                            load(); // Auto refresca los datos globales, el modal se queda con el state en pantalla que iguala los updates visuales.
                                                        }
                                                    }}
                                                    className="w-14 bg-zinc-800 text-white border border-zinc-700 rounded-lg p-1.5 text-center font-black focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-zinc-300">
                                        <span className="text-xs font-bold uppercase text-zinc-500">Subtotal J{j}</span>
                                        <span className="font-black">{editingScoresGroup.judges[j] || 0}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button 
                                onClick={() => {
                                    setEditingScoresGroup(null);
                                    load(); // Full refresh on exit
                                }} 
                                className="px-8 py-3 bg-white text-black hover:bg-zinc-200 shadow-xl shadow-white/10 rounded-xl font-black transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Check size={20}/> HECHO
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
