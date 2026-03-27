import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { Registration } from '@/types';

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
        padding: 30,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff'
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#111',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    date: {
        fontSize: 10,
        color: '#666'
    },
    table: {
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row'
    },
    tableCol: {
        width: '16%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0
    },
    tableColSmall: {
        width: '10%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0
    },
    tableColLarge: {
        width: '32%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0
    },
    tableCell: {
        margin: 5,
        fontSize: 8
    },
    tableCellHeader: {
        margin: 5,
        fontSize: 8,
        fontWeight: 'bold'
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 8,
        color: '#999',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10
    }
});

interface ParticipantsListDocumentProps {
    registrations: any[];
}

export const ParticipantsListDocument: React.FC<ParticipantsListDocumentProps> = ({ registrations }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Listado de Inscripciones</Text>
                    <Text style={{ fontSize: 10, marginTop: 5 }}>DINA 2026</Text>
                </View>
                <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>
            </View>

            <View style={styles.table}>
                <View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
                    <View style={styles.tableColLarge}>
                        <Text style={styles.tableCellHeader}>Grupo / Escuela</Text>
                    </View>
                    <View style={styles.tableCol}>
                        <Text style={styles.tableCellHeader}>Categoría</Text>
                    </View>
                    <View style={styles.tableCol}>
                        <Text style={styles.tableCellHeader}>Responsable</Text>
                    </View>
                    <View style={styles.tableColSmall}>
                        <Text style={styles.tableCellHeader}>Bail.</Text>
                    </View>
                    <View style={styles.tableColSmall}>
                        <Text style={styles.tableCellHeader}>Pagado</Text>
                    </View>
                    <View style={styles.tableCol}>
                        <Text style={styles.tableCellHeader}>Estado</Text>
                    </View>
                </View>

                {registrations.map((reg, index) => {
                    const responsible = reg.registration_responsibles?.[0] || {};
                    const totalParticipants = reg.registration_participants?.length || 0;
                    const isPaid = !!reg.payment_proof_url;

                    return (
                        <View style={styles.tableRow} key={index}>
                            <View style={styles.tableColLarge}>
                                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{reg.group_name}</Text>
                                <Text style={[styles.tableCell, { color: '#666' }]}>{reg.school_name || '-'}</Text>
                            </View>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCell}>{reg.category}</Text>
                            </View>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCell}>{responsible.name} {responsible.surnames}</Text>
                                <Text style={[styles.tableCell, { fontSize: 7, color: '#666' }]}>{responsible.phone}</Text>
                            </View>
                            <View style={styles.tableColSmall}>
                                <Text style={[styles.tableCell, { textAlign: 'center' }]}>{totalParticipants}</Text>
                            </View>
                            <View style={styles.tableColSmall}>
                                <Text style={[styles.tableCell, { textAlign: 'center', color: isPaid ? 'green' : 'red' }]}>
                                    {isPaid ? 'SÍ' : 'NO'}
                                </Text>
                            </View>
                            <View style={styles.tableCol}>
                                <Text style={[styles.tableCell, { textTransform: 'uppercase' }]}>
                                    {reg.status === 'submitted' ? 'ENVIADO' : 'BORRADOR'}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>

            <View style={styles.footer}>
                <Text>Documento generado automáticamnete por Web DINA</Text>
            </View>
        </Page>
    </Document>
);
