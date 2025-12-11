import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { Registration, RegistrationResponsible, RegistrationParticipant } from '@/types';

// Create styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#E6007E', // Primary pink
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000',
    },
    headerSubtitle: {
        fontSize: 10,
        color: '#666666',
        marginTop: 5,
    },
    section: {
        margin: 10,
        padding: 10,
    },
    sectionTitle: {
        fontSize: 16,
        marginBottom: 10,
        color: '#E6007E',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    label: {
        width: 120,
        fontSize: 10,
        color: '#666666',
        fontWeight: 'bold',
    },
    value: {
        flex: 1,
        fontSize: 10,
        color: '#000000',
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderColor: '#E5E5E5',
        marginTop: 10,
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row',
    },
    tableCol: {
        width: '30%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#E5E5E5',
    },
    tableColSmall: {
        width: '20%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#E5E5E5',
    },
    tableColLarge: {
        width: '50%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#E5E5E5',
    },
    tableCell: {
        margin: 5,
        fontSize: 9,
    },
    tableHeader: {
        backgroundColor: '#F9FAFB',
        fontWeight: 'bold',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 8,
        color: '#999999',
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        paddingTop: 10,
    }
});

interface RegistrationDocumentProps {
    registration: Registration & {
        registration_responsibles: RegistrationResponsible[];
        registration_participants: RegistrationParticipant[];
    };
}

export const RegistrationDocument = ({ registration }: RegistrationDocumentProps) => (
    <Document>
        <Page size="A4" style={styles.page}>

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>DANCE IN ACTION</Text>
                    <Text style={styles.headerSubtitle}>FICHA DE INSCRIPCIÓN 2026</Text>
                </View>
                <View>
                    <Text style={{ fontSize: 10, color: '#666' }}>Ref: {(registration.id || 'REF-PENDING').slice(0, 8).toUpperCase()}</Text>
                    <Text style={{ fontSize: 10, color: '#666' }}>Fecha: {new Date(registration.created_at || new Date()).toLocaleDateString()}</Text>
                </View>
            </View>

            {/* Group Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Datos del Grupo</Text>
                <View style={styles.row}>
                    <Text style={styles.label}>Nombre del Grupo:</Text>
                    <Text style={styles.value}>{registration.group_name}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Categoría:</Text>
                    <Text style={styles.value}>{registration.category}</Text>
                </View>
            </View>

            {/* Responsibles */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Responsables</Text>
                {registration.registration_responsibles.map((resp, index) => (
                    <View key={resp.id || index} style={{ marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>Responsable {index + 1}</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Nombre:</Text>
                            <Text style={styles.value}>{resp.name} {resp.surnames}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Teléfono:</Text>
                            <Text style={styles.value}>{resp.phone}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Email:</Text>
                            <Text style={styles.value}>{resp.email}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Participants Table */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Participantes ({registration.registration_participants.length})</Text>

                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <View style={styles.tableColLarge}>
                            <Text style={styles.tableCell}>Nombre y Apellidos</Text>
                        </View>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCell}>F. Nacimiento</Text>
                        </View>
                        <View style={styles.tableColSmall}>
                            <Text style={styles.tableCell}>Entradas</Text>
                        </View>
                    </View>

                    {registration.registration_participants.map((part, index) => (
                        <View style={styles.tableRow} key={part.id || index}>
                            <View style={styles.tableColLarge}>
                                <Text style={styles.tableCell}>{part.name} {part.surnames}</Text>
                            </View>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCell}>{new Date(part.dob || new Date()).toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.tableColSmall}>
                                <Text style={styles.tableCell}>{part.num_tickets}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text>Dance In Action - Campeonato Coreográfico de la Vall d'Uixó</Text>
                <Text>Generado automáticamente - {new Date().toLocaleString()}</Text>
            </View>

        </Page>
    </Document>
);
