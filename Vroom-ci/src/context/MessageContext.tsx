"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useUser } from "./UserContext";

interface MessageContextType {
    unreadMessageCount: number;
    // Permet de décrémenter le compteur quand l'user ouvre une conversation
    decrementBy: (n: number) => void;
    // Recharge le compteur depuis le backend (utile après markAsRead)
    refresh: () => void;
}

const MessageContext = createContext<MessageContextType | null>(null);

export function MessageProvider({ children }: { children: React.ReactNode }) {
    const [unreadMessageCount, setUnreadMessageCount] = useState(0);
    const { user } = useUser();

    const fetchCount = useCallback(async () => {
        try {
            const res = await fetch("/api/proxy/conversations/unread-count");
            if (!res.ok) return;
            const data = await res.json();
            setUnreadMessageCount(data.unread_count ?? 0);
        } catch {
            // silencieux : on n'affiche simplement pas de badge
        }
    }, []);

    // Charge le compteur dès que l'user est connecté
    useEffect(() => {
        if (!user) { setUnreadMessageCount(0); return; }
        fetchCount();
    }, [user, fetchCount]);

    // Écoute les nouveaux messages en temps réel via Reverb
    useEffect(() => {
        if (!user?.id) return;
        const userId = user.id;

        async function connectEcho() {
            try {
                const { getEcho } = await import("../lib/echo");
                const echo = await getEcho();
                // Le canal conversation.* broadcast l'event MessageSent
                // On incrémente le badge dès qu'un message arrive pour cet user
                // Écoute l'event MessageSent sur le canal privé user.{id}
                // Le backend broadcast sur ce canal pour chaque message reçu
                echo
                    .private(`user.${userId}`)
                    .listen(".message.sent", () => {
                        setUnreadMessageCount(prev => prev + 1);
                    });
            } catch {
                // WebSocket indisponible : le compteur restera à la valeur HTTP
            }
        }

        connectEcho();

        return () => {
            import("../lib/echo").then(({ getEcho }) =>
                getEcho().then(echo => echo.leave(`user.${userId}`)).catch(() => {})
            ).catch(() => {});
        };
    }, [user?.id]);

    const decrementBy = (n: number) =>
        setUnreadMessageCount(prev => Math.max(0, prev - n));

    return (
        <MessageContext.Provider value={{ unreadMessageCount, decrementBy, refresh: fetchCount }}>
            {children}
        </MessageContext.Provider>
    );
}

export function useMessage() {
    const ctx = useContext(MessageContext);
    if (!ctx) throw new Error("useMessage doit être utilisé dans un MessageProvider");
    return ctx;
}
