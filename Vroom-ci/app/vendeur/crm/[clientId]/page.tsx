"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    ArrowLeft, Phone, Mail, MapPin, Calendar, CircleDollarSign,
    StickyNote, Pencil, Trash2, Plus, Car, CheckCircle2, Tag, Key,
    TrendingUp, Clock,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/src/lib/utils"
import { CrmClientDetail, CrmNote } from "@/src/types"
import { getCrmClientDetail, addNote, updateNote, deleteNote } from "@/src/actions/crm.actions"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? ""

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rdvStatutBadge: Record<string, string> = {
    en_attente: "bg-amber-100 text-amber-700",
    confirmé:   "bg-blue-100 text-blue-700",
    terminé:    "bg-emerald-100 text-emerald-700",
    annulé:     "bg-zinc-100 text-zinc-500",
    refusé:     "bg-red-100 text-red-600",
}

function getActivityBadge(date: string | null): { dot: string; label: string; labelClass: string } {
    if (!date) return { dot: "bg-zinc-300", label: "Jamais", labelClass: "text-zinc-400" }
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
    if (days < 7)  return { dot: "bg-emerald-500", label: `Il y a ${days}j`, labelClass: "text-emerald-600" }
    if (days < 30) return { dot: "bg-amber-400",   label: `Il y a ${days}j`, labelClass: "text-amber-500" }
    return              { dot: "bg-red-400",        label: `Il y a ${days}j`, labelClass: "text-red-500" }
}

function formatDate(date: string | null, withTime = false) {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "short", year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    })
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = "timeline" | "notes"

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
    return (
        <div className="min-h-screen pt-16 bg-zinc-50 p-5 md:p-6 space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                    <Skeleton className="h-56 rounded-3xl" />
                    <Skeleton className="h-36 rounded-3xl" />
                </div>
                <div className="lg:col-span-2 space-y-4">
                    <Skeleton className="h-12 w-72" />
                    <Skeleton className="h-64 rounded-3xl" />
                </div>
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrmClientPage() {
    const { clientId } = useParams<{ clientId: string }>()
    const [detail, setDetail]     = useState<CrmClientDetail | null>(null)
    const [loading, setLoading]   = useState(true)
    const [tab, setTab]           = useState<TabKey>("timeline")
    const [noteText, setNoteText] = useState("")
    const [editNote, setEditNote] = useState<CrmNote | null>(null)
    const [editText, setEditText] = useState("")
    const [saving, setSaving]     = useState(false)

    useEffect(() => {
        getCrmClientDetail(clientId)
            .then(res => setDetail(res?.data ?? null))
            .catch(() => toast.error("Erreur de chargement"))
            .finally(() => setLoading(false))
    }, [clientId])

    const handleAddNote = async () => {
        if (!noteText.trim()) return
        setSaving(true)
        try {
            const res = await addNote(clientId, noteText.trim())
            setDetail(prev => prev ? { ...prev, notes: [res.data!, ...prev.notes] } : prev)
            setNoteText("")
            toast.success("Note ajoutée")
        } catch {
            toast.error("Erreur lors de l'ajout")
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateNote = async () => {
        if (!editNote || !editText.trim()) return
        setSaving(true)
        try {
            const res = await updateNote(editNote.id, editText.trim())
            setDetail(prev => prev ? {
                ...prev,
                notes: prev.notes.map(n => n.id === editNote.id ? res.data! : n),
            } : prev)
            setEditNote(null)
            toast.success("Note mise à jour")
        } catch {
            toast.error("Erreur lors de la mise à jour")
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteNote = async (noteId: string) => {
        try {
            await deleteNote(noteId)
            setDetail(prev => prev ? { ...prev, notes: prev.notes.filter(n => n.id !== noteId) } : prev)
            toast.success("Note supprimée")
        } catch {
            toast.error("Erreur lors de la suppression")
        }
    }

    if (loading) return <PageSkeleton />
    if (!detail) return null

    const { client, rdvs, transactions, notes, stats } = detail
    const activity = getActivityBadge(client.derniere_interaction)

    type TimelineEntry =
        | { kind: "rdv";         date: string; data: typeof rdvs[0] }
        | { kind: "transaction"; date: string; data: typeof transactions[0] }

    const timeline: TimelineEntry[] = [
        ...rdvs.map(r => ({ kind: "rdv" as const,         date: r.date_heure,  data: r })),
        ...transactions.map(t => ({ kind: "transaction" as const, date: t.created_at, data: t })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
        <div className="min-h-screen pt-16 bg-zinc-50">
            <div className="p-5 md:p-6 space-y-6">

                {/* Retour */}
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-zinc-100">
                        <Link href="/vendeur/crm"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <Link href="/vendeur/crm" className="hover:text-zinc-900 transition-colors font-medium">Suivi clients</Link>
                    <span className="text-zinc-300">/</span>
                    <span className="text-zinc-900 font-black">{client.fullname}</span>
                </div>

                {/* Layout 2 colonnes */}
                <div className="grid lg:grid-cols-3 gap-6 items-start">

                    {/* ══════════ COLONNE GAUCHE ══════════ */}
                    <div className="space-y-4">

                        {/* Identité */}
                        <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
                            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                                <div className="relative">
                                    <Avatar className="h-20 w-20 ring-4 ring-zinc-100">
                                        <AvatarImage src={client.avatar ? `${BACKEND_URL}/storage/${client.avatar}` : undefined} />
                                        <AvatarFallback className="text-2xl font-black bg-zinc-100 text-zinc-600">
                                            {client.fullname.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className={cn("absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white", activity.dot)} />
                                </div>
                                <div>
                                    <h1 className="text-lg font-black text-zinc-900">{client.fullname}</h1>
                                    <p className={cn("text-sm font-semibold mt-1", activity.labelClass)}>
                                        {activity.label}
                                    </p>
                                </div>
                                <div className="flex gap-2 w-full">
                                    {client.telephone && (
                                        <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5 rounded-xl cursor-pointer border-zinc-200">
                                            <a href={`tel:${client.telephone}`}>
                                                <Phone className="h-3.5 w-3.5" /> Appeler
                                            </a>
                                        </Button>
                                    )}
                                    <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5 rounded-xl cursor-pointer border-zinc-200">
                                        <a href={`mailto:${client.email}`}>
                                            <Mail className="h-3.5 w-3.5" /> Email
                                        </a>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Coordonnées */}
                        <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
                            <CardContent className="p-6 space-y-3">
                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Coordonnées</p>
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                        <span className="truncate text-zinc-600">{client.email}</span>
                                    </div>
                                    {client.telephone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                            <span className="text-zinc-600">{client.telephone}</span>
                                        </div>
                                    )}
                                    {client.adresse && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                            <span className="text-zinc-600">{client.adresse}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stats */}
                        <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
                            <CardContent className="p-6 space-y-3">
                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Statistiques</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: "RDV total",    value: stats.nb_rdv,          icon: Calendar,        iconBg: "bg-blue-100",    iconColor: "text-blue-600" },
                                        { label: "Confirmés",    value: stats.nb_confirmes,    icon: CheckCircle2,    iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
                                        { label: "Transactions", value: stats.nb_transactions, icon: Tag,             iconBg: "bg-amber-100",   iconColor: "text-amber-600" },
                                        {
                                            label: "CA",
                                            value: stats.chiffre_affaires > 0
                                                ? `${(Number(stats.chiffre_affaires) / 1_000_000).toFixed(1)}M F`
                                                : "—",
                                            icon: CircleDollarSign,
                                            iconBg: "bg-move-gold/10",
                                            iconColor: "text-move-gold",
                                        },
                                    ].map((s, i) => (
                                        <div key={i} className="p-3 rounded-2xl border border-zinc-100 bg-zinc-50 space-y-2">
                                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", s.iconBg)}>
                                                <s.icon className={cn("h-4 w-4", s.iconColor)} />
                                            </div>
                                            <p className="text-xl font-black text-zinc-900">{s.value}</p>
                                            <p className="text-xs text-zinc-400 uppercase tracking-wide">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ══════════ COLONNE DROITE ══════════ */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Tabs (gold underline) */}
                        <div className="flex items-center gap-1 border-b border-zinc-200">
                            {([
                                { key: "timeline" as const, label: `Timeline (${timeline.length})` },
                                { key: "notes"    as const, label: `Notes (${notes.length})` },
                            ] as { key: TabKey; label: string }[]).map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setTab(t.key)}
                                    className={cn(
                                        "px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap",
                                        tab === t.key
                                            ? "border-move-gold text-move-gold"
                                            : "border-transparent text-zinc-500 hover:text-zinc-800"
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* ── Timeline ── */}
                        {tab === "timeline" && (
                            <div>
                                {timeline.length === 0 ? (
                                    <div className="flex flex-col items-center py-20 gap-3 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
                                            <Clock className="h-8 w-8 text-zinc-300" />
                                        </div>
                                        <p className="text-sm font-semibold text-zinc-500">Aucune activité enregistrée</p>
                                    </div>
                                ) : (
                                    <div className="relative space-y-0">
                                        <div className="absolute left-4 top-5 bottom-5 w-px bg-zinc-200" />
                                        {timeline.map(entry => {
                                            if (entry.kind === "rdv") {
                                                const rdv = entry.data
                                                return (
                                                    <div key={`rdv-${rdv.id}`} className="flex gap-4 pb-4">
                                                        <div className="relative z-10 h-8 w-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                                                            <Calendar className="h-3.5 w-3.5 text-blue-600" />
                                                        </div>
                                                        <Card className="flex-1 rounded-2xl border border-zinc-200 bg-white shadow-sm">
                                                            <CardContent className="p-4 flex items-start justify-between gap-3">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <Car className="h-3.5 w-3.5 text-zinc-400" />
                                                                        <span className="text-sm font-bold text-zinc-900">
                                                                            {rdv.vehicule?.description?.marque} {rdv.vehicule?.description?.modele}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-zinc-400">
                                                                        {formatDate(rdv.date_heure, true)}
                                                                        {rdv.lieu && ` — ${rdv.lieu}`}
                                                                    </p>
                                                                    {rdv.type && (
                                                                        <p className="text-xs text-zinc-400 capitalize">{rdv.type.replace("_", " ")}</p>
                                                                    )}
                                                                </div>
                                                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", rdvStatutBadge[rdv.statut] ?? "bg-zinc-100 text-zinc-500")}>
                                                                    {rdv.statut}
                                                                </span>
                                                            </CardContent>
                                                        </Card>
                                                    </div>
                                                )
                                            }

                                            const tx = entry.data
                                            return (
                                                <div key={`tx-${tx.id}`} className="flex gap-4 pb-4">
                                                    <div className="relative z-10 h-8 w-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                                                        {tx.type === "vente"
                                                            ? <Tag className="h-3.5 w-3.5 text-emerald-600" />
                                                            : <Key className="h-3.5 w-3.5 text-emerald-600" />
                                                        }
                                                    </div>
                                                    <Card className="flex-1 rounded-2xl border border-zinc-200 bg-white shadow-sm">
                                                        <CardContent className="p-4 flex items-start justify-between gap-3">
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-bold text-zinc-900">
                                                                    {tx.vehicule?.description?.marque} {tx.vehicule?.description?.modele}
                                                                </p>
                                                                {tx.prix_final && (
                                                                    <p className="text-sm font-black text-move-gold flex items-center gap-1">
                                                                        <CircleDollarSign className="h-3.5 w-3.5" />
                                                                        {Number(tx.prix_final).toLocaleString("fr-FR")} FCFA
                                                                    </p>
                                                                )}
                                                                <p className="text-xs text-zinc-400">{formatDate(tx.created_at)}</p>
                                                            </div>
                                                            <span className={cn(
                                                                "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                                                                tx.statut === "confirmé"
                                                                    ? "bg-emerald-100 text-emerald-700"
                                                                    : "bg-amber-100 text-amber-600"
                                                            )}>
                                                                {tx.statut}
                                                            </span>
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Notes ── */}
                        {tab === "notes" && (
                            <div className="space-y-4">
                                {/* Ajouter une note */}
                                <Card className="rounded-2xl border border-dashed border-zinc-300 bg-white">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Plus className="h-4 w-4 text-zinc-400" />
                                            <p className="text-sm font-semibold text-zinc-700">Nouvelle note privée</p>
                                        </div>
                                        <Textarea
                                            placeholder="Ex : Intéressé par un SUV, budget 15M FCFA. Rappeler en avril…"
                                            rows={3}
                                            value={noteText}
                                            onChange={e => setNoteText(e.target.value)}
                                            className="resize-none rounded-xl border-zinc-200"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={handleAddNote}
                                            disabled={saving || !noteText.trim()}
                                            className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer"
                                        >
                                            {saving ? "Enregistrement…" : "Ajouter la note"}
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Liste des notes */}
                                {notes.length === 0 ? (
                                    <div className="flex flex-col items-center py-16 gap-3 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
                                            <StickyNote className="h-8 w-8 text-zinc-300" />
                                        </div>
                                        <p className="text-sm font-semibold text-zinc-500">Aucune note — ajoutez votre première !</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {notes.map(note => (
                                            <Card key={note.id} className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
                                                <CardContent className="p-4 space-y-3">
                                                    {editNote?.id === note.id ? (
                                                        <div className="space-y-3">
                                                            <Textarea
                                                                rows={3}
                                                                value={editText}
                                                                onChange={e => setEditText(e.target.value)}
                                                                className="resize-none rounded-xl border-zinc-200"
                                                                autoFocus
                                                            />
                                                            <div className="flex gap-2">
                                                                <Button size="sm" onClick={handleUpdateNote} disabled={saving}
                                                                    className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer">
                                                                    {saving ? "Sauvegarde…" : "Enregistrer"}
                                                                </Button>
                                                                <Button size="sm" variant="ghost" onClick={() => setEditNote(null)}
                                                                    className="rounded-xl cursor-pointer">
                                                                    Annuler
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-start justify-between gap-2">
                                                                <p className="text-sm text-zinc-800 flex-1 whitespace-pre-wrap leading-relaxed">
                                                                    {note.contenu}
                                                                </p>
                                                                <div className="flex gap-1 shrink-0">
                                                                    <button
                                                                        onClick={() => { setEditNote(note); setEditText(note.contenu) }}
                                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <button className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent className="rounded-2xl">
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>Supprimer la note ?</AlertDialogTitle>
                                                                                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel className="rounded-xl cursor-pointer">Annuler</AlertDialogCancel>
                                                                                <AlertDialogAction
                                                                                    onClick={() => handleDeleteNote(note.id)}
                                                                                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer"
                                                                                >
                                                                                    Supprimer
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-100">
                                                                <StickyNote className="h-3 w-3 text-zinc-300" />
                                                                <p className="text-xs text-zinc-400">
                                                                    {formatDate(note.created_at, true)}
                                                                    {note.updated_at !== note.created_at && " · modifié"}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
