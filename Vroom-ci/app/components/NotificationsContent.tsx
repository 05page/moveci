"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Bell,
    CheckCheck,
    Settings,
    Clock,
} from "lucide-react"
import { Notifications } from "@/src/types"
import { fr } from "date-fns/locale"
import { formatDistanceToNow } from "date-fns"
import { useUser } from "@/src/context/UserContext"
import { useNotification } from "@/src/context/NotificationContext"
import { cn } from "@/src/lib/utils"

/**
 * Retourne la route vers laquelle naviguer quand l'utilisateur clique
 * sur une notification, selon son type et son rôle.
 * Retourne null si aucune redirection pertinente.
 */
function getNotificationLink(type: Notifications["type"], role?: string, data?: Record<string, string | number>): string | null {
    switch (type) {
        case "transaction":
            if (role === "vendeur" || role === "concessionnaire") return "/vendeur/transactions"
            return "/client/transactions"
        case "rdv":
            if (role === "vendeur" || role === "concessionnaire") return "/vendeur/rdv"
            return "/client/rdv"
        case "formation":
            if (role === "auto_ecole") return "/partenaire/formations"
            if (data?.formation_id) return `/partenaire/formations/${data.formation_id}`
            return "/client/formations"
        case "tendance":
            if (role === "auto_ecole") return "/partenaire/formations"
            return "/vendeur/vehicles"
        case "moderation":
            if (role === "admin") return "/admin/moderation"
            if(data?.vehicule_id) return `/vehicles/${data.vehicule_id}`
            return "/vendeur/vehicles"
        case "alerte_vehicule":
            return "/client/favorites"
        case "reservation":
            if (role === "auto_ecole" || role === "partenaire") return "/partenaire/rdv"
            return "/client/reservations"
        case "abonnement":
        case "support":
            return null
        default:
            return null
    }
}

function NotificationsLoading() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-zinc-100">
                        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/5" />
                            <Skeleton className="h-3 w-4/5" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>, title: string, description: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-6">
                <Icon className="h-8 w-8 text-zinc-300" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-1">{title}</h3>
            <p className="text-sm text-zinc-400 max-w-sm">{description}</p>
        </div>
    )
}

function NotificationItem({ notification, onRead, role }: { notification: Notifications, onRead: (id: number) => void, role?: string }) {
    const router = useRouter()

    const handleClick = () => {
        if (!notification.is_read) onRead(notification.id)
        const link = getNotificationLink(notification.type, role, notification.data)
        if (link) router.push(link)
    }

    return (
        <Card
            onClick={handleClick}
            className={cn(
                "rounded-xl shadow-none border hover:shadow-sm transition-all duration-200 cursor-pointer",
                getNotificationBorderStyle(notification.level),
                !notification.is_read && "opacity-100",
            )}
        >
            <CardContent className="p-3 md:p-4">
                <div className="flex items-start gap-3">

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm text-zinc-900 leading-snug wrap-break-word pr-1">
                                {notification.title}
                            </h4>
                            {!notification.is_read && (
                                <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                            )}
                        </div>
                        <p className="text-sm text-zinc-500 mt-1 wrap-break-word">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-3 w-3 text-zinc-400 shrink-0" />
                            <span className="text-xs text-zinc-400">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function getNotificationBorderStyle(level?: string) {
    switch (level) {
        case "error":
            return "border-red-300 bg-red-50"
        case "warning":
            return "border-orange-300 bg-orange-50"
        case "success":
            return "border-green-300 bg-green-50"
        default:
            return "border-blue-300 bg-blue-50"
    }
}

export function NotificationsContent() {
    const { notifications: notifs, unreadCount, isLoading, markAsRead, markAllRead } = useNotification()
    const { user } = useUser()

    if (isLoading) {
        return <NotificationsLoading />
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <section className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="inline-flex items-center justify-center h-6 px-2 rounded-full bg-zinc-900 text-white text-xs font-semibold">
                                    {unreadCount}
                                </span>
                            )}
                        </h1>
                        <div className="flex items-center gap-3 mt-1.5 text-sm text-zinc-500">
                            <span>{notifs.length} au total</span>
                            <span className="text-zinc-300">·</span>
                            <span>{notifs.filter(n => !n.is_read).length} non lues</span>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={markAllRead}
                            className="rounded-lg text-xs border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        >
                            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                            Tout lire
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        >
                            <Settings className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
                <div className="h-px bg-zinc-100" />
            </section>

            {/* Liste des notifications */}
            <div className="mt-6">
                {notifs.length === 0 ? (
                    <EmptyState
                        icon={Bell}
                        title="Aucune notification"
                        description="Vous n'avez pas encore reçu de notifications. Elles apparaîtront ici lorsque vous en recevrez."
                    />
                ) : (
                    <div className="space-y-3">
                        {notifs.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onRead={markAsRead}
                                role={user?.role}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
