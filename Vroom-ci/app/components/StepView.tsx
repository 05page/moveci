"use client"

import { useState } from "react"
import {
    BookOpen, AlertTriangle, CheckCircle2, XCircle,
    Sun, RefreshCw, Car, EyeOff, Trash2, Ban,
    type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhotoTip {
    id: number
    title: string
    description: string
    icon: LucideIcon
    type: "bon" | "mauvais"
}

interface ValidationRule {
    id: number
    rule: string
    detail: string
    critical: boolean
}

// ─── Données ──────────────────────────────────────────────────────────────────

/**
 * Conseils photographiques pour les annonces véhicule.
 * type "bon" = pratique recommandée, "mauvais" = pratique à éviter.
 */
const photoTips: PhotoTip[] = [
    {
        id: 1,
        title: "Photo en plein jour",
        description: "Prenez vos photos en lumière naturelle, idéalement en milieu de journée. Les couleurs sont fidèles et le véhicule ressort mieux.",
        icon: Sun,
        type: "bon",
    },
    {
        id: 2,
        title: "Tous les angles couverts",
        description: "Face avant, arrière, côté conducteur, côté passager, 3/4 avant et arrière. Minimum 6 photos extérieures.",
        icon: RefreshCw,
        type: "bon",
    },
    {
        id: 3,
        title: "Intérieur complet",
        description: "Tableau de bord, sièges avant, banquette arrière, coffre ouvert. L'acheteur doit pouvoir visualiser l'habitacle.",
        icon: Car,
        type: "bon",
    },
    {
        id: 4,
        title: "Photo floue ou sombre",
        description: "Les photos floues, sous-exposées ou prises la nuit donnent une mauvaise impression et font fuir les acheteurs sérieux.",
        icon: EyeOff,
        type: "mauvais",
    },
    {
        id: 5,
        title: "Fond encombré",
        description: "Évitez les garages surchargés, les poubelles ou les objets personnels en arrière-plan. Un fond neutre valorise le véhicule.",
        icon: Trash2,
        type: "mauvais",
    },
    {
        id: 6,
        title: "Photo volée sur internet",
        description: "Utiliser des photos d'un autre annonceur ou du constructeur est une fraude. Votre annonce sera immédiatement rejetée.",
        icon: Ban,
        type: "mauvais",
    },
]

/**
 * Règles de validation appliquées par les modérateurs Vroom.
 * critical: true = rejet immédiat si non respecté.
 */
const validationRules: ValidationRule[] = [
    {
        id: 1,
        rule: "Photos réelles du véhicule",
        detail: "Toutes les photos doivent être prises par vous, du véhicule exact mis en vente. Aucune photo générique ou issue d'internet.",
        critical: true,
    },
    {
        id: 2,
        rule: "Véhicule non gagé ni volé",
        detail: "Le véhicule ne doit faire l'objet d'aucune saisie, gage ou déclaration de vol. Un certificat de situation administrative peut être demandé.",
        critical: true,
    },
    {
        id: 3,
        rule: "Prix cohérent avec le marché",
        detail: "Un prix anormalement bas ou excessivement élevé par rapport à la cote Argus entraîne une vérification manuelle.",
        critical: false,
    },
    {
        id: 4,
        rule: "Kilométrage exact",
        detail: "Renseignez le kilométrage réel affiché au compteur. Une erreur intentionnelle constitue une fraude passible de sanctions.",
        critical: true,
    },
    {
        id: 5,
        rule: "Informations complètes",
        detail: "Marque, modèle, année, carburant, boîte de vitesses et description doivent être renseignés. Les annonces incomplètes sont suspendues.",
        critical: false,
    },
]


/** Carte individuelle d'un conseil photo */
function PhotoTipCard({ tip }: { tip: PhotoTip }) {
    const isBon = tip.type === "bon"

    return (
        <div className={`p-4 rounded-xl border transition-colors ${
            isBon
                ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20"
                : "border-red-200 bg-red-50/50 dark:border-red-800/40 dark:bg-red-950/20"
        }`}>
            <div className="flex items-start gap-3">
                {/* Icône Lucide du conseil */}
                <div className={`p-1.5 rounded-lg shrink-0 ${isBon ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-red-100 dark:bg-red-900/40"}`}>
                    <tip.icon className={`h-4 w-4 ${isBon ? "text-emerald-600" : "text-red-500"}`} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">{tip.title}</span>
                        <Badge
                            className={`text-xs border shrink-0 ${
                                isBon
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                    : "bg-red-100 text-red-700 border-red-200"
                            }`}
                        >
                            {isBon ? (
                                <><CheckCircle2 className="h-3 w-3 mr-1" />Recommandé</>
                            ) : (
                                <><XCircle className="h-3 w-3 mr-1" />À éviter</>
                            )}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {tip.description}
                    </p>
                </div>
            </div>
        </div>
    )
}

/** Ligne individuelle d'une règle de validation */
function ValidationRuleItem({ rule }: { rule: ValidationRule }) {
    return (
        <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
            rule.critical
                ? "border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20"
                : "border-border/60 hover:bg-muted/30"
        }`}>
            {/* Icône selon criticité */}
            {rule.critical ? (
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            ) : (
                <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">{rule.rule}</span>
                    {rule.critical && (
                        <Badge className="text-xs border shrink-0 bg-red-100 text-red-700 border-red-200">
                            Rejet immédiat
                        </Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {rule.detail}
                </p>
            </div>
        </div>
    )
}


/**
 * StepView — Modal "Guide de publication" pour les vendeurs.
 * Affiche deux onglets : conseils photos et règles de modération.
 * S'ouvre via un bouton déclencheur intégré au composant.
 */
export default function StepView() {
    const [open, setOpen] = useState(false)

    const bonsTips = photoTips.filter(t => t.type === "bon")
    const mauvaisTips = photoTips.filter(t => t.type === "mauvais")

    return (
        <>
            {/* Bouton déclencheur */}
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className="gap-2 border-amber-400/40 text-amber-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-400 dark:border-amber-400/30 dark:text-amber-400 dark:hover:bg-amber-950/30 cursor-pointer"
            >
                <BookOpen className="h-4 w-4" />
                Guide de publication
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader className="shrink-0">
                        {/* En-tête avec icône amber */}
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                                <BookOpen className="h-5 w-5 text-amber-500" />
                            </div>
                            <div>
                                <DialogTitle className="text-base">
                                    Guide de publication
                                </DialogTitle>
                                <DialogDescription className="text-xs mt-0.5">
                                    Suivez ces conseils pour que votre annonce soit validée rapidement.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Zone scrollable */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <Tabs defaultValue="photos" className="w-full">
                            <TabsList className="w-full mb-4 shrink-0">
                                <TabsTrigger value="photos" className="flex-1">
                                    Photos
                                </TabsTrigger>
                                <TabsTrigger value="regles" className="flex-1">
                                    Règles
                                </TabsTrigger>
                            </TabsList>

                            {/* ── Onglet Photos ── */}
                            <TabsContent value="photos" className="space-y-4 mt-0">
                                {/* Section Recommandations */}
                                <div>
                                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Bonnes pratiques ({bonsTips.length})
                                    </p>
                                    <div className="space-y-2">
                                        {bonsTips.map(tip => (
                                            <PhotoTipCard key={tip.id} tip={tip} />
                                        ))}
                                    </div>
                                </div>

                                {/* Section À éviter */}
                                <div>
                                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                        <XCircle className="h-3.5 w-3.5" />
                                        Erreurs fréquentes ({mauvaisTips.length})
                                    </p>
                                    <div className="space-y-2">
                                        {mauvaisTips.map(tip => (
                                            <PhotoTipCard key={tip.id} tip={tip} />
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* ── Onglet Règles ── */}
                            <TabsContent value="regles" className="space-y-2 mt-0">
                                {/* Avertissement critique */}
                                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 mb-3">
                                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                        <strong>Les règles marquées "Rejet immédiat"</strong> entraînent une suppression sans avertissement préalable. Le compte peut être suspendu en cas de récidive.
                                    </p>
                                </div>

                                {validationRules.map(rule => (
                                    <ValidationRuleItem key={rule.id} rule={rule} />
                                ))}

                                {/* Note de bas de page */}
                                <p className="text-xs text-muted-foreground text-center pt-2">
                                    Des questions ? Contactez notre équipe via le Centre d'aide.
                                </p>
                            </TabsContent>
                        </Tabs>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
