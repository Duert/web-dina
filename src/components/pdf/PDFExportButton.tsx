"use client";

import dynamic from "next/dynamic";
import { ParticipantsListDocument } from "./ParticipantsListDocument";
import { FileText, Loader2 } from "lucide-react";

// Dynamically import PDFDownloadLink with no SSR
const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    {
        ssr: false,
        loading: () => <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 opacity-50 cursor-not-allowed"><Loader2 size={16} className="animate-spin" /> Cargando PDF...</button>,
    }
);

export const PDFExportButton = ({ registrations }: { registrations: any[] }) => {
    return (
        <PDFDownloadLink
            document={<ParticipantsListDocument registrations={registrations} />}
            fileName={`Listado_Inscripciones_DINA_${new Date().toISOString().split('T')[0]}.pdf`}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
        >
            {/* @ts-ignore */}
            {({ loading }) => (
                <>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                    Exportar PDF
                </>
            )}
        </PDFDownloadLink>
    );
};
