"use client";

import React, { useState } from 'react';
import { Download } from 'lucide-react';

interface RegistrationPDFButtonProps {
    registration: any;
}

export function RegistrationPDFButton({ registration }: RegistrationPDFButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        if (!registration || loading) return;
        setLoading(true);
        try {
            const [{ pdf }, { RegistrationDocument }, React] = await Promise.all([
                import('@react-pdf/renderer'),
                import('./RegistrationDocument'),
                import('react'),
            ]);
             
            const blob = await (pdf as any)(React.createElement(RegistrationDocument, { registration })).toBlob();
            const { saveAs } = await import('file-saver');
            saveAs(blob, `Inscripcion_${registration.group_name.replace(/\s+/g, '_')}.pdf`);
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
            className="bg-white/10 hover:bg-white/20 hover:text-white text-gray-300 text-xs md:text-sm font-bold px-3 py-2 md:px-4 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
        >
            <Download size={16} />
            {loading ? 'Generando...' : 'PDF'}
        </button>
    );
}
