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

const GAP_CONFIG = [
    { minRow: 1, maxRow: 17, gapsAfter: [11] },
    { minRow: 18, maxRow: 21, gapsAfter: [19, 7] },
    { minRow: 22, maxRow: 25, gapsAfter: [13, 5] },
];

const COLORS = {
    available: [34, 197, 94] as [number, number, number],
    sold: [156, 163, 175] as [number, number, number],
    blocked: [239, 68, 68] as [number, number, number],
    reserved: [234, 179, 8] as [number, number, number],
    manual: [168, 85, 247] as [number, number, number],
    pmr: [244, 114, 182] as [number, number, number]
};

export async function generateSeatMapPDF(data: SeatMapData) {
    const { sessionName, seats, tickets, registrations } = data;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // ----------------------------------------
    // PAGE 1: TITLE & MAP
    // ----------------------------------------
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Dance IN Action 2026 - Plano de Butacas', 105, 15, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(sessionName, 105, 22, { align: 'center' });

    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 105, 27, { align: 'center' });

    // DRAW LEGEND
    let mapYPos = 35;
    const legendItems = [
        { c: COLORS.available, l: 'Disponible' },
        { c: COLORS.sold, l: 'Vendida (Inscripción)' },
        { c: COLORS.pmr, l: 'PMR' },
        { c: COLORS.blocked, l: 'Bloqueada' },
        { c: COLORS.manual, l: 'Manual' }
    ];
    let legendX = 20;
    legendItems.forEach(item => {
        doc.setFillColor(item.c[0], item.c[1], item.c[2]);
        doc.rect(legendX, mapYPos - 3, 4, 4, 'F');
        doc.setFontSize(8);
        doc.text(item.l, legendX + 6, mapYPos);
        legendX += 35;
    });

    mapYPos += 15;

    // DRAW STAGE
    doc.setDrawColor(0);
    doc.setFillColor(240, 240, 240);
    doc.rect(65, mapYPos, 80, 8, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("ESCENARIO", 105, mapYPos + 5.5, { align: 'center' });
    mapYPos += 12;

    // DRAW SEATS
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    const seatSize = 3;
    const seatGapX = 1;
    const seatGapY = 1.5;
    const sectionGapY = 6;
    const aisleGapX = 4;

    const maxRow = Math.max(...seats.map(s => s.row));
    const minRow = Math.min(...seats.map(s => s.row));

    // Group seats by row
    const groupedRows: Record<number, Seat[]> = {};
    for (let i = minRow; i <= maxRow; i++) {
        groupedRows[i] = seats.filter(s => s.row === i).sort((a, b) => b.number - a.number);
    }

    // Helper to get gaps
    const getGapsForRow = (row: number) => {
        const config = GAP_CONFIG.find(c => row >= c.minRow && row <= c.maxRow);
        return config ? config.gapsAfter : [];
    };

    let currentY = mapYPos;

    for (let r = 1; r <= maxRow; r++) {
        const rowSeats = groupedRows[r] || [];
        if (rowSeats.length === 0) continue;

        // Draw Section Headers
        if (r === 1) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text("PATI DE BUTAQUES", 105, currentY, { align: 'center' });
            currentY += 4;
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
        } else if (r === 18) {
            currentY += sectionGapY;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text("ANFITEATRE", 105, currentY, { align: 'center' });
            currentY += 4;
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
        } else if (r === 22) {
            currentY += sectionGapY / 2;
        }

        const gaps = getGapsForRow(r);

        // Calculate total width to center it
        let totalBlocks = rowSeats.length;
        let numGaps = 0;
        rowSeats.forEach(s => {
            if (gaps.includes(s.number)) numGaps++;
        });
        const totalWidth = (totalBlocks * seatSize) + ((totalBlocks - 1) * seatGapX) + (numGaps * aisleGapX);

        let currentX = 105 - (totalWidth / 2);

        // Print Row Number Left
        const displayRow = r > 17 ? r - 17 : r;
        doc.text(displayRow.toString(), currentX - 6, currentY + 2.5);

        rowSeats.forEach(seat => {
            // Determine Color
            let c = COLORS.available;
            if (seat.type === 'pmr') {
                c = COLORS.pmr;
            }
            if (seat.status === 'sold') {
                // Check if manual or registration
                const ticket = tickets.find(t => t.seat_id === seat.id && t.status === 'sold');
                if (ticket && !ticket.registration_id) {
                    c = COLORS.manual;
                } else {
                    c = COLORS.sold;
                }
            } else if (seat.status === 'blocked') {
                c = COLORS.blocked;
            } else if (seat.status === 'reserved') {
                c = COLORS.reserved;
            }

            doc.setFillColor(c[0], c[1], c[2]);
            doc.rect(currentX, currentY, seatSize, seatSize, 'F');

            currentX += seatSize + seatGapX;
            if (gaps.includes(seat.number)) {
                currentX += aisleGapX;
            }
        });

        // Print Row Number Right
        doc.text(displayRow.toString(), currentX + 4, currentY + 2.5);

        currentY += seatSize + seatGapY;
    }

    // ----------------------------------------
    // PAGE 2: ASSIGNMENT LIST
    // ----------------------------------------
    doc.addPage();
    let yPos = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Listado de Asignaciones', 14, yPos);
    yPos += 10;

    // Grouping Logic
    interface GroupData {
        groupName: string;
        category: string;
        minRow: number;
        ticketCount: number;
        seatsByRow: Record<number, number[]>; // Real row number -> Seat numbers
    }

    interface SchoolData {
        schoolName: string;
        groups: GroupData[];
        minRow: number;
        ticketCount: number;
    }

    const schoolsMap = new Map<string, SchoolData>();
    const manualGroupData: GroupData = {
        groupName: "Asignaciones Manuales",
        category: "-",
        minRow: 999,
        ticketCount: 0,
        seatsByRow: {}
    };

    // First find all sold/blocked seats
    tickets.forEach(ticket => {
        if (ticket.status !== 'sold' && ticket.status !== 'blocked') return;

        const seat = seats.find(s => s.id === ticket.seat_id);
        if (!seat) return;

        const row = seat.row;

        if (ticket.registration_id) {
            const reg = registrations.find(r => r.id === ticket.registration_id);
            if (!reg) return;

            const schoolName = reg.school_name || "Desconocida";
            const groupName = reg.group_name || "Desconocido";

            if (!schoolsMap.has(schoolName)) {
                schoolsMap.set(schoolName, { schoolName, groups: [], minRow: 999, ticketCount: 0 });
            }
            const school = schoolsMap.get(schoolName)!;
            if (row < school.minRow) school.minRow = row;
            school.ticketCount++;

            let group = school.groups.find(g => g.groupName === groupName);
            if (!group) {
                group = { groupName, category: reg.category, minRow: 999, seatsByRow: {}, ticketCount: 0 };
                school.groups.push(group);
            }
            if (row < group.minRow) group.minRow = row;
            group.ticketCount++;

            if (!group.seatsByRow[row]) group.seatsByRow[row] = [];
            group.seatsByRow[row].push(seat.number);

        } else if (ticket.status === 'sold' || ticket.status === 'blocked') {
            // Manual or blocked
            const assignName = ticket.assigned_to || (ticket.status === 'blocked' ? "BLOQUEADA" : "Manual");
            let mGroup = manualGroupData;

            // To separate by assignment name, we can treat each assignName as a "School" conceptually
            // Let's create a special "Otras Asignaciones" school
            const schoolName = "📝 Otras Asignaciones (Manuales/Bloqueos)";
            if (!schoolsMap.has(schoolName)) {
                schoolsMap.set(schoolName, { schoolName, groups: [], minRow: 999, ticketCount: 0 });
            }
            const school = schoolsMap.get(schoolName)!;
            if (row < school.minRow) school.minRow = row;
            school.ticketCount++;

            let group = school.groups.find(g => g.groupName === assignName);
            if (!group) {
                group = { groupName: assignName, category: ticket.status === 'blocked' ? 'Bloqueo' : 'Manual', minRow: 999, seatsByRow: {}, ticketCount: 0 };
                school.groups.push(group);
            }
            if (row < group.minRow) group.minRow = row;
            group.ticketCount++;

            if (!group.seatsByRow[row]) group.seatsByRow[row] = [];
            group.seatsByRow[row].push(seat.number);
        }
    });

    // Helper to format ranges: [1,2,3, 5,6] -> "1 al 3, 5 al 6"
    const formatRanges = (nums: number[]) => {
        if (nums.length === 0) return "";
        nums.sort((a, b) => a - b);
        let ranges = [];
        let start = nums[0];
        let prev = nums[0];
        for (let i = 1; i <= nums.length; i++) {
            if (i === nums.length || nums[i] !== prev + 1) {
                if (start === prev) ranges.push(`${start}`);
                else ranges.push(`${start} al ${prev}`);
                if (i < nums.length) {
                    start = nums[i];
                    prev = nums[i];
                }
            } else {
                prev = nums[i];
            }
        }
        return ranges.join(", ");
    };

    // Sort schools
    const sortedSchools = Array.from(schoolsMap.values()).sort((a, b) => a.minRow - b.minRow);

    // Build Table Body
    const tableBody: any[] = [];

    sortedSchools.forEach(school => {
        // School row
        tableBody.push([{ content: `${school.schoolName} (${school.ticketCount} entradas)`, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);

        // Groups
        school.groups.sort((a, b) => a.minRow - b.minRow);
        school.groups.forEach(group => {

            // Format rows
            const rowsArr = Object.keys(group.seatsByRow).map(r => parseInt(r)).sort((a, b) => a - b);

            const assignmentsStrs = rowsArr.map(r => {
                const displayRow = r > 17 ? r - 17 : r;
                const area = r > 17 ? 'Anfiteatro' : 'Patio';
                const ranges = formatRanges(group.seatsByRow[r]);
                return `Fila ${displayRow} (${area}): ${ranges}`;
            });

            tableBody.push([
                { content: `  ► ${group.groupName} (${group.ticketCount} ent.)` },
                group.category,
                assignmentsStrs.join('\n')
            ]);
        });
    });

    if (tableBody.length === 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("No hay asignaciones para mostrar.", 14, yPos);
    } else {
        autoTable(doc, {
            startY: yPos,
            head: [['Grupo / Asignación', 'Categoría', 'Ubicación Asignada']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 40 },
                2: { cellWidth: 80 }
            }
        });
    }

    const fileName = `asignaciones_bloque_${sessionName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
