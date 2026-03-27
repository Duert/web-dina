"use client";

import React, { useState, useMemo } from 'react';
import { Registration } from '@/types';
import { Search, FileText, CheckCircle2 } from 'lucide-react';
import { updateRegistrationNotes } from '@/app/actions-admin';

interface AdminNotesManagerProps {
    registrations: any[]; // Using any to access school_name which might be joined
    onRefresh: () => void;
    onViewDetails: (id: string) => void;
}

export default function AdminNotesManager({ registrations, onRefresh, onViewDetails }: AdminNotesManagerProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyWithNotes, setShowOnlyWithNotes] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);

    const filteredRegistrations = useMemo(() => {
        return registrations.filter(reg => {
            // Check notes existence
            const hasNotes = reg.notes && reg.notes.trim().length > 0;
            if (showOnlyWithNotes && !hasNotes) {
                return false;
            }

            // Check search term
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const groupNameMatch = reg.group_name?.toLowerCase().includes(searchLower);
                const categoryMatch = reg.category?.toLowerCase().includes(searchLower);
                return groupNameMatch || categoryMatch;
            }

            return true;
        }).sort((a, b) => {
            // sort by has notes descending, then group name
            const aHasNotes = a.notes && a.notes.trim().length > 0 ? 1 : 0;
            const bHasNotes = b.notes && b.notes.trim().length > 0 ? 1 : 0;
            if (aHasNotes !== bHasNotes) return bHasNotes - aHasNotes;
            return (a.group_name || '').localeCompare(b.group_name || '');
        });
    }, [registrations, searchTerm, showOnlyWithNotes]);

    const handleNoteChange = async (registrationId: string, newNote: string, originalNote: string | undefined) => {
        const trimmedNote = newNote.trim();
        const originalTrimmed = (originalNote || '').trim();

        if (trimmedNote === originalTrimmed) {
            return; // No changes
        }

        setSavingId(registrationId);
        const res = await updateRegistrationNotes(registrationId, newNote);
        if (res.success) {
            onRefresh();
        } else {
            alert("Error guardando nota: " + res.error);
        }
        setSavingId(null);
    };

    return (
        <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-white/10 bg-white/5 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center">
                        <FileText className="text-yellow-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-yellow-500">Notas Internas de Grupos</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Anota información importante sobre las inscripciones. Solo visible para administradores.
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por grupo o categoría..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
                        />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer bg-black/20 border border-white/10 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={showOnlyWithNotes}
                                onChange={(e) => setShowOnlyWithNotes(e.target.checked)}
                            />
                            <div className={`w-10 h-6 rounded-full transition-colors ${showOnlyWithNotes ? 'bg-yellow-500' : 'bg-gray-600'}`}>
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${showOnlyWithNotes ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                        </div>
                        <span className="text-sm font-medium text-gray-300 select-none">Mostrar solo con notas</span>
                    </label>
                </div>

                <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-white/5 text-xs text-gray-400 uppercase tracking-wider border-b border-white/10">
                                    <th className="p-4 font-medium w-1/4">Grupo</th>
                                    <th className="p-4 font-medium w-3/4">Notas Internas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredRegistrations.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} className="p-8 text-center text-gray-500">
                                            No se encontraron grupos con los filtros actuales.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRegistrations.map(reg => (
                                        <tr key={reg.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 align-top">
                                                <div className="font-bold text-white mb-1">{reg.group_name}</div>
                                                <div className="text-xs text-blue-300 font-medium mb-1">{reg.school_name || 'Escuela no especificada'}</div>
                                                <div className="text-xs text-gray-400 mb-3">{reg.category}</div>
                                                <button
                                                    onClick={() => onViewDetails(reg.id)}
                                                    className="text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-xs font-bold transition-colors w-full sm:w-auto"
                                                >
                                                    Ver Inscripción
                                                </button>
                                            </td>
                                            <td className="p-4">
                                                <div className="relative">
                                                    <textarea
                                                        defaultValue={reg.notes || ''}
                                                        placeholder="Escribe una nota aquí..."
                                                        onBlur={(e) => handleNoteChange(reg.id, e.target.value, reg.notes)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-gray-300 focus:border-yellow-500/50 outline-none min-h-[80px] transition-colors resize-y"
                                                    />
                                                    {savingId === reg.id && (
                                                        <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                                                            <div className="w-3 h-3 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
                                                            Guardando...
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
