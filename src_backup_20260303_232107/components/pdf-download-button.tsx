"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { getSeatMapDataAction } from "@/app/actions-pdf";
import { generateSeatMapPDF } from "@/lib/pdf-export";
import { Seat } from "@/types";

interface PDFDownloadButtonProps {
    sessionId: string;
    sessionName: string;
    seats: Seat[];
}

export function PDFDownloadButton({ sessionId, sessionName, seats }: PDFDownloadButtonProps) {
    const [generating, setGenerating] = useState(false);

    const handleDownload = async () => {
        setGenerating(true);
        try {
            const result = await getSeatMapDataAction(sessionId);

            if (!result.success || !result.data) {
                alert("Error al obtener datos: " + result.error);
                return;
            }

            await generateSeatMapPDF({
                sessionId,
                sessionName,
                seats,
                tickets: result.data.tickets,
                registrations: result.data.registrations
            });
        } catch (error: any) {
            console.error('Error generating PDF:', error);
            alert("Error al generar PDF: " + error.message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={generating}
            className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
        >
            <FileDown size={16} />
            {generating ? "Generando PDF..." : "📄 Descargar PDF"}
        </button>
    );
}
