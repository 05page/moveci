"use client"
import React from "react"
import { motion } from "motion/react"
import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { api } from "@/src/lib/api"
import type { vehicule } from "@/src/types"
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Building2,
    CalendarCheck,
    CalendarDays,
    Camera,
    Car,
    ChevronLeft,
    ChevronRight,
    Clock,
    Eye,
    Fuel,
    GraduationCap,
    HandCoins,
    Handshake,
    HeartHandshake,
    KeyRound,
    MapPin,
    MessageCircle,
    PlusCircle,
    Search,
    Shield,
    ShieldCheck,
    Star,
    Store,
    TrendingUp,
    Trophy,
    UserPlus,
    Users,
    Warehouse,
} from "lucide-react"
import { DevenirPartenaire } from "../components/DevenirPartenaire"

import { cn, getPhotoUrl } from "@/src/lib/utils"

/* ── DATA ── */
type ProfileKey = "client" | "vendeur" | "concessionnaire" | "auto_ecole"

const HOW_IT_WORKS: Record<ProfileKey, { icon: React.ElementType; title: string; desc: string; tip: string }[]> = {
    client: [
        { icon: UserPlus, title: "Créez votre compte", desc: "Inscrivez-vous gratuitement en tant que client en quelques secondes.", tip: "Gratuit & rapide" },
        { icon: Search, title: "Explorez le catalogue", desc: "Parcourez des centaines de véhicules vérifiés. Filtrez par marque, prix, type ou localisation.", tip: "Filtres avancés" },
        { icon: MessageCircle, title: "Contactez le vendeur", desc: "Échangez directement avec le vendeur via notre messagerie sécurisée intégrée.", tip: "Messagerie sécurisée" },
        { icon: CalendarCheck, title: "Planifiez une visite", desc: "Prenez rendez-vous en ligne pour voir le véhicule. Le vendeur confirme directement depuis son dashboard.", tip: "RDV en ligne" },
        { icon: Handshake, title: "Finalisez en confiance", desc: "Visitez le véhicule et concluez la transaction en toute sérénité.", tip: "Transaction sécurisée" },
    ],
    vendeur: [
        { icon: UserPlus, title: "Créez votre compte vendeur", desc: "Inscrivez-vous en quelques secondes et complétez votre profil vendeur.", tip: "Gratuit" },
        { icon: Camera, title: "Publiez votre annonce", desc: "Ajoutez photos, description et prix. Notre IA vérifie automatiquement la cohérence de votre annonce.", tip: "Validation par IA" },
        { icon: MessageCircle, title: "Recevez des messages", desc: "Les acheteurs intéressés vous contactent directement via la messagerie. Notifications en temps réel.", tip: "Temps réel" },
        { icon: CalendarCheck, title: "Gérez vos rendez-vous", desc: "Confirmez ou refusez les demandes de visite depuis votre tableau de bord.", tip: "Dashboard dédié" },
        { icon: Handshake, title: "Concluez la vente", desc: "Finalisez la transaction et marquez votre véhicule comme vendu. Vos statistiques se mettent à jour automatiquement.", tip: "Suivi automatique" },
    ],
    concessionnaire: [
        { icon: Building2, title: "Créez votre compte pro", desc: "Inscrivez-vous avec votre RCCM. Notre équipe valide votre compte professionnel sous 24-48h.", tip: "Validation sous 48h" },
        { icon: Warehouse, title: "Accédez à votre garage", desc: "Gérez l'intégralité de votre stock depuis votre espace concessionnaire dédié.", tip: "Stock centralisé" },
        { icon: PlusCircle, title: "Publiez vos véhicules", desc: "Ajoutez autant de véhicules que vous souhaitez — neuf ou occasion, vente ou location.", tip: "Illimité" },
        { icon: CalendarCheck, title: "Gérez vos rendez-vous", desc: "Centralisez toutes les demandes de visite et organisez votre agenda client depuis un seul endroit.", tip: "Agenda centralisé" },
        { icon: BarChart3, title: "Analysez vos performances", desc: "Suivez vos ventes, vues, revenus et tendances marché depuis votre tableau de bord en temps réel.", tip: "Stats en temps réel" },
    ],
    auto_ecole: [
        { icon: GraduationCap, title: "Créez votre compte auto-école", desc: "Inscrivez-vous avec votre numéro d'agrément. Notre équipe valide votre compte sous 24-48h.", tip: "Validation sous 48h" },
        { icon: BookOpen, title: "Créez vos formations", desc: "Publiez vos formations permis avec programme, tarifs et nombre de places disponibles.", tip: "Flexible" },
        { icon: Users, title: "Gérez les inscriptions", desc: "Suivez vos élèves inscrits, consultez leurs profils et gérez leurs dossiers individuellement.", tip: "Suivi individuel" },
        { icon: CalendarDays, title: "Planifiez les examens", desc: "Organisez les dates d'examens pour vos élèves et envoyez des rappels automatiques.", tip: "Agenda intégré" },
        { icon: Trophy, title: "Suivez les résultats", desc: "Enregistrez les résultats d'examen et consultez votre taux de réussite global par formation.", tip: "Taux de réussite" },
    ],
}

const PROFILES: { id: ProfileKey; label: string; icon: React.ElementType }[] = [
    { id: "client", label: "Client", icon: Users },
    { id: "vendeur", label: "Vendeur", icon: Store },
    { id: "concessionnaire", label: "Concessionnaire", icon: Building2 },
    { id: "auto_ecole", label: "Auto-école", icon: GraduationCap },
]

const temoignages = [
    { name: "Kouame Ange", role: "Acheteur", text: "J'ai trouvé ma Toyota RAV4 en moins d'une semaine. Le processus était simple et le vendeur très professionnel.", rating: 5 },
    { name: "Diallo Ibrahim", role: "Vendeur", text: "J'ai vendu ma Mercedes en 3 jours grâce à Move. Les acheteurs sont sérieux et la plateforme très bien faite.", rating: 5 },
    { name: "Traoré Aminata", role: "Locataire", text: "La location est super pratique. J'ai loué un SUV pour un weekend et tout était parfait. Prix correct, véhicule impeccable.", rating: 5 },
]

const features = [
    { icon: ShieldCheck, title: "Véhicules vérifiés", desc: "Chaque véhicule est inspecté avant publication. Historique, état mécanique, documents — tout est contrôlé." },
    { icon: HeartHandshake, title: "Transactions sécurisées", desc: "Notre plateforme garantit des échanges en toute sécurité. Messagerie intégrée, rendez-vous organisés." },
    { icon: Car, title: "Rapide et simple", desc: "Publiez ou trouvez un véhicule en quelques clics. Interface intuitive, filtres intelligents, temps réel." },
]

const metrics = [
    { icon: Shield, value: "100%", label: "Sécurisé" },
    { icon: Clock, value: "24/7", label: "Support" },
    { icon: Users, value: "2k+", label: "Utilisateurs" },
    { icon: Star, value: "4.9", label: "Note moyenne" },
]

export default function LandingPage() {
    const [partenaireDialog, setPartenaireDialog] = useState(false)
    const [selectedProfile, setSelectedProfile] = useState<ProfileKey>("client")
    const [carouselIndex, setCarouselIndex] = useState(0)
    const [popularVehicles, setPopularVehicles] = useState<vehicule[]>([])
    const [loadingPopular, setLoadingPopular] = useState(true)

    useEffect(() => {
        api.get<vehicule[]>('/vehicules/populaires')
            .then(res => { if (res.success && Array.isArray(res.data)) setPopularVehicles(res.data) })
            .catch(() => { })
            .finally(() => setLoadingPopular(false))
    }, [])

    return (
        <div className="min-h-screen bg-white">

            <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14">
                <div className="absolute inset-0 bg-dot-grid" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-5%,oklch(0.68_0.17_72/0.07),transparent)]" />
                <div className="absolute -top-32 -right-32 w-125 h-125 bg-[radial-gradient(circle,oklch(0.68_0.17_72/0.08),transparent_70%)] pointer-events-none" />
                <div className="absolute -bottom-32 -left-32 w-100 h-100 bg-[radial-gradient(circle,oklch(0.55_0.16_225/0.05),transparent_70%)] pointer-events-none" />

                <div className="relative z-10 w-full max-w-3xl mx-auto px-6 text-center">
                    <h1
                        className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-none mb-6 text-zinc-900 animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-[both]"
                        style={{ fontFamily: "var(--font-syne, sans-serif)", animationDelay: '120ms' }}
                    >
                        Trouvez votre
                        <br />
                        <span className="text-gradient-gold">véhicule idéal</span>
                    </h1>
                    <p
                        className="text-base md:text-lg text-zinc-500 max-w-md mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-[both]"
                        style={{ animationDelay: '280ms' }}
                    >
                        Achetez, louez ou vendez votre voiture en toute confiance.
                        Des centaines de véhicules vérifiés vous attendent sur Move.
                    </p>
                    <div
                        className="flex flex-wrap items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-[both]"
                        style={{ animationDelay: '420ms' }}
                    >
                        <Link href="/vehicles">
                            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-move-gold text-white font-semibold text-sm hover:bg-[oklch(0.72_0.175_83)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-move-gold/30 hover:shadow-lg cursor-pointer"
                                style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                                Explorer les véhicules
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </Link>
                        <Link href="/auth">
                            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-200 text-zinc-600 font-medium text-sm hover:border-zinc-300 hover:text-zinc-900 hover:bg-zinc-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer">
                                Devenir vendeur
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </Link>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-white to-transparent" />
            </section>

            {/* ══════════════════════════════
                SERVICES
            ══════════════════════════════ */}
            <section className="py-24 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-zinc-100" />
                        <span className="text-xs font-bold text-move-gold uppercase tracking-widest">Nos services</span>
                        <div className="h-px flex-1 bg-zinc-100" />
                    </div>
                    <h2 className="text-2xl md:text-4xl font-extrabold text-center text-zinc-900 tracking-tight mb-3 max-w-2xl mx-auto"
                        style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                        Une plateforme,{" "}
                        <span className="text-gradient-gold">toutes les solutions</span>
                    </h2>
                    <p className="text-center text-zinc-500 mb-16 max-w-md mx-auto text-sm leading-relaxed">
                        Que vous cherchiez à acheter, louer ou vendre, Move vous simplifie la vie.
                    </p>

                    <div className="grid md:grid-cols-3 gap-5">
                        {/* Acheter */}
                        <motion.div
                            className="group relative rounded-2xl border border-zinc-200 bg-white p-8 hover:border-move-gold/30 hover:shadow-lg hover:shadow-move-gold/10 transition-all duration-300 cursor-pointer"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <div className="w-12 h-12 rounded-xl bg-move-gold/10 border border-move-gold/20 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200">
                                <Car className="h-6 w-6 text-move-gold" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 mb-3" style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                                Acheter
                            </h3>
                            <p className="text-sm text-zinc-500 leading-relaxed mb-6">
                                Parcourez des centaines de véhicules vérifiés. Comparez les prix, consultez les détails et trouvez la voiture parfaite.
                            </p>
                            <Link href="/vehicles" className="inline-flex items-center gap-1.5 text-sm font-semibold text-move-gold group-hover:gap-3 transition-all duration-200">
                                Explorer les véhicules <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </motion.div>

                        {/* Louer */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="group relative rounded-2xl border border-zinc-200 bg-white p-8 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all duration-300 cursor-pointer"
                        >
                            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200">
                                <KeyRound className="h-6 w-6 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 mb-3" style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                                Louer
                            </h3>
                            <p className="text-sm text-zinc-500 leading-relaxed mb-6">
                                Besoin d&apos;un véhicule temporaire ? Louez facilement pour un jour, une semaine ou un mois. Tarifs transparents.
                            </p>
                            <Link href="/vehicles" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:gap-3 transition-all duration-200">
                                Voir les locations <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </motion.div>

                        {/* Vendre */}
                        <motion.div
                            className="group relative rounded-2xl border border-zinc-200 bg-white p-8 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all duration-300 cursor-pointer"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200">
                                <HandCoins className="h-6 w-6 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 mb-3" style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                                Vendre
                            </h3>
                            <p className="text-sm text-zinc-500 leading-relaxed mb-6">
                                Publiez votre annonce en quelques minutes. Touchez des milliers d&apos;acheteurs potentiels et vendez au meilleur prix.
                            </p>
                            <Link href="/auth" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 group-hover:gap-3 transition-all duration-200">
                                Publier une annonce <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </section>

            <section className="py-24 px-6 bg-zinc-50 relative overflow-hidden">
                <div className="absolute inset-0 bg-line-grid opacity-60" />
                <div className="relative max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-zinc-200" />
                        <span className="text-xs font-bold text-move-gold uppercase tracking-widest">Comment ça marche</span>
                        <div className="h-px flex-1 bg-zinc-200" />
                    </div>
                    <h2 className="text-2xl md:text-4xl font-extrabold text-center text-zinc-900 tracking-tight mb-3 max-w-2xl mx-auto"
                        style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                        Simple, rapide, <span className="text-gradient-gold">efficace</span>
                    </h2>
                    <p className="text-center text-zinc-400 text-sm mb-10">
                        Sélectionnez votre profil pour découvrir votre expérience Move
                    </p>

                    {/* Profile selector */}
                    <div className="flex flex-wrap justify-center gap-2 mb-12">
                        {PROFILES.map((p) => {
                            const isActive = selectedProfile === p.id
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => { setSelectedProfile(p.id); setCarouselIndex(0) }}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 cursor-pointer ${isActive
                                        ? "bg-move-gold text-white border-move-gold shadow-md shadow-move-gold/20"
                                        : "bg-white text-zinc-600 border-zinc-200 hover:border-move-gold/40 hover:text-move-gold"
                                        }`}
                                >
                                    <p.icon className="h-4 w-4" />
                                    {p.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Carousel */}
                    {(() => {
                        const steps = HOW_IT_WORKS[selectedProfile]
                        const current = steps[carouselIndex]
                        const StepIcon = current.icon
                        return (
                            <div>
                                {/* Dot indicators */}
                                <div className="flex gap-1.5 justify-center mb-8">
                                    {steps.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCarouselIndex(i)}
                                            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === carouselIndex ? "w-8 bg-move-gold" : "w-4 bg-zinc-200 hover:bg-zinc-300"
                                                }`}
                                        />
                                    ))}
                                </div>

                                {/* Step card */}
                                <div className="bg-white rounded-3xl border border-zinc-200 p-8 md:p-12 shadow-sm">
                                    <div className="flex flex-col md:flex-row items-center gap-8">
                                        <div className="flex-shrink-0">
                                            <div className="relative">
                                                <div className="w-24 h-24 rounded-3xl bg-move-gold/10 border-2 border-move-gold/20 flex items-center justify-center">
                                                    <StepIcon className="h-12 w-12 text-move-gold" />
                                                </div>
                                                <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-move-gold flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-move-gold/30">
                                                    {carouselIndex + 1}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-1 text-center md:text-left">
                                            <span className="inline-block mb-3 px-3 py-1 rounded-full bg-move-gold/10 border border-move-gold/20 text-xs font-semibold text-move-gold">
                                                {current.tip}
                                            </span>
                                            <h3 className="text-2xl font-extrabold text-zinc-900 mb-3" style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                                                {current.title}
                                            </h3>
                                            <p className="text-zinc-500 leading-relaxed">{current.desc}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Navigation */}
                                <div className="flex justify-between items-center mt-6">
                                    <button
                                        onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 1))}
                                        disabled={carouselIndex === 0}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-zinc-500 text-sm font-medium hover:border-zinc-300 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                    >
                                        <ChevronLeft className="h-4 w-4" /> Précédent
                                    </button>
                                    <span className="text-xs text-zinc-400 font-medium">{carouselIndex + 1} / {steps.length}</span>
                                    <button
                                        onClick={() => setCarouselIndex(Math.min(steps.length - 1, carouselIndex + 1))}
                                        disabled={carouselIndex === steps.length - 1}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-zinc-500 text-sm font-medium hover:border-zinc-300 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                    >
                                        Suivant <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    })()}
                </div>
            </section>

            <section className="py-24 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
                        <div>
                            <span className="text-xs font-bold text-move-gold uppercase tracking-widest">Véhicules populaires</span>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight mt-2"
                                style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                                Les plus consultés
                            </h2>
                        </div>
                        <Link href="/vehicles" className="inline-flex items-center gap-1.5 mt-4 md:mt-0 text-sm font-medium text-zinc-400 hover:text-move-gold transition-colors">
                            Voir tout <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                        {loadingPopular
                            ? Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="rounded-2xl border border-zinc-200 bg-white overflow-hidden animate-pulse">
                                    <div className="h-48 bg-zinc-100" />
                                    <div className="p-5 space-y-3">
                                        <div className="h-3 bg-zinc-100 rounded w-1/3" />
                                        <div className="h-4 bg-zinc-100 rounded w-2/3" />
                                        <div className="h-3 bg-zinc-100 rounded w-1/2" />
                                    </div>
                                </div>
                            ))
                            : popularVehicles.length === 0
                                ? (
                                    <div className="col-span-3 text-center py-16 text-zinc-400 text-sm">
                                        Aucun véhicule disponible pour le moment.
                                    </div>
                                )
                                : popularVehicles.map((v) => {
                                    const photo = v.photos?.find(p => p.is_primary) ?? v.photos?.[0]
                                    const prixFormate = Number(v.prix).toLocaleString('fr-FR')
                                    const lieu = v.creator?.adresse ?? 'Abidjan'
                                    return (
                                        <Link key={v.id} href={`/vehicles/${v.id}`}
                                            className="group rounded-2xl border border-zinc-200 bg-white overflow-hidden hover:border-zinc-300 hover:shadow-xl transition-all duration-300 cursor-pointer">
                                            <div className="h-48 bg-zinc-50 flex items-center justify-center relative overflow-hidden">
                                                {photo
                                                    ? <Image src={getPhotoUrl(photo.path)}
                                                        alt={`${v.description?.marque} ${v.description?.modele}`}
                                                        fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                                    : <>
                                                        <div className="absolute inset-0 bg-linear-to-br from-zinc-50 to-zinc-100" />
                                                        <Car className="h-14 w-14 text-zinc-300 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                                                    </>
                                                }
                                                <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider z-10
                                                    ${v.post_type === "location"
                                                        ? "bg-blue-50 text-blue-600 border border-blue-100"
                                                        : "bg-move-gold/10 text-move-gold border border-move-gold/20"}`}>
                                                    {v.post_type === "location" ? "Location" : "À vendre"}
                                                </span>
                                                <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 text-white text-[10px] z-10">
                                                    <Eye className="h-3 w-3" /> {v.views_count}
                                                </span>
                                            </div>
                                            <div className="p-5">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{v.description?.marque}</p>
                                                        <h3 className="text-base font-bold text-zinc-900">{v.description?.modele}</h3>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-base font-bold text-[#d4aa00] font-stat">
                                                            {prixFormate}{v.post_type === "location" ? "/jr" : ""}
                                                        </p>
                                                        <p className="text-[10px] text-zinc-400">FCFA</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-zinc-400">
                                                    {v.description?.carburant && (
                                                        <span className="flex items-center gap-1"><Fuel className="h-3 w-3" /> {v.description.carburant}</span>
                                                    )}
                                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {lieu}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })
                        }
                    </div>
                </div>
            </section>

            <section className="py-24 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-zinc-200" />
                        <span className="text-xs font-bold text-move-gold uppercase tracking-widest">Pourquoi Move</span>
                        <div className="h-px flex-1 bg-zinc-200" />
                    </div>
                    <h2 className="text-2xl md:text-4xl font-extrabold text-center text-zinc-900 tracking-tight mb-3 max-w-2xl mx-auto"
                        style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                        La confiance avant tout
                    </h2>
                    <p className="text-center text-zinc-500 mb-16 max-w-md mx-auto text-sm leading-relaxed">
                        Nous mettons tout en œuvre pour que chaque transaction soit simple, sécurisée et transparente.
                    </p>

                    <div className="grid md:grid-cols-3 gap-5 mb-14">
                        {features.map((f) => (
                            <div key={f.title}
                                className="rounded-2xl border border-zinc-200 bg-white p-8 hover:border-move-gold/30 hover:shadow-md hover:shadow-move-gold/10 transition-all duration-300 group">
                                <div className="w-11 h-11 rounded-xl bg-move-gold/10 border border-move-gold/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                                    <f.icon className="h-5 w-5 text-move-gold" />
                                </div>
                                <h3 className="text-base font-bold text-zinc-900 mb-3" style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                                    {f.title}
                                </h3>
                                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Métriques */}
                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                        {metrics.map((m) => (
                            <div key={m.label}
                                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-200 bg-white text-center">
                                <div className="w-9 h-9 rounded-lg bg-move-gold/10 border border-move-gold/20 flex items-center justify-center">
                                    <m.icon className="h-4 w-4 text-move-gold" />
                                </div>
                                <p className="text-2xl font-bold text-zinc-900 font-stat">{m.value}</p>
                                <p className="text-xs text-zinc-400">{m.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-24 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-zinc-100" />
                        <span className="text-xs font-bold text-move-gold uppercase tracking-widest">Témoignages</span>
                        <div className="h-px flex-1 bg-zinc-100" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-center text-zinc-900 tracking-tight mb-16 max-w-lg mx-auto"
                        style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                        Ce que disent nos utilisateurs
                    </h2>

                    <div className="grid md:grid-cols-3 gap-5">
                        {temoignages.map((t, i) => (
                            <div key={t.name}
                                className={`rounded-2xl border border-zinc-200 bg-white p-6 hover:border-move-gold/20 hover:shadow-md hover:-translate-y-1 transition-all duration-300 ${i === 0 ? 'scroll-reveal' : i === 1 ? 'scroll-reveal-1' : 'scroll-reveal-2'}`}>
                                <div className="flex items-center gap-0.5 mb-4">
                                    {[...Array(t.rating)].map((_, i) => (
                                        <Star key={i} className="h-3.5 w-3.5 fill-move-gold text-move-gold" />
                                    ))}
                                </div>
                                <p className="text-sm text-zinc-600 leading-relaxed mb-5 italic">
                                    &quot;{t.text}&quot;
                                </p>
                                <div className="flex items-center gap-3 pt-4 border-t border-zinc-100">
                                    <div className="w-8 h-8 rounded-lg bg-move-gold/10 border border-move-gold/20 flex items-center justify-center">
                                        <span className="text-xs font-bold text-move-gold">{t.name.charAt(0)}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-800">{t.name}</p>
                                        <p className="text-xs text-zinc-400">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-24 px-6 relative overflow-hidden">
                {/* Orbe ambre subtil en arrière-plan */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-zinc-200" />
                    <div className="h-px flex-1 bg-zinc-200" />
                </div>
                <div className="absolute top-0 right-0 w-150 h-150 bg-[radial-gradient(circle,oklch(0.68_0.17_72/0.06),transparent_65%)] pointer-events-none" />

                <div className="relative max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">

                        {/* Image */}
                        <div className="relative rounded-2xl overflow-hidden order-2 md:order-1 group scroll-reveal h-full">
                            <Image
                                src="/vehicle/img5.jpg"
                                alt="Partenaires Move – concessionnaires et auto-écoles"
                                fill
                                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                            {/* Overlay dégradé */}
                            <div className="absolute inset-0 bg-linear-to-tr from-zinc-900/50 via-zinc-900/10 to-move-gold/10 transition-opacity duration-500 group-hover:opacity-70" />
                            {/* Reflet ambre animé */}
                            <div className="absolute inset-0 bg-linear-to-b from-move-gold/5 to-transparent animate-shimmer-img" />
                        </div>

                        {/* Texte */}
                        <div className="order-1 md:order-2">
                            <h2 className="text-2xl md:text-4xl font-extrabold text-black tracking-tight mb-4 leading-tight max-w-sm"
                                style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                                Rejoignez notre
                                <br />
                                <span className="text-move-gold">réseau de partenaires</span>
                            </h2>

                            <p className="text-black text-sm leading-relaxed mb-8 max-w-xs">
                                Concessionnaires, auto-écoles — accédez à des outils dédiés, une visibilité accrue et des clients qualifiés directement sur Move.
                            </p>

                            {/* Avantages */}
                            <div className="flex flex-col gap-3 mb-8">
                                {[
                                    { icon: TrendingUp, label: "Tableau de bord dédié", desc: "Statistiques de vos annonces en temps réel" },
                                    { icon: Users, label: "Clients qualifiés", desc: "Des acheteurs déjà engagés dans leur démarche" },
                                    { icon: ShieldCheck, label: "Badge certifié", desc: "Profil vérifié et mis en avant sur la plateforme" },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-move-gold/15 border border-move-gold/25 flex items-center justify-center shrink-0 mt-0.5">
                                            <item.icon className="h-3.5 w-3.5 text-black" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{item.label}</p>
                                            <p className="text-xs text-black">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setPartenaireDialog(true)}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-move-gold text-white font-semibold text-sm hover:bg-[oklch(0.86_0.175_83)] transition-all duration-200 shadow-lg shadow-move-gold/20 cursor-pointer"
                                style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                                Devenir partenaire
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>

                    </div>
                </div>
            </section>
            <footer className="bg-zinc-950 pt-16 pb-8 px-6 relative overflow-hidden">
                {/* Ligne ambre en haut */}
                <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-move-gold/50 to-transparent" />
                {/* Lueur ambre subtile */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-175 h-45 bg-[radial-gradient(ellipse,oklch(0.68_0.17_72/0.05),transparent_70%)] pointer-events-none" />

                <div className="relative max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-12">
                        {/* Logo + tagline */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Image src="/logo.svg" alt="Move CI" width={48} height={28} />
                            </div>
                            <p className="text-xs text-zinc-500 max-w-45 leading-relaxed">
                                Marketplace automobile de référence en Côte d&apos;Ivoire.
                            </p>
                        </div>

                        {/* Liens */}
                        <div className="flex flex-wrap gap-12">
                            <div>
                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4"
                                    style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                                    Plateforme
                                </p>
                                <div className="flex flex-col gap-2.5">
                                    {["Véhicules", "Louer", "Vendre", "Devenir vendeur"].map((l) => (
                                        <Link key={l} href="/vehicles"
                                            className="text-sm text-zinc-500 hover:text-move-gold transition-colors duration-200 hover:translate-x-0.5 inline-block">
                                            {l}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4"
                                    style={{ fontFamily: "var(--font-syne, sans-serif)" }}>
                                    Compte
                                </p>
                                <div className="flex flex-col gap-2.5">
                                    {["Se connecter", "S'inscrire", "Mon profil", "Notifications"].map((l) => (
                                        <Link key={l} href="/auth"
                                            className="text-sm text-zinc-500 hover:text-move-gold transition-colors duration-200 hover:translate-x-0.5 inline-block">
                                            {l}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Barre de séparation + copyright */}
                    <div className="pt-6 border-t border-zinc-800/60 flex flex-col md:flex-row items-center justify-between gap-2">
                        <p className="text-xs text-zinc-600">© 2026 Move. Tous droits réservés.</p>
                        <div className="flex items-center gap-4">
                            <Link
                                href="/cgu"
                                className="text-xs text-zinc-600 hover:text-move-gold transition-colors duration-200"
                            >
                                Conditions d&apos;utilisation
                            </Link>
                            <span className="text-zinc-700">·</span>
                            <p className="text-xs text-zinc-600">Marketplace automobile · Abidjan, Côte d&apos;Ivoire</p>
                        </div>
                    </div>
                </div>
            </footer>

            <DevenirPartenaire open={partenaireDialog} onClose={() => setPartenaireDialog(false)} />
        </div>
    )
}
