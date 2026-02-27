"use client";

import React, { useState } from 'react';
import { Download } from 'lucide-react';

interface SchoolTicketsPDFButtonProps {
    schoolName: string;
    schoolTickets: any[];
}

export function SchoolTicketsPDFButton({ schoolName, schoolTickets }: SchoolTicketsPDFButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const [{ pdf }, { SchoolTicketsDocument }, React] = await Promise.all([
                import('@react-pdf/renderer'),
                import('./SchoolTicketsDocument'),
                import('react'),
            ]);
             
            const blob = await (pdf as any)(
                React.createElement(SchoolTicketsDocument, { schoolName, schoolTickets })
            ).toBlob();
            const { saveAs } = await import('file-saver');
            saveAs(blob, `Entradas_${schoolName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
        } catch (e) {
            console.error('Error generating school tickets PDF:', e);
            alert('No se pudo generar el PDF. Por favor, inténtelo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={loading}
            className="text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
            <Download size={18} />
            {loading ? 'Generando PDF...' : 'Descargar PDF Entradas'}
        </button>
    );
}
