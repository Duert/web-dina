import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Seat } from '@/types';

interface SeatMapData {
    sessionId: string;
    sessionName: string;
    seats: Seat[];
    tickets: any[];
    registrations: any[];
}

export async function generateSeatMapPDF(data: SeatMapData) {
    const { sessionName, seats, tickets, registrations } = data;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Dance IN Action 2026', 105, 20, { align: 'center' });

    doc.setFontSize(16);
    doc.text('Plano de Butacas', 105, 28, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(sessionName, 105, 35, { align: 'center' });

    // Date
    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 105, 40, { align: 'center' });

    // Statistics
    const availableCount = seats.filter(s => s.status === 'available').length;
    const soldCount = seats.filter(s => s.status === 'sold').length;
    const blockedCount = seats.filter(s => s.status === 'blocked').length;
    const manualCount = tickets.filter(t => t.status === 'sold' && !t.registration_id).length;
    const totalRevenue = tickets
        .filter(t => t.status === 'sold')
        .reduce((sum, t) => sum + (t.price || 0), 0);

    let yPos = 50;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Estadísticas Generales', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const stats = [
        ['Total Butacas:', seats.length.toString()],
        ['Disponibles:', availableCount.toString()],
        ['Vendidas:', soldCount.toString()],
        ['Bloqueadas:', blockedCount.toString()],
        ['Asignadas Manualmente:', manualCount.toString()],
        ['Recaudación Total:', `${totalRevenue.toFixed(2)}€`]
    ];

    autoTable(doc, {
        startY: yPos,
        head: [],
        body: stats,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 60 },
            1: { cellWidth: 40 }
        }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Legend
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Leyenda', 14, yPos);
    yPos += 8;

    const legendItems = [
        { color: [34, 197, 94], label: 'Disponible' },
        { color: [156, 163, 175], label: 'Vendida (Inscripción)' },
        { color: [239, 68, 68], label: 'Bloqueada' },
        { color: [168, 85, 247], label: 'Asignada Manualmente' }
    ];

    legendItems.forEach((item, index) => {
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.rect(14, yPos - 3, 5, 5, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(item.label, 22, yPos + 1);
        yPos += 7;
    });

    yPos += 5;

    // Sold Seats Table
    if (soldCount > 0) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Butacas Vendidas', 14, yPos);
        yPos += 8;

        const soldSeatsData = tickets
            .filter(t => t.status === 'sold')
            .map(ticket => {
                const seat = seats.find(s => s.id === ticket.seat_id);
                const registration = registrations.find(r => r.id === ticket.registration_id);

                return [
                    seat?.zone || '-',
                    seat?.row?.toString() || '-',
                    seat?.number?.toString() || '-',
                    ticket.registration_id ? (registration?.group_name || 'N/A') : (ticket.assigned_to || 'Manual'),
                    ticket.registration_id ? (registration?.category || '-') : '-',
                    ticket.is_free ? 'GRATIS' : `${(ticket.price || 0).toFixed(2)}€`
                ];
            });

        autoTable(doc, {
            startY: yPos,
            head: [['Zona', 'Fila', 'Butaca', 'Grupo/Asignado', 'Categoría', 'Precio']],
            body: soldSeatsData,
            theme: 'striped',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 15 },
                2: { cellWidth: 20 },
                3: { cellWidth: 50 },
                4: { cellWidth: 40 },
                5: { cellWidth: 25 }
            }
        });
    }

    // Blocked/Manual Seats Table
    const blockedOrManual = tickets.filter(t =>
        t.status === 'blocked' || (t.status === 'sold' && !t.registration_id)
    );

    if (blockedOrManual.length > 0) {
        if (soldCount > 0) {
            doc.addPage();
        }
        yPos = soldCount > 0 ? 20 : (doc as any).lastAutoTable.finalY + 15;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Butacas Bloqueadas / Asignadas Manualmente', 14, yPos);
        yPos += 8;

        const blockedData = blockedOrManual.map(ticket => {
            const seat = seats.find(s => s.id === ticket.seat_id);

            return [
                seat?.zone || '-',
                seat?.row?.toString() || '-',
                seat?.number?.toString() || '-',
                ticket.status === 'blocked' ? 'BLOQUEADA' : 'ASIGNADA',
                ticket.assigned_to || '-',
                ticket.is_free ? 'GRATIS' : `${(ticket.price || 0).toFixed(2)}€`
            ];
        });

        autoTable(doc, {
            startY: yPos,
            head: [['Zona', 'Fila', 'Butaca', 'Estado', 'Asignado a', 'Precio']],
            body: blockedData,
            theme: 'striped',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [239, 68, 68], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 15 },
                2: { cellWidth: 20 },
                3: { cellWidth: 30 },
                4: { cellWidth: 50 },
                5: { cellWidth: 25 }
            }
        });
    }

    // Save PDF
    const fileName = `plano_butacas_${sessionName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
