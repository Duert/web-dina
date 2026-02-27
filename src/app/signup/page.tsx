"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signupSchoolAction } from "@/app/actions";
import { Lock, Mail, Loader2, ChevronLeft, Building2, User, Phone } from "lucide-react";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [schoolName, setSchoolName] = useState("");
    const [repName, setRepName] = useState("");
    const [repSurnames, setRepSurnames] = useState("");
    const [repPhone, setRepPhone] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            setLoading(false);
            return;
        }

        try {
            // Import dynamically or use the imported one if we convert this component to use server actions properly.
            // Since this is a client component, we should import the action.
            // But checking imports... I need to import { signupSchoolAction } from "@/app/actions";
            // I'll add the import in a separate edit or assume I can add it here if I replace the whole file or top.
            // Wait, replace_file_content replaces a block. I need to add the import at the top too.
            // Let's just do the fetch call logic here or import it if I added it to the imports (I didn't yet).

            // Actually, better to import it at the top. 
            // I will use replace_file_content to swap the imports and then this function.
            // For now, let's just use the `signupSchoolAction` and I will add the import in the next step or same step if I can range it? No, imports are at top.

            // I will return to the planning to add import first? 
            // No, I can replace the imports block + function block? Too big.
            // I'll replace the function body and assume I'll add the import next.

            // WAIT, `src/app/actions.ts` is a server action file ('use server').
            // I can import it directly in a client component.

            const result = await signupSchoolAction({
                email,
                password,
                school_name: schoolName,
                rep_name: repName,
                rep_surnames: repSurnames,
                rep_phone: repPhone
            });

            if (!result.success) {
                throw new Error(result.message);
            }

            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error al registrarse");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 border border-green-500/30">
                    <Mail size={40} />
                </div>
                <h1 className="text-3xl font-bold text-white mb-4 uppercase tracking-tighter">¡Casi listo!</h1>
                <p className="text-gray-400 max-w-md mb-8">
                    Tu cuenta ha sido creada correctamente.
                    Ya puedes iniciar sesión con tus credenciales.
                </p>
                <Link href="/login" className="bg-[var(--primary)] text-white px-8 py-3 rounded-full font-bold hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20">
                    Volver al Login
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 py-12 px-6 bg-[grid-white-5%]">
            <div className="max-w-2xl mx-auto">
                <Link href="/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
                    <ChevronLeft size={20} /> Volver al Login
                </Link>

                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2 uppercase">REGISTRO DE <span className="text-[var(--primary)]">CENTRO</span></h1>
                    <p className="text-gray-500">Crea una cuenta para tu escuela de baile y gestiona tus inscripciones.</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl">
                    <form onSubmit={handleSignup} className="space-y-8">

                        {/* SCHOOL INFO */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2">
                                <Building2 size={14} /> Datos de la Escuela
                            </h2>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Nombre de la Escuela de Baile</label>
                                <input
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-[var(--primary)] outline-none transition-all"
                                    placeholder="Ej. Escuela DINA"
                                    value={schoolName}
                                    onChange={(e) => setSchoolName(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* REPRESENTATIVE INFO */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2">
                                <User size={14} /> Representante Legal
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Nombre</label>
                                    <input
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-[var(--primary)] outline-none transition-all"
                                        placeholder="Nombre"
                                        value={repName}
                                        onChange={(e) => setRepName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Apellidos</label>
                                    <input
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-[var(--primary)] outline-none transition-all"
                                        placeholder="Apellidos"
                                        value={repSurnames}
                                        onChange={(e) => setRepSurnames(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Teléfono de contacto</label>
                                    <input
                                        required
                                        type="tel"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-[var(--primary)] outline-none transition-all"
                                        placeholder="600 000 000"
                                        value={repPhone}
                                        onChange={(e) => setRepPhone(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ACCOUNT INFO */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2">
                                <Mail size={14} /> Credenciales de Acceso
                            </h2>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Email (Usuario)</label>
                                <input
                                    required
                                    type="email"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-[var(--primary)] outline-none transition-all"
                                    placeholder="tu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Contraseña</label>
                                    <input
                                        required
                                        type="password"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-[var(--primary)] outline-none transition-all"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Confirmar Contraseña</label>
                                    <input
                                        required
                                        type="password"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-[var(--primary)] outline-none transition-all"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center animate-in shake">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[var(--primary)] text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(255,0,204,0.3)] hover:shadow-[0_0_30px_rgba(255,0,204,0.5)] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : "REGISTRAR ESCUELA"}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-gray-500">¿Ya tienes cuenta?</span>{" "}
                        <Link href="/login" className="text-[var(--primary)] font-bold hover:underline">
                            Inicia sesión
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
