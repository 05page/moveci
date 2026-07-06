"use client"

import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
    BarChart3,
    Bell,
    BookOpen,
    HelpCircle,
    MessageSquare,
    Home,
    LayoutDashboard,
    LogOut,
    Settings,
    TrendingUp,
    User,
    Warehouse,
    Calendar,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { api } from "@/src/lib/api"
import { useUser } from "@/src/context/UserContext"
import { useNotification } from "@/src/context/NotificationContext"
import { getConversations } from "@/src/actions/conversations.actions"
import { useState, useEffect } from "react"

// Tous les items de nav avec leur restriction éventuelle par rôle
const ALL_NAV_ITEMS = [
    { href: "/partenaire/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: null },
    { href: "/partenaire/mongarage", label: "Mon Garage", icon: Warehouse, roles: ["concessionnaire"] },
    { href: "/partenaire/stats", label: "Statistiques", icon: BarChart3, roles: null },
    { href: "/partenaire/trend", label: "Tendances", icon: TrendingUp, roles: null },
    { href: "/partenaire/rdv", label: "Nos Rendez-vous", icon: Calendar, roles: null },
    { href: "/partenaire/formations", label: "Formations", icon: BookOpen, roles: ["auto_ecole"] },
    { href: "/partenaire/aide", label: "Aide", icon: HelpCircle, roles: null },
    { href: "/partenaire/settings", label: "Paramètres", icon: Settings, roles: null },
]

export default function PartenaireLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { user } = useUser()
    const isMessagesPage = pathname === "/partenaire/messages"
    const [unreadMessages, setUnreadMessages] = useState(0)
    // Remet le compteur messages à 0 quand l'utilisateur ouvre la page messages
    const displayedUnreadMessages = isMessagesPage ? 0 : unreadMessages

    // Filtre les items selon le rôle : null = visible par tous
    const navItems = ALL_NAV_ITEMS.filter(item =>
        item.roles === null || item.roles.includes(user?.role ?? "")
    )

    const { unreadCount } = useNotification()

    // Charge les conversations, calcule le total non lu, puis s'abonne en temps réel
    useEffect(() => {
        if (!user) return
        let echoRef: Awaited<ReturnType<typeof import("@/src/lib/echo").getEcho>> | null = null
        const subscribedIds: string[] = []

        getConversations()
            .then(async res => {
                const convs = res.data?.conversations ?? []
                const total = convs.reduce((sum, c) => sum + (c.unread_count ?? 0), 0)
                setUnreadMessages(total)

                // Abonnement sur le canal user.{id} pour détecter TOUS les nouveaux messages
                // (conversations existantes ET nouvelles), sans double-comptage par conversation
                const { getEcho } = await import("@/src/lib/echo")
                echoRef = await getEcho()
                subscribedIds.push(`user.${user.id}`)
                echoRef!
                    .private(`user.${user.id}`)
                    .listen(".message.sent", (e: { message: { sender_id: string } }) => {
                        if (e.message.sender_id !== user.id) {
                            setUnreadMessages(prev => prev + 1)
                        }
                    })
            })
            .catch(() => { })

        return () => {
            if (echoRef) {
                subscribedIds.forEach(channel => echoRef!.leave(channel))
            }
        }
    }, [user?.id])

    const isAutoEcole = user?.role === "auto_ecole"
    const roleLabel = isAutoEcole ? "Auto-école" : "Concessionnaire"
    const router = useRouter()
    const handleLogout = async () => {
        await api.logout()
        router.push("/auth")
    }
    return (
        <>
            <SidebarProvider>
                <Sidebar collapsible="icon">
                    <SidebarHeader>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton size="lg" asChild>
                                    <Link href="/partenaire/dashboard">
                                        <Image src="/logo.svg" alt="Move CI" width={52} height={30} />
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarHeader>

                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {navItems.map((item) => (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={pathname === item.href}
                                                tooltip={item.label}
                                            >
                                                <Link href={item.href}>
                                                    <item.icon />
                                                    <span>{item.label}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        <SidebarGroup>
                            <SidebarGroupLabel>Accès rapide</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild tooltip="Accueil site">
                                            <Link href="/">
                                                <Home />
                                                <span>Accueil site</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarFooter>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton size="lg">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-500">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col gap-0.5 leading-none">
                                        <span className="text-sm font-medium truncate">{user?.fullname ?? "Partenaire"}</span>
                                        <span className="text-xs text-muted-foreground">{roleLabel}</span>
                                    </div>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={handleLogout}>
                                    <LogOut />
                                    <span>Déconnexion</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarFooter>

                    <SidebarRail />
                </Sidebar>

                <SidebarInset>
                    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <span className="text-sm font-medium text-muted-foreground">
                            Dashboard
                        </span>
                        <div className="ml-auto flex items-center gap-4">
                            <Link href="/partenaire/messages" className="relative text-muted-foreground hover:text-foreground transition-colors">
                                <MessageSquare className="h-5 w-5" />
                                {displayedUnreadMessages > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {displayedUnreadMessages  > 9 ? "9+" : displayedUnreadMessages }
                                    </span>
                                )}
                            </Link>
                            <Link href="/partenaire/notifications" className="relative text-muted-foreground hover:text-foreground transition-colors">
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </Link>
                            <span className="text-sm font-medium text-muted-foreground">
                                Espace Partenaire
                            </span>
                        </div>
                    </header>
                    <main className={isMessagesPage ? "flex-1 flex flex-col overflow-hidden" : "flex-1 overflow-auto p-4 md:p-6"}>
                        {children}
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </>
    )
}
