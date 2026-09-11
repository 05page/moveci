"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Inbox,
  LifeBuoy,
  Search,
  Send,
  Sparkles,
} from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteStat from "@/components/CarteStat";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api, messageErreur } from "@/lib/api";
import { cn, formaterDateHeure, initiales, LIBELLES_ROLE, tempsRelatif } from "@/lib/utils";
import type { PrioriteTicket, StatutTicket, TicketSupportAdmin } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   SUPPORT — /admin/support
   Miroir de SupportController — routes/api.php:257-258 (GET /admin/support,
   POST /admin/support/{id}/repondre). Pas de pagination côté back (->get()),
   donc tout le filtrage (statut + recherche) se fait ici, côté client, sur
   le tableau complet — même logique que /admin/parc-auto.
   ──────────────────────────────────────────────────────────────────────────── */

const STYLE_STATUT_TICKET: Record<StatutTicket, { libelle: string; classes: string }> = {
  ouvert: { libelle: "Ouvert", classes: "bg-secondary text-secondary-foreground" },
  en_cours: { libelle: "En cours", classes: "bg-primary/15 text-primary" },
  résolu: { libelle: "Résolu", classes: "bg-accent text-accent-foreground" },
  fermé: { libelle: "Fermé", classes: "bg-foreground text-background" },
};

const STYLE_PRIORITE: Record<PrioriteTicket, { libelle: string; classes: string }> = {
  basse: { libelle: "Basse", classes: "bg-muted text-muted-foreground" },
  normale: { libelle: "Normale", classes: "bg-secondary text-secondary-foreground" },
  haute: { libelle: "Haute", classes: "bg-primary/15 text-primary" },
  urgente: { libelle: "Urgente", classes: "bg-destructive/10 text-destructive" },
};

const OPTIONS_STATUT: { valeur: StatutTicket | "tout"; libelle: string }[] = [
  { valeur: "tout", libelle: "Tous les statuts" },
  { valeur: "ouvert", libelle: "Ouvert" },
  { valeur: "en_cours", libelle: "En cours" },
  { valeur: "résolu", libelle: "Résolu" },
  { valeur: "fermé", libelle: "Fermé" },
];

/** Même contrat que GET /admin/support (pas de pagination : renvoie tous les tickets). */
const recupererTickets = async (): Promise<TicketSupportAdmin[]> => {
  const reponse = await api.get<{ data: TicketSupportAdmin[] }>("admin/support");
  return reponse.data;
};

/** Même contrat que POST /admin/support/{id}/repondre, corps `{ reponse, statut? }`. */
const repondreTicket = async (id: string, reponse: string, statut: StatutTicket): Promise<void> => {
  await api.post<{ message: string }>(`admin/support/${id}/repondre`, { reponse, statut });
};

export default function PageSupport() {
  const [tickets, setTickets] = useState<TicketSupportAdmin[] | null>(null);
  const [chargement, setChargement] = useState(true);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<StatutTicket | "tout">("tout");
  const [idSelectionne, setIdSelectionne] = useState<string | null>(null);
  const [reponseTexte, setReponseTexte] = useState("");
  const [statutReponse, setStatutReponse] = useState<StatutTicket>("en_cours");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let annule = false;

    recupererTickets().then((liste) => {
      if (annule) return;
      setTickets(liste);
      setChargement(false);
    });

    return () => {
      annule = true;
    };
  }, [tentative]);

  const recharger = () => {
    setChargement(true);
    setTentative((t) => t + 1);
  };

  const compteurs = useMemo(() => {
    const liste = tickets ?? [];
    return {
      total: liste.length,
      ouverts: liste.filter((t) => t.statut === "ouvert").length,
      enCours: liste.filter((t) => t.statut === "en_cours").length,
      resolus: liste.filter((t) => t.statut === "résolu").length,
    };
  }, [tickets]);

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (tickets ?? []).filter((t) => {
      if (filtreStatut !== "tout" && t.statut !== filtreStatut) return false;
      if (q && !`${t.sujet} ${t.user.fullname}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tickets, filtreStatut, recherche]);

  const ticketSelectionne =
    resultats.find((t) => t.id === idSelectionne) ?? resultats[0] ?? null;

  // à chaque fois que la sélection change, on repart d'un formulaire propre :
  // la réponse déjà envoyée (le cas échéant) devient le point de départ à éditer.
  useEffect(() => {
    if (!ticketSelectionne) return;
    setReponseTexte(ticketSelectionne.reponse_admin ?? "");
    setStatutReponse(ticketSelectionne.statut === "ouvert" ? "en_cours" : ticketSelectionne.statut);
  }, [ticketSelectionne?.id]);

  const envoyerReponse = async () => {
    if (!ticketSelectionne) return;
    setEnvoi(true);
    try {
      await repondreTicket(ticketSelectionne.id, reponseTexte, statutReponse);
      recharger();
      toast.success("Réponse envoyée.");
    } catch (e) {
      toast.error(messageErreur(e, "L'envoi de la réponse a échoué."));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LifeBuoy className="size-5" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold md:text-3xl">Support</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {tickets
                ? `${tickets.length} ticket${tickets.length > 1 ? "s" : ""} au total.`
                : "Tickets envoyés par les utilisateurs."}
            </p>
          </div>
        </div>
        <BoutonRecharger onClick={recharger} chargement={chargement} className="mt-1" />
      </header>

      {tickets ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CarteStat libelle="Tickets au total" valeur={compteurs.total} icone={Inbox} />
          <CarteStat
            libelle="Ouverts"
            valeur={compteurs.ouverts}
            icone={Sparkles}
            precision="Pas encore pris en charge"
            accent={compteurs.ouverts > 0}
          />
          <CarteStat libelle="En cours" valeur={compteurs.enCours} icone={Clock} />
          <CarteStat libelle="Résolus" valeur={compteurs.resolus} icone={CheckCircle2} />
        </section>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Sujet, utilisateur…"
            className="pl-9"
          />
        </div>
        <Select
          value={filtreStatut}
          onValueChange={(v) => v && setFiltreStatut(v as StatutTicket | "tout")}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS_STATUT.map((o) => (
              <SelectItem key={o.valeur} value={o.valeur}>
                {o.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {chargement || !tickets ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[380px_1fr]">
          <Skeleton className="h-[32rem] w-full" />
          <Skeleton className="h-[32rem] w-full" />
        </div>
      ) : tickets.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LifeBuoy className="size-7" />
          </span>
          <h2 className="mt-6 font-heading text-xl font-bold">Aucun ticket</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Aucun ticket de support n&apos;a été envoyé pour l&apos;instant.
          </p>
        </section>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[380px_1fr] lg:items-start">
          {/* Colonne de gauche : liste, scrollable indépendamment du détail */}
          <div className="overflow-hidden rounded-2xl border border-border">
            {resultats.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Aucun ticket ne correspond à ces filtres.
              </p>
            ) : (
              <ul className="max-h-[36rem] divide-y divide-border overflow-y-auto">
                {resultats.map((ticket) => {
                  const actif = ticket.id === ticketSelectionne?.id;
                  return (
                    <li key={ticket.id}>
                      <button
                        type="button"
                        onClick={() => setIdSelectionne(ticket.id)}
                        className={cn(
                          "block w-full px-4 py-3.5 text-left transition-colors",
                          actif ? "bg-primary/10" : "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-semibold">{ticket.sujet}</p>
                          <span
                            className={cn(
                              "size-2 shrink-0 translate-y-1 rounded-full",
                              ticket.priorite === "urgente"
                                ? "bg-destructive"
                                : ticket.priorite === "haute"
                                  ? "bg-primary"
                                  : "bg-transparent"
                            )}
                            aria-hidden
                          />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {ticket.user.fullname}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge className={cn("text-[10px]", STYLE_STATUT_TICKET[ticket.statut].classes)}>
                            {STYLE_STATUT_TICKET[ticket.statut].libelle}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {tempsRelatif(ticket.created_at)}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Colonne de droite : détail + réponse */}
          {ticketSelectionne ? (
            <div className="rounded-2xl border border-border p-6 lg:sticky lg:top-20">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={STYLE_STATUT_TICKET[ticketSelectionne.statut].classes}>
                  {STYLE_STATUT_TICKET[ticketSelectionne.statut].libelle}
                </Badge>
                <Badge className={STYLE_PRIORITE[ticketSelectionne.priorite].classes}>
                  Priorité {STYLE_PRIORITE[ticketSelectionne.priorite].libelle.toLowerCase()}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formaterDateHeure(ticketSelectionne.created_at)}
                </span>
              </div>

              <h2 className="mt-3 font-heading text-xl font-bold">{ticketSelectionne.sujet}</h2>

              <div className="mt-3 flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {initiales(ticketSelectionne.user.fullname)}
                </span>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{ticketSelectionne.user.fullname}</span>
                  {" · "}
                  {LIBELLES_ROLE[ticketSelectionne.user.role]}
                  {" · "}
                  {ticketSelectionne.user.email}
                </p>
              </div>

              <p className="mt-5 whitespace-pre-line rounded-xl bg-muted/40 p-4 text-sm">
                {ticketSelectionne.message}
              </p>

              {ticketSelectionne.reponse_admin && (
                <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Réponse envoyée
                    {ticketSelectionne.admin && ` · ${ticketSelectionne.admin.fullname}`}
                    {ticketSelectionne.repondu_at &&
                      ` · ${formaterDateHeure(ticketSelectionne.repondu_at)}`}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm">{ticketSelectionne.reponse_admin}</p>
                </div>
              )}

              <div className="mt-6 border-t border-border pt-5">
                <Label htmlFor="reponse-ticket" className="text-sm font-semibold">
                  {ticketSelectionne.reponse_admin ? "Modifier la réponse" : "Répondre"}
                </Label>
                <Textarea
                  id="reponse-ticket"
                  value={reponseTexte}
                  onChange={(e) => setReponseTexte(e.target.value)}
                  placeholder="Votre réponse à l'utilisateur…"
                  className="mt-2 min-h-28"
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="w-44">
                    <Select
                      value={statutReponse}
                      onValueChange={(v) => v && setStatutReponse(v as StatutTicket)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STYLE_STATUT_TICKET) as StatutTicket[]).map((statut) => (
                          <SelectItem key={statut} value={statut}>
                            {STYLE_STATUT_TICKET[statut].libelle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <button
                    type="button"
                    disabled={reponseTexte.trim().length === 0 || envoi}
                    onClick={envoyerReponse}
                    className={cn(buttonVariants(), "effet-action")}
                  >
                    <Send className="size-4" />
                    {envoi ? "Envoi…" : "Envoyer"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Sélectionne un ticket dans la liste pour voir son détail.
            </div>
          )}
        </div>
      )}
    </main>
  );
}
