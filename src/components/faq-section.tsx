"use client";

import { createClient } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export default function FAQSection() {
    const [faqs, setFaqs] = useState<any[]>([]);
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchFAQs();
    }, []);

    const fetchFAQs = async () => {
        const { data } = await supabase
            .from('faqs')
            .select('*')
            .eq('visible', true)
            .order('display_order', { ascending: true });

        if (data) setFaqs(data);
        setLoading(false);
    };

    if (loading || faqs.length === 0) return null;

    return (
        <section className="w-full py-20 bg-black relative overflow-hidden">
            <div className="max-w-3xl mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center mb-12">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                        <HelpCircle className="text-[var(--primary)] w-6 h-6" />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter text-center">
                        Preguntas <span className="text-[var(--primary)]">Frecuentes</span>
                    </h2>
                    <p className="text-gray-500 mt-2">Todo lo que necesitas saber sobre el evento</p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={faq.id}
                            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden transition-all hover:border-white/20"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full px-6 py-5 flex items-center justify-between text-left group"
                            >
                                <span className="font-bold text-white md:text-lg pr-8">{faq.question}</span>
                                <ChevronDown
                                    className={`text-gray-500 transition-transform duration-300 flex-shrink-0 ${openIndex === index ? 'rotate-180 text-[var(--primary)]' : ''}`}
                                    size={20}
                                />
                            </button>

                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-96' : 'max-h-0'}`}
                            >
                                <div className="px-6 pb-6 text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                                    {faq.answer.split('\n').map((line: string, i: number) => (
                                        <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Soft decorative light */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent"></div>
        </section>
    );
}
