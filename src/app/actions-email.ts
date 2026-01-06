"use server";

import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendRegistrationEmail(registrationId: string) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is missing. Email notification skipped.");
        return { success: false, error: "Missing API Key" };
    }

    try {
        // 1. Fetch Registration Details
        const { data: reg, error } = await supabase
            .from('registrations')
            .select(`
                *,
                registration_responsibles (*),
                registration_participants (*)
            `)
            .eq('id', registrationId)
            .single();

        if (error || !reg) throw new Error("Registration not found");

        // 2. Prepare Email Content
        const subject = `Nueva Inscripción: ${reg.group_name} (${reg.category})`;
        const responsiblesList = reg.registration_responsibles
            .map((r: any) => `- ${r.name} ${r.surnames} (${r.phone})`)
            .join('\n');

        const htmlContent = `
            <h1>¡Nueva Inscripción Recibida!</h1>
            <p><strong>Grupo:</strong> ${reg.group_name}</p>
            <p><strong>Categoría:</strong> ${reg.category}</p>
            <p><strong>Participantes:</strong> ${reg.registration_participants.length}</p>
            
            <h3>Responsables:</h3>
            <pre>${responsiblesList}</pre>

            ${reg.notes ? `
            <h3>Notas de la Organización:</h3>
            <div style="background-color: #f3f4f6; padding: 10px; border-radius: 5px; color: #333;">
                ${reg.notes.replace(/\n/g, '<br>')}
            </div>
            ` : ''}

            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin">Ver en Panel de Admin</a></p>
        `;

        // 3. Send Email
        const { data, error: emailError } = await resend.emails.send({
            from: 'Dance In Action <onboarding@resend.dev>', // Update this if user has a domain
            to: [process.env.ADMIN_EMAIL || 'domingojoselol@gmail.com'], // Configurable via environment variable
            subject: subject,
            html: htmlContent,
        });

        if (emailError) throw emailError;

        return { success: true, data };
    } catch (err: any) {
        console.error("Failed to send email:", err);
        return { success: false, error: err.message };
    }
}
