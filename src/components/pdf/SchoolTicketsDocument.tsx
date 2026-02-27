import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Register standard font
Font.register({
    family: 'Helvetica',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf' },
        { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf', fontWeight: 'bold' }
    ]
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff'
    },
    header: {
        marginBottom: 30,
        borderBottomWidth: 2,
        borderBottomColor: '#111',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111'
    },
    schoolName: {
        fontSize: 14,
        color: '#666',
        marginTop: 4
    },
    date: {
        fontSize: 10,
        color: '#999'
    },
    blockSection: {
        marginBottom: 25,
        breakInside: 'avoid'
    },
    blockTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        backgroundColor: '#f4f4f5',
        padding: 8,
        marginBottom: 10,
        color: '#27272a',
        textTransform: 'uppercase'
    },
    groupItem: {
        marginBottom: 15,
        marginLeft: 10,
        borderLeftWidth: 2,
        borderLeftColor: '#3b82f6',
        paddingLeft: 10
    },
    groupName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 5
    },
    seatRow: {
        flexDirection: 'row',
        marginBottom: 3,
        flexWrap: 'wrap'
    },
    seatRowLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4b5563',
        width: 80
    },
    seatRowValues: {
        fontSize: 10,
        color: '#6b7280',
        flex: 1
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 8,
        color: '#999',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10
    }
});

interface SchoolTicketsDocumentProps {
    schoolName: string;
    schoolTickets: any[];
}

export const SchoolTicketsDocument: React.FC<SchoolTicketsDocumentProps> = ({ schoolName, schoolTickets }) => {

    // Process tickets
    const blocksData: Record<string, Record<string, Record<string, number[]>>> = {};

    schoolTickets.forEach(t => {
        const blockId = t.session_id;
        const groupName = t.group_name || 'Desconocido';
        let rowKey = 'Desconocido';
        let seatNum = 0;

        if (t.seat_id.startsWith('Patio')) {
            const parts = t.seat_id.split('-');
            rowKey = `P-Fila ${parts[1]}`;
            seatNum = parseInt(parts[2]);
        } else if (t.seat_id.startsWith('R')) {
            const parts = t.seat_id.split('-');
            const rowVal = parts[0].substring(1);
            rowKey = `A-Fila ${rowVal}`;
            seatNum = parseInt(parts[1]);
        } else {
            rowKey = `Otros`;
            const match = t.seat_id.match(/(\d+)$/);
            seatNum = match ? parseInt(match[1]) : 0;
        }

        if (!blocksData[blockId]) blocksData[blockId] = {};
        if (!blocksData[blockId][groupName]) blocksData[blockId][groupName] = {};
        if (!blocksData[blockId][groupName][rowKey]) blocksData[blockId][groupName][rowKey] = [];

        if (!isNaN(seatNum)) {
            blocksData[blockId][groupName][rowKey].push(seatNum);
        }
    });

    // Helper to format block ID to readable name
    const getBlockLabel = (id: string) => {
        if (id === 'block1') return 'Mañana B1 (Infantil)';
        if (id === 'block2') return 'Mañana B2 (Junior)';
        if (id === 'block3') return 'Tarde B3 (Juvenil)';
        if (id === 'block4') return 'Tarde B4 (Absoluta / Premium)';
        return id;
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Entradas Asignadas</Text>
                        <Text style={styles.schoolName}>{schoolName}</Text>
                    </View>
                    <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>
                </View>

                {Object.keys(blocksData).length === 0 ? (
                    <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', marginTop: 50 }}>
                        Esta escuela no tiene entradas asignadas en este momento.
                    </Text>
                ) : (
                    Object.keys(blocksData).sort().map(blockId => (
                        <View key={blockId} style={styles.blockSection}>
                            <Text style={styles.blockTitle}>{getBlockLabel(blockId)}</Text>

                            {Object.entries(blocksData[blockId]).sort(([g1], [g2]) => g1.localeCompare(g2)).map(([groupName, rows]) => (
                                <View key={groupName} style={styles.groupItem} wrap={false}>
                                    <Text style={styles.groupName}>{groupName}</Text>

                                    {Object.entries(rows).sort().map(([rowLabel, seatNumbers]) => {
                                        const sorted = [...seatNumbers].sort((a, b) => a - b);
                                        const ranges: string[] = [];
                                        if (sorted.length > 0) {
                                            let start = sorted[0];
                                            let prev = sorted[0];
                                            for (let i = 1; i <= sorted.length; i++) {
                                                if (i < sorted.length && sorted[i] === prev + 1) {
                                                    prev = sorted[i];
                                                } else {
                                                    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
                                                    if (i < sorted.length) {
                                                        start = sorted[i];
                                                        prev = sorted[i];
                                                    }
                                                }
                                            }
                                        }

                                        return (
                                            <View key={rowLabel} style={styles.seatRow}>
                                                <Text style={styles.seatRowLabel}>{rowLabel}:</Text>
                                                <Text style={styles.seatRowValues}>{ranges.join(', ')}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}
                        </View>
                    ))
                )}

                <View style={styles.footer} fixed>
                    <Text>Documento generado para distribución de entradas físicas - Dance IN Action 2026</Text>
                </View>
            </Page>
        </Document>
    );
};
