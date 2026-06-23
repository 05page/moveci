"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Bell, CalendarDays, Car, CheckCheck,
    CreditCard, GraduationCap, KeyRound, Shield, RefreshCw,
} from "lucide-react"
import { Notifications } from "@/src/types"
import { fr } from "date-fns/locale"
import { formatDistanceToNow } from "date-fns"
import { useUser } from "@/src/context/UserContext"
import { useNotification } from "@/src/context/NotificationContext"
import { cn } from "@/src/lib/utils"

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Retourne la route vers laquelle naviguer quand l'utilisateur clique
 * sur une notification, selon son type et son rôle.
 * Retourne null si aucune redirection pertinente.
 */
function getNotificationLink(
    type: Notifications["type"],
    role?: string,
    data?: Record<string, string | number>
): string | null {
    switch (type) {
        case "transaction":
            return role === "vendeur" || role === "concessionnaire" ? "/vendeur/transactions" : "/client/transactions"
        case "rdv":
            return role === "vendeur" || role === "concessionnaire" ? "/vendeur/rdv" : "/client/rdv"
        case "formation":
            if (role === "auto_ecole") return "/partenaire/formations"
            if (data?.formation_id) return `/partenaire/formations/${data.formation_id}`
            return "/client/formations"
        case "tendance":
            return role === "auto_ecole" ? "/partenaire/formations" : "/vendeur/vehicles"
        case "moderation":
            if (role === "admin") return "/admin/moderation"
            if (data?.vehicule_id) return `/vendeur/vehicles/${data.vehicule_id}`
            return "/vendeur/vehicles"
        case "alerte_vehicule":
            return "/client/favorites"
        case "reservation":
            return role === "auto_ecole" || role === "partenaire" ? "/partenaire/rdv" : "/client/reservations"
        default:
            return null
    }
}

/** Icône affichée dans la pastille gauche de chaque notification, selon le type */
function NotifIcon({ type, level }: { type: string; level?: string }) {
    const iconClass = "h-5 w-5"

    const icon = (() => {
        switch (type) {
            case "rdv":             return <CalendarDays className={iconClass} />
            case "transaction":     return <CreditCard className={iconClass} />
            case "reservation":     return <KeyRound className={iconClass} />
            case "moderation":      return <Shield className={iconClass} />
            case "formation":       return <GraduationCap className={iconClass} />
            case "alerte_vehicule": return <Car className={iconClass} />
            default:                return <Bell className={iconClass} />
        }
    })()

    const bg = (() => {
        switch (level) {
            case "error":   return "bg-red-100 text-red-500"
            case "warning": return "bg-amber-100 text-amber-600"
            case "success": return "bg-green-100 text-green-600"
            default:        return "bg-blue-100 text-blue-500"
        }
    })()

    return (
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bg)}>
            {icon}
        </div>
    )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = "toutes" | "non_lues" | "lues"

const TABS: { key: TabKey; label: string }[] = [
    { key: "toutes",   label: "Toutes" },
    { key: "non_lues", label: "Non lues" },
    { key: "lues",     label: "Lues" },
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotificationsLoading() {
    return (
        <div className="space-y-3">
            <div className="flex gap-6 border-b border-zinc-200 pb-3 mb-6">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-5 w-20 rounded" />)}
            </div>
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-zinc-100">
                    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/5" />
                        <Skeleton className="h-3 w-4/5" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─── Item ─────────────────────────────────────────────────────────────────────

function NotificationItem({
    notification,
    onRead,
    role,
}: {
    notification: Notifications
    onRead: (id: number) => void
    role?: string
}) {
    const router = useRouter()

    const handleClick = () => {
        if (!notification.is_read) onRead(notification.id)
        const link = getNotificationLink(notification.type, role, notification.data)
        if (link) router.push(link)
    }

    const navigable = !!getNotificationLink(notification.type, role, notification.data)

    return (
        <div
            onClick={handleClick}
            className={cn(
                "flex items-start gap-3 p-4 bg-white rounded-2xl border transition-shadow",
                !notification.is_read ? "border-zinc-200 shadow-sm" : "border-zinc-100",
                navigable && "cursor-pointer hover:shadow-md"
            )}
        >
            <NotifIcon type={notification.type} level={notification.level} />

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                        "text-sm leading-snug",
                        notification.is_read ? "font-medium text-zinc-700" : "font-black text-zinc-900"
                    )}>
                        {notification.title}
                    </p>
                    {!notification.is_read && (
                        <span className="w-2 h-2 rounded-full bg-move-gold shrink-0 mt-1.5" />
                    )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{notification.message}</p>
                <p className="text-[11px] text-zinc-400 mt-1.5">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })}
                </p>
            </div>
        </div>
    )
}

// ─── Content ─────────────────────────────────────────────────────────────────

export function NotificationsContent() {
    const { notifications: notifs, unreadCount, isLoading, markAsRead, markAllRead, refetch } = useNotification()
    const { user } = useUser()
    const [tab, setTab] = useState<TabKey>("toutes")

    if (isLoading) return <NotificationsLoading />

    const getByTab = (key: TabKey) => {
        if (key === "non_lues") return notifs.filter(n => !n.is_read)
        if (key === "lues")     return notifs.filter(n => n.is_read)
        return notifs
    }

    const filtered = getByTab(tab)

    return (
        <div>
            {/* ── Tabs ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 border-b border-zinc-200 mb-6 overflow-x-auto">
                {TABS.map(t => {
                    const count =
                        t.key === "toutes"   ? notifs.length :
                        t.key === "non_lues" ? notifs.filter(n => !n.is_read).length :
                        notifs.filter(n => n.is_read).length

                    return (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer",
                                tab === t.key
                                    ? "border-move-gold text-move-gold"
                                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                            )}
                        >
                            {t.label}
                            {count > 0 && (
                                <span className={cn(
                                    "text-xs font-bold px-1.5 py-0.5 rounded-full",
                                    tab === t.key ? "bg-move-gold/15 text-move-gold" : "bg-zinc-100 text-zinc-500"
                                )}>
                                    {count}
                                </span>
                            )}
                        </button>
                    )
                })}

                <div className="ml-auto pb-2 flex items-center gap-1 shrink-0">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Tout lire
                        </button>
                    )}
                    <button
                        onClick={refetch}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Actualiser
                    </button>
                </div>
            </div>

            {/* ── Liste / vide ──────────────────────────────────────── */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 rounded-full bg-white border border-zinc-200 flex items-center justify-center mb-5 shadow-sm">
                        <Bell className="h-9 w-9 text-zinc-300" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 mb-2">Aucune notification</h3>
                    <p className="text-sm text-zinc-500 max-w-sm">
                        {tab === "non_lues"
                            ? "Vous avez lu toutes vos notifications."
                            : tab === "lues"
                            ? "Aucune notification lue pour le moment."
                            : "Vous n'avez pas encore reçu de notifications."
                        }
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(n => (
                        <NotificationItem
                            key={n.id}
                            notification={n}
                            onRead={markAsRead}
                            role={user?.role}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
