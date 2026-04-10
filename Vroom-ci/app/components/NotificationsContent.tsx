"use client"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
    Bell,
    BellRing,
    Calendar,
    Car,
    CheckCheck,
    Settings,
    CalendarX,
    Clock,
    CircleCheck,
    AlertCircle,
} from "lucide-react"
import { Notifications } from "@/src/types"
import { fr } from "date-fns/locale"
import { formatDistanceToNow } from "date-fns"
import { useUser } from "@/src/context/UserContext"
import { useNotification } from "@/src/context/NotificationContext"

/**
 * Retourne la route vers laquelle naviguer quand l'utilisateur clique
 * sur une notification, selon son type et son rôle.
 * Retourne null si aucune redirection pertinente.
 */
function getNotificationLink(type: Notifications["type"], role?: string): string | null {
    switch (type) {
        case "transaction":
            if (role === "vendeur" || role === "concessionnaire") return "/vendeur/transactions"
            return "/client/transactions"
        case "rdv":
            if (role === "vendeur" || role === "concessionnaire") return "/vendeur/rdv"
            return "/client/rdv"
        case "formation":
            if (role === "auto_ecole") return "/partenaire/formations"
            return "/client/formations"
        case "tendance":
            if (role === "auto_ecole") return "/partenaire/formations"
            return "/vendeur/vehicles"
        default:
            return null
    }
}

function NotificationsLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-50" />
                    <Skeleton className="h-4 w-75" />
                </div>
                <Skeleton className="h-10 w-35 rounded-xl" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="rounded-2xl">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                                <Skeleton className="h-12 w-12 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-[60%]" />
                                    <Skeleton className="h-4 w-[80%]" />
                                    <Skeleton className="h-3 w-25" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

const getIconByType = (type: Notifications["type"]) => {
    switch (type) {
        case "cancellation":
            return <CalendarX className="h-5 w-5 text-red-600" />
        case "system":
            return <Settings className="h-5 w-5 text-primary" />
        case "suggestion":
            return <Car className="h-5 w-5 text-blue-600" />
        case "alert":
            return <AlertCircle className="h-5 w-5 text-red-600" />
        case "success":
            return <CircleCheck className="h-5 w-5 text-green-700" />
        default:
            return <Bell className="h-5 w-5 text-muted-foreground" />
    }
}

const getIconBgByType = (type: Notifications["type"]) => {
    switch (type) {
        case "cancellation":
            return "bg-red-500/10"
        case "system":
            return "bg-primary/10"
        case "reminder":
            return "bg-amber-500/10"
        case "suggestion":
            return "bg-blue-500/10"
        default:
            return "bg-muted"
    }
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>, title: string, description: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <Icon className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        </div>
    )
}

function NotificationItem({ notification, onRead, role }: { notification: Notifications, onRead: (id: number) => void, role?: string }) {
    const router = useRouter()

    const handleClick = () => {
        if (!notification.is_read) onRead(notification.id)
        const link = getNotificationLink(notification.type, role)
        if (link) router.push(link)
    }

    return (
        <Card onClick={handleClick} className={`rounded-2xl shadow-sm border border-border/40 hover:shadow-md transition-all duration-300 cursor-pointer group ${!notification.is_read ? 'bg-primary/5 border-primary/20' : 'bg-card/50'}`}>
            <CardContent className="p-3 md:p-4">
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${getIconBgByType(notification.type)} flex items-center justify-center shrink-0`}>
                        {getIconByType(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-sm text-foreground leading-snug break-words pr-1">
                                {notification.title}
                            </h4>
                            {!notification.is_read && (
                                <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 break-words">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
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
            <Card className="rounded-2xl md:rounded-3xl shadow-sm border border-zinc-200 overflow-hidden animate-in fade-in slide-in-from-bottom duration-500 bg-white">
                <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                                <BellRing className="h-6 w-6 md:h-7 md:w-7 text-zinc-700" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900">Notifications</h1>
                                    {unreadCount > 0 && (
                                        <Badge className="bg-zinc-900 text-white font-bold rounded-full px-3">
                                            {unreadCount} nouvelles
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-zinc-500 mt-1">
                                    Gérez vos notifications et restez informé
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={markAllRead} className="rounded-xl cursor-pointer border-zinc-200 text-zinc-700 hover:bg-zinc-50">
                                <CheckCheck className="h-4 w-4 mr-2" />
                                Tout marquer comme lu
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-xl cursor-pointer border-zinc-200 text-zinc-700 hover:bg-zinc-50">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom duration-500 delay-100">
                <Card className="rounded-2xl shadow-sm border border-zinc-200 bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                                <Bell className="h-5 w-5 text-zinc-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-zinc-900">{notifs.length}</p>
                                <p className="text-xs font-semibold text-zinc-500">Total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl shadow-sm border border-zinc-200 bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-zinc-900">{notifs.filter(n => !n.is_read).length
                                }</p>
                                <p className="text-xs font-semibold text-zinc-500">Non lues</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* <Card className="rounded-2xl shadow-sm border border-zinc-200 bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Car className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-zinc-900">0</p>
                                <p className="text-xs font-semibold text-zinc-500">Suggestions</p>
                            </div>
                        </div>
                    </CardContent>
                </Card> */}

                {/* <Card className="rounded-2xl shadow-sm border border-zinc-200 bg-white hover:shadow-md transition-all duration-300">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-zinc-900">0</p>
                                <p className="text-xs font-semibold text-zinc-500">Rappels RDV</p>
                            </div>
                        </div>
                    </CardContent>
                </Card> */}
            </div>

            {/* Notifications List */}
            <Card className="shadow-sm border border-zinc-200 overflow-hidden animate-in fade-in slide-in-from-bottom duration-500 delay-200 bg-white">
                <Tabs defaultValue="all" className="w-full">
                    <div className="p-4 border-b border-zinc-200">
                        <TabsList className="w-full md:w-auto grid grid-cols-3 md:flex">
                            <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
                                <Bell className="h-4 w-4" />
                                <span className="hidden md:inline">Toutes</span>
                            </TabsTrigger>
                            {user?.role == "vendeur" ? (
                                <TabsTrigger value="trend" className="gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
                                    <Car className="h-4 w-4" />
                                    <span className="hidden md:inline">Tendance</span>
                                </TabsTrigger>
                            ) : (
                                <TabsTrigger value="suggestions" className="gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
                                    <Car className="h-4 w-4" />
                                    <span className="hidden md:inline">Suggestions</span>
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="reminders" className="gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
                                <Calendar className="h-4 w-4" />
                                <span className="hidden md:inline">Rappels</span>
                            </TabsTrigger>
                            <TabsTrigger value="system" className="gap-2 data-[state=active]:bg-zinc-900 data-[state=active]:text-white">
                                <Settings className="h-4 w-4" />
                                <span className="hidden md:inline">Système</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="all" className="p-6 m-0">
                        {notifs.length === 0 ? (
                            <EmptyState
                                icon={Bell}
                                title="Aucune notification"
                                description="Vous n'avez pas encore reçu de notifications. Elles apparaîtront ici lorsque vous en recevrez."
                            />
                        ) : (
                            <div className="space-y-3">
                                {notifs.map((notification) => (
                                    <NotificationItem key={notification.id} notification={notification} onRead={markAsRead} role={user?.role} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {user?.role == "vendeur" ? (
                        <TabsContent value="trend" className="p-6 m-0">
                            <EmptyState
                                icon={Car}
                                title="Aucune tendance"
                                description="Découvrez quels types de véhicules attirent le plus d'acheteurs dans votre zone."
                            />
                        </TabsContent>
                    ) : (
                        <TabsContent value="suggestions" className="p-6 m-0">
                            <EmptyState
                                icon={Car}
                                title="Aucune suggestion"
                                description="Nous vous proposerons des véhicules correspondant à vos critères et préférences."
                            />
                        </TabsContent>
                    )}

                    <TabsContent value="reminders" className="p-6 m-0">
                        <EmptyState
                            icon={Calendar}
                            title="Aucun rappel"
                            description="Les rappels de vos prochains rendez-vous seront affichés ici."
                        />
                    </TabsContent>

                    <TabsContent value="system" className="p-6 m-0">
                        <EmptyState
                            icon={Settings}
                            title="Aucune notification système"
                            description="Les mises à jour importantes du système et de votre compte seront affichées ici."
                        />
                    </TabsContent>
                </Tabs>
            </Card>

        </div>
    )
}
