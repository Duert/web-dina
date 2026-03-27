"use client";

import { useEffect, useState } from "react";
import { getUnreadStats } from "@/app/actions-chat";
import { MessageSquare } from "lucide-react";

export function AdminNotificationBadge() {
    const [count, setCount] = useState(0);

    const fetchStats = async () => {
        const res = await getUnreadStats();
        if (res.success && res.total) {
            setCount(res.total);
        }
    };

    useEffect(() => {
        setTimeout(() => fetchStats(), 0);
        // Poll every 30 seconds for new messages
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    if (count === 0) return null;

    return (
        <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {count}
        </div>
    );
}

export function AdminSidebarNotificationBadge({ count }: { count: number }) {
    if (count === 0) return null;
    return (
        <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-in zoom-in">
            {count}
        </span>
    );
}
