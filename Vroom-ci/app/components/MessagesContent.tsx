"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, Send, Car, ArrowLeft, Loader2, Trash2 } from "lucide-react"
import { useUser } from "@/src/context/UserContext"
import {
    getConversations,
    getMessages,
    sendMessage,
    deleteMessage,
} from "@/src/actions/conversations.actions"
import type { Conversation, Message } from "@/src/types"
import { cn, getPhotoUrl } from "@/src/lib/utils"

// ─── Helpers ─────────────────────────────────────────────────────────────────


/** URL d'une photo véhicule — gère les URLs Supabase complètes et les chemins locaux */
function vehiclePhotoUrl(path?: string): string | null {
    return path ? getPhotoUrl(path) : null
}

/** Formate une date en relatif court ("il y a 5 min") */
function timeAgo(date: string) {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })
}

// ─── Sous-composant : carte de conversation dans la sidebar ──────────────────

function ConvCard({
    conv,
    selected,
    currentUserId,
    onClick,
}: {
    conv: Conversation
    selected: boolean
    currentUserId: string
    onClick: () => void
}) {
    const photo = conv.vehicule?.photos?.find(p => p.is_primary) ?? conv.vehicule?.photos?.[0]
    const photoUrl = vehiclePhotoUrl(photo?.path)
    const isMe = conv.last_message?.sender_id === currentUserId

    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b border-border/50",
                selected && "bg-primary/5 border-l-2 border-l-primary"
            )}
        >
            {/* Miniature véhicule */}
            <div className="w-12 h-12 rounded-xl bg-muted shrink-0 overflow-hidden relative">
                {photoUrl
                    ? <Image src={photoUrl} alt="véhicule" fill className="object-cover" unoptimized />
                    : <Car className="h-5 w-5 text-muted-foreground m-auto mt-3.5" />
                }
            </div>

            <div className="flex-1 min-w-0">
                {/* Nom + unread badge */}
                <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate">
                        {conv.other_participant.fullname}
                    </span>
                    {conv.unread_count > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-5 px-1.5 shrink-0">
                            {conv.unread_count}
                        </Badge>
                    )}
                </div>

                {/* Véhicule concerné */}
                <p className="text-[11px] text-muted-foreground truncate">
                    {conv.vehicule?.description?.marque} {conv.vehicule?.description?.modele}
                </p>

                {/* Aperçu dernier message */}
                {conv.last_message && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {isMe ? "Vous : " : ""}
                        {conv.last_message.content}
                    </p>
                )}
            </div>

            {/* Heure */}
            {conv.last_message_at && (
                <span className="text-[10px] text-muted-foreground shrink-0 self-start pt-0.5">
                    {timeAgo(conv.last_message_at)}
                </span>
            )}
        </button>
    )
}

// ─── Sous-composant : bulle de message ───────────────────────────────────────

function MessageBubble({
    msg,
    isMe,
    onDelete,
}: {
    msg: Message
    isMe: boolean
    onDelete?: () => void
}) {
    const [confirmOpen, setConfirmOpen] = useState(false)

    return (
        <>
            <div className={cn("group flex items-center gap-2 max-w-[80%]", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
                <div
                    className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm leading-relaxed wrap-break-word",
                        isMe
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                    )}
                >
                    {msg.content}
                </div>

                {/* Bouton suppression — visible au hover, uniquement sur mes messages */}
                {isMe && onDelete && (
                    <button
                        onClick={() => setConfirmOpen(true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-50 text-muted-foreground hover:text-red-600 shrink-0"
                        title="Supprimer ce message"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Le message sera définitivement supprimé.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 text-white hover:bg-red-700"
                            onClick={() => { setConfirmOpen(false); onDelete?.() }}
                        >
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function MessagesContent() {
    const { user } = useUser()
    const router = useRouter()
    const searchParams = useSearchParams()

    const [conversations, setConversations]         = useState<Conversation[]>([])
    const [selectedConvId, setSelectedConvId]       = useState<string | null>(null)
    const [messages, setMessages]                   = useState<Message[]>([])
    const [loadingConvs, setLoadingConvs]           = useState(true)
    const [loadingMsgs, setLoadingMsgs]             = useState(false)
    const [sending, setSending]                     = useState(false)
    const [draft, setDraft]                         = useState("")

    const messagesEndRef = useRef<HTMLDivElement>(null)
    // Set des IDs de messages déjà en state — synchrone, immunisé contre le batching React
    const messageIds = useRef<Set<string>>(new Set())

    const selectedConv = conversations.find(c => c.id === selectedConvId) ?? null

    // ── Chargement des conversations ─────────────────────────────────────────
    const loadConversations = useCallback(async () => {
        try {
            const res = await getConversations()
            const convs = (res as unknown as { conversations: Conversation[] })?.conversations ?? []
            setConversations(convs)
        } catch {
            toast.error("Impossible de charger les conversations")
        } finally {
            setLoadingConvs(false)
        }
    }, [])

    useEffect(() => { loadConversations() }, [loadConversations])

    // ── Ouvre la conversation passée en ?conv= dans l'URL ───────────────────
    useEffect(() => {
        const convId = searchParams.get("conv")
        if (convId) setSelectedConvId(convId)
    }, [searchParams])

    // ── Chargement des messages de la conversation sélectionnée ─────────────
    useEffect(() => {
        if (!selectedConvId) return
        setLoadingMsgs(true)
        setMessages([])

        getMessages(selectedConvId)
            .then(res => {
                const msgs = (res as unknown as { messages: Message[] })?.messages ?? []
                messageIds.current = new Set(msgs.map(m => m.id))
                setMessages(msgs)
                setConversations(prev =>
                    prev.map(c => c.id === selectedConvId ? { ...c, unread_count: 0 } : c)
                )
            })
            .catch(() => toast.error("Impossible de charger les messages"))
            .finally(() => setLoadingMsgs(false))
    }, [selectedConvId])

    // ── Scroll automatique vers le bas après nouveaux messages ───────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // ── Abonnement Echo/Reverb pour les messages en temps réel ──────────────
    useEffect(() => {
        if (!selectedConvId) return

        let echoRef: Awaited<ReturnType<typeof import("@/src/lib/echo").getEcho>> | null = null

        async function subscribe() {
            try {
                const { getEcho } = await import("@/src/lib/echo")
                echoRef = await getEcho()

                // Canal privé : seuls les deux participants peuvent s'abonner (vérifié côté backend)
                echoRef
                    .private(`conversation.${selectedConvId}`)
                    .listen(".message.sent", (e: { message: Message }) => {
                        // Le Set ref est synchrone : pas de stale state, pas de doublon possible
                        if (messageIds.current.has(e.message.id)) return
                        messageIds.current.add(e.message.id)
                        setMessages(prev => [...prev, e.message])
                        // Met à jour l'aperçu dans la sidebar
                        setConversations(prev =>
                            prev.map(c =>
                                c.id === selectedConvId
                                    ? { ...c, last_message: e.message, last_message_at: e.message.created_at }
                                    : c
                            )
                        )
                    })
                    .listen(".message.deleted", (e: { message_id: string }) => {
                        messageIds.current.delete(e.message_id)
                        setMessages(prev => prev.filter(m => m.id !== e.message_id))
                    })
            } catch {
                // Reverb indisponible — dégradé silencieux, les messages s'affichent au rechargement
            }
        }

        subscribe()

        return () => {
            echoRef?.leave(`conversation.${selectedConvId}`)
        }
    }, [selectedConvId])

    // ── Envoi d'un message ───────────────────────────────────────────────────
    const handleSend = async () => {
        const content = draft.trim()
        if (!content || !selectedConvId || sending) return

        setSending(true)
        setDraft("")

        try {
            const res = await sendMessage(selectedConvId, content)
            const newMsg = (res as unknown as { message: Message })?.message
            // Le WebSocket peut avoir déjà ajouté ce message avant que la réponse API revienne.
            // On vérifie le Set pour éviter le doublon.
            if (newMsg && !messageIds.current.has(newMsg.id)) {
                messageIds.current.add(newMsg.id)
                setMessages(prev => [...prev, newMsg])
                setConversations(prev =>
                    prev.map(c =>
                        c.id === selectedConvId
                            ? { ...c, last_message: newMsg, last_message_at: newMsg.created_at }
                            : c
                    )
                )
            }
        } catch {
            toast.error("Impossible d'envoyer le message")
            setDraft(content) // Restaure le brouillon en cas d'erreur
        } finally {
            setSending(false)
        }
    }

    // ── Suppression d'un message ─────────────────────────────────────────────
    const handleDeleteMessage = async (messageId: string) => {
        if (!selectedConvId) return
        try {
            await deleteMessage(selectedConvId, messageId)
            messageIds.current.delete(messageId)
            setMessages(prev => prev.filter(m => m.id !== messageId))
        } catch {
            toast.error("Impossible de supprimer le message")
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // ── Rendu ────────────────────────────────────────────────────────────────

    if (!user) return null

    return (
        <div className="flex h-full bg-background overflow-hidden">

            {/* ── Sidebar conversations ─────────────────────────────────── */}
            <aside className={cn(
                "flex flex-col border-r border-border w-full md:w-80 shrink-0",
                selectedConvId ? "hidden md:flex" : "flex"
            )}>
                <div className="px-4 py-3 border-b border-border">
                    <h2 className="font-bold text-base">Messages</h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingConvs ? (
                        <div className="space-y-3 p-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-3">
                                    <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                                    <div className="flex-1 space-y-1.5 pt-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-48" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-16 px-6 text-center">
                            <MessageSquare className="h-10 w-10 opacity-20" />
                            <p className="text-sm">Aucune conversation</p>
                            <p className="text-xs">Contactez un vendeur depuis la page d&apos;un véhicule pour démarrer une discussion.</p>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <ConvCard
                                key={conv.id}
                                conv={conv}
                                selected={conv.id === selectedConvId}
                                currentUserId={user.id}
                                onClick={() => {
                                    setSelectedConvId(conv.id)
                                    router.replace(`?conv=${conv.id}`, { scroll: false })
                                }}
                            />
                        ))
                    )}
                </div>
            </aside>

            {/* ── Zone chat ────────────────────────────────────────────── */}
            <section className={cn(
                "flex-1 flex flex-col min-w-0",
                !selectedConvId ? "hidden md:flex" : "flex"
            )}>
                {!selectedConv ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 opacity-20" />
                        <p className="text-sm">Sélectionnez une conversation</p>
                    </div>
                ) : (
                    <>
                        {/* Header de la conversation — cliquable vers le profil de l'autre participant */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
                            {/* Retour mobile */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden shrink-0"
                                onClick={() => {
                                    setSelectedConvId(null)
                                    router.replace("?", { scroll: false })
                                }}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>

                            {/* Bloc cliquable — redirige vers le profil de l'autre participant */}
                            <button
                                onClick={() => router.push(`/profil/${selectedConv.other_participant.id}`)}
                                className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity cursor-pointer"
                            >
                                {/* Avatar du participant */}
                                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden relative shrink-0">
                                    {selectedConv.other_participant.avatar
                                        ? <Image src={selectedConv.other_participant.avatar} alt="avatar" fill className="object-cover" unoptimized />
                                        : <span className="flex items-center justify-center h-full text-sm font-semibold text-muted-foreground">
                                            {selectedConv.other_participant.fullname.charAt(0).toUpperCase()}
                                        </span>
                                    }
                                </div>

                                <div className="min-w-0">
                                    <p className="font-semibold text-sm truncate">
                                        {selectedConv.other_participant.fullname}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate capitalize">
                                        {selectedConv.other_participant.role}
                                    </p>
                                </div>
                            </button>
                        </div>

                        {/* Bannière véhicule — contexte de la conversation, cliquable vers l'annonce */}
                        {selectedConv.vehicule && (() => {
                            const photo = selectedConv.vehicule.photos?.find(p => p.is_primary) ?? selectedConv.vehicule.photos?.[0]
                            const url = vehiclePhotoUrl(photo?.path)
                            return (
                                <a
                                    href={`/vehicles/${selectedConv.vehicule.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 border-b border-border hover:bg-muted/70 transition-colors shrink-0"
                                >
                                    <div className="w-14 h-10 rounded-lg bg-muted overflow-hidden relative shrink-0">
                                        {url
                                            ? <Image src={url} alt="véhicule" fill className="object-cover" unoptimized />
                                            : <Car className="h-4 w-4 text-muted-foreground m-auto mt-3" />
                                        }
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">
                                            {selectedConv.vehicule.description?.marque} {selectedConv.vehicule.description?.modele}
                                        </p>
                                        {selectedConv.vehicule.prix && (
                                            <p className="text-xs text-primary font-semibold">
                                                {selectedConv.vehicule.prix.toLocaleString("fr-FR")} FCFA
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground shrink-0">Voir l'annonce →</span>
                                </a>
                            )
                        })()}

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                            {loadingMsgs ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                                    <MessageSquare className="h-8 w-8 opacity-20" />
                                    <p className="text-sm">Démarrez la conversation</p>
                                </div>
                            ) : (
                                messages.map(msg => (
                                    <MessageBubble
                                        key={msg.id}
                                        msg={msg}
                                        isMe={msg.sender_id === user.id}
                                        onDelete={msg.sender_id === user.id ? () => handleDeleteMessage(msg.id) : undefined}
                                    />
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input envoi */}
                        <div className="px-4 py-3 border-t border-border shrink-0">
                            <div className="flex gap-2">
                                <Input
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Votre message..."
                                    className="rounded-xl flex-1"
                                    disabled={sending}
                                    maxLength={2000}
                                />
                                <Button
                                    onClick={handleSend}
                                    disabled={!draft.trim() || sending}
                                    className="rounded-xl shrink-0 cursor-pointer"
                                    size="icon"
                                >
                                    {sending
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Send className="h-4 w-4" />
                                    }
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    )
}
