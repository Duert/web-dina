"use client";

import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

export function PDFExportButton({ registrations }: { registrations: any[] }) {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const [{ pdf }, { ParticipantsListDocument }, React] = await Promise.all([
                import('@react-pdf/renderer'),
                import('./ParticipantsListDocument'),
                import('react'),
            ]);
             
            const blob = await (pdf as any)(
                React.createElement(ParticipantsListDocument, { registrations })
            ).toBlob();
            const { saveAs } = await import('file-saver');
            saveAs(blob, `Listado_Inscripciones_DINA_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error('Error generating PDF:', e);
            alert('No se pudo generar el PDF. Por favor, inténtelo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
            {loading ? 'Generando...' : 'Exportar PDF'}
        </button>
    );
}
