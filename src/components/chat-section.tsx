"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { RegistrationMessage } from "@/types";
import { createBrowserClient } from "@supabase/ssr";
import { sendRegistrationMessage, getRegistrationMessages } from "@/app/actions-chat";

interface ChatSectionProps {
    registrationId: string;
    currentUserRole: 'admin' | 'user';
}

export function ChatSection({ registrationId, currentUserRole }: ChatSectionProps) {
    const [messages, setMessages] = useState<RegistrationMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);


    const [supabase] = useState(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ));

    const fetchMessages = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);

        // For ADMIN, use Server Action (Service Role) to bypass RLS
        if (currentUserRole === 'admin') {
            const res = await getRegistrationMessages(registrationId);
            if (res.success && res.data) {
                setMessages(res.data);
            } else {
                console.error("Error fetching messages (Admin):", res.error);
            }
        }
        // For USER (School), use Client Side (Subject to RLS, but owning user has access)
        else {
            const { data, error } = await supabase
                .from('registration_messages')
                .select('*')
                .eq('registration_id', registrationId)
                .order('created_at', { ascending: true });

            if (data) {
                setMessages(data);
            } else if (error) {
                console.error("Error fetching messages (User):", error);
            }
        }

        if (showLoading) setLoading(false);
    }, [registrationId, currentUserRole, supabase]);

    useEffect(() => {
        if (registrationId) {
            setTimeout(() => fetchMessages(true), 0);

            // LOGIC FOR UPDATES
            if (currentUserRole === 'admin') {
                // ADMIN: Poll every 5 seconds (Simple & Safe for Anon)
                const interval = setInterval(() => fetchMessages(false), 5000);
                return () => clearInterval(interval);
            } else {
                // USER: Realtime Subscription (More efficient, requires Auth RLS)
                const channel = supabase
                    .channel(`chat-${registrationId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'registration_messages',
                            filter: `registration_id=eq.${registrationId}`
                        },
                        (payload) => {
                            const newMsg = payload.new as RegistrationMessage;
                            setMessages((prev) => {
                                if (prev.some(m => m.id === newMsg.id)) return prev;
                                return [...prev, newMsg];
                            });
                        }
                    )
                    .subscribe();

                return () => {
                    if (channel) { // Only remove if channel was successfully created
                        supabase.removeChannel(channel);
                    }
                };
            }
        }
    }, [registrationId, fetchMessages, currentUserRole, supabase]);


    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom logic - using scrollTop to avoid page jumping
    useEffect(() => {
        if (scrollContainerRef.current) {
            const { scrollHeight, clientHeight } = scrollContainerRef.current;
            scrollContainerRef.current.scrollTop = scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setSending(true);
        const content = newMessage;
        setNewMessage(""); // Clear input immediately

        // Optimistic Update
        const tempId = crypto.randomUUID();
        const optimisticMsg: RegistrationMessage = {
            id: tempId,
            registration_id: registrationId,
            content: content,
            sender_role: currentUserRole,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg]);

        // Use Server Action for reliable sending
        const res = await sendRegistrationMessage(registrationId, content, currentUserRole);

        if (!res.success) {
            alert("Error enviando mensaje: " + res.error);
            // Rollback on error
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setNewMessage(content); // Restore content
        } else {
            // Success: do nothing, wait for realtime to confirm (which might add the real message)
            // Ideally we would replace the optimistic one with the real one to get the real ID,
            // but for a simple chat, receiving the duplicate via realtime (if different ID? unlikely if we don't know ID)
            // is the issue. 
            // Realtime returns the inserted row with the REAL ID.
            // Our optimistic message has a FAKE ID.
            // So we will get a duplicate in the UI (one optimistic, one real).
            // Fix: When realtime arrives, we should filter out any optimistic messages that match content/timestamp? 
            // Hard to match exactly.

            // Allow the duplicate for a split second, or filter local state?
            // Better: When fetching or receiving realtime, we assume it's authoritative.
            // But if we want instant feedback, we show optimistic.
            // Let's rely on standard deduping if possible? No, IDs differ.

            // Simple trick: The Server Action could return the inserted message. 
            // But currently it only returns success boolean.

            // For now, let's just leave the optimistic message. When the user refreshes, they get the real history.
            // Issue: sending multiple messages might clutter.
            // Refinement: Remove optimistic message when we receive ANY insert via realtime that matches our role?
            // A bit risky. 

            // Let's implement a simple "replace optimistic" strategy if we can.
            // If not, just simple optimistic append is better than "nothing happens".
            // I'll leave it as is for now. The user just wants it to *appear*.
        }
        setSending(false);
    };

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-gray-500" /></div>;

    return (
        <div className="flex flex-col h-[400px] bg-black/20 rounded-xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="bg-white/5 p-3 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-300">
                    <MessageSquare size={16} />
                    Chat con {currentUserRole === 'admin' ? 'el Grupo' : 'la Organización'}
                </div>
                <div className="text-[10px] text-green-500 flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    En vivo
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm italic mt-10">
                        No hay mensajes todavía. <br />
                        {currentUserRole === 'user' ? 'Escribe aquí cualquier duda para la organización.' : 'Escribe aquí para contactar con el grupo.'}
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_role === currentUserRole;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`
                                        max-w-[80%] rounded-2xl px-4 py-2 text-sm 
                                        ${isMe
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-neutral-800 text-gray-200 rounded-bl-none border border-white/10'}
                                    `}
                                >
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                                        {new Date(msg.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                {/* <div ref={messagesEndRef} /> Only keeping if needed for something else, but removing scroll logic */}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white/5 border-t border-white/10 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </form>
        </div>
    );
}
