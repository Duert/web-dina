'use client';

import { Download } from "lucide-react";

interface Order {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    total_amount: number;
    payment_status: string;
    created_at: string;
}

export default function ExportButton({ orders }: { orders: Order[] }) {
    const handleExport = () => {
        // 1. Define CSV Headers
        const headers = ["ID", "Fecha", "Nombre", "Email", "Teléfono", "Total (€)", "Estado"];

        // 2. Map data to CSV rows
        const rows = orders.map(o => [
            o.id,
            `"${new Date(o.created_at).toLocaleString()}"`, // Fix: Quote date to handle commas
            `"${o.customer_name?.replace(/"/g, '""') || ''}"`, // Fix: Escape existing quotes
            `"${o.customer_email?.replace(/"/g, '""') || ''}"`,
            `"${o.customer_phone?.replace(/"/g, '""') || ''}"`,
            o.total_amount,
            o.payment_status
        ]);

        // 3. Join everything
        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        // 4. Create Blob and Link
        // Add BOM for Excel to recognize UTF-8 automatically
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `ventas_dina26_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <button
            onClick={handleExport}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 flex items-center gap-2 shadow-sm transition-all active:scale-95"
        >
            <Download size={16} />
            Exportar Excel
        </button>
    );
}
