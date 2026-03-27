"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchGroupsForVoting, updateGroupOrder } from "@/app/actions-judges";
import { Loader2, ArrowUp, ArrowDown, Save, Search } from "lucide-react";
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

    const loadGroups = async () => {
        setLoading(true);
        const res = await fetchGroupsForVoting(block, category);
        if (res.success) {
            setGroups(res.data || []);
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

    return (
        <div>
            <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-end">
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Orden de Actuación (v2)</h2>
                    <p className="text-gray-400 text-sm">Define el orden en el que aparecerán los grupos para el jurado.</p>
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
