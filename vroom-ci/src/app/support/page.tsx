"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, Plus } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { api } from "@/lib/api";
import { formaterDateHeure } from "@/lib/utils";
import type { ErreurAuth, PrioriteTicket, StatutTicket, SupportTicket } from "@/types";

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

const OPTIONS_PRIORITE: { valeur: PrioriteTicket; libelle: string }[] = [
  { valeur: "basse", libelle: "Basse" },
  { valeur: "normale", libelle: "Normale" },
  { valeur: "haute", libelle: "Haute" },
  { valeur: "urgente", libelle: "Urgente" },
];

/** Même contrat que GET /support/mes-tickets. */
const recupererMesTickets = async (): Promise<SupportTicket[]> => {
  const reponse = await api.get<{ data: SupportTicket[] }>("support/mes-tickets")
  return reponse.data;
};

const PageSupport = () => {
  const [tickets, setTickets] = useState<SupportTicket[] | undefined>(undefined);
  const [rechargement, setRechargement] = useState(false);
  const [tentative, setTentative] = useState(0);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);

  const [sujet, setSujet] = useState("");
  const [message, setMessage] = useState("");
  const [priorite, setPriorite] = useState<PrioriteTicket>("normale");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;

    recupererMesTickets().then((liste) => {
      if (annule) return;
      setTickets(liste);
      setRechargement(false);
    });

    return () => {
      annule = true;
    };
  }, [tentative]);

  const recharger = () => {
    setRechargement(true);
    setTentative((t) => t + 1);
  };

  const soumettre = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sujet.trim() || !message.trim() || envoiEnCours) return;
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      const reponse = await api.post<{ data: SupportTicket }>("support/post-tickets", { sujet: sujet.trim(), message: message.trim(), priorite })
      setTickets((liste) => liste && [reponse.data, ...liste]);
      setSujet("");
      setMessage("");
      setPriorite("normale");
      setDialogueOuvert(false)
      toast.success("Ticket envoyé.");
    } catch (erreurCatch) {
      const message = (erreurCatch as ErreurAuth).message ?? "L'envoi du ticket a échoué.";
      setErreur(message);
      toast.error(message);
    }
    finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold">Support</h1>
        <div className="flex items-center gap-3">
          <BoutonRecharger onClick={recharger} chargement={rechargement} />
          <Button className="effet-action" onClick={() => setDialogueOuvert(true)}>
            <Plus className="size-4" />
            Nouveau ticket
          </Button>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Une question, un problème ? Notre équipe vous répond directement ici.
      </p>

      {tickets === undefined ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LifeBuoy className="size-7" />
          </span>
          <h2 className="mt-6 font-heading text-2xl font-bold">Aucun ticket pour l&apos;instant</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Besoin d&apos;aide ? Ouvrez un ticket, on vous répond dès que possible.
          </p>
          <Button className="effet-action mt-8" onClick={() => setDialogueOuvert(true)}>
            <Plus className="size-4" />
            Nouveau ticket
          </Button>
        </section>
      ) : (
        <ul className="mt-6 space-y-3">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="rounded-2xl border border-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-base font-bold">{ticket.sujet}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formaterDateHeure(ticket.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge className={STYLE_PRIORITE[ticket.priorite].classes}>
                    {STYLE_PRIORITE[ticket.priorite].libelle}
                  </Badge>
                  <Badge className={STYLE_STATUT_TICKET[ticket.statut].classes}>
                    {STYLE_STATUT_TICKET[ticket.statut].libelle}
                  </Badge>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{ticket.message}</p>

              {ticket.reponse_admin && (
                <div className="mt-4 rounded-xl bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Réponse
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{ticket.reponse_admin}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogueOuvert} onOpenChange={setDialogueOuvert}>
        <DialogContent>
          <form onSubmit={soumettre} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>Nouveau ticket</DialogTitle>
              <DialogDescription>Décrivez votre problème, on vous répond au plus vite.</DialogDescription>
            </DialogHeader>

            <div>
              <Label htmlFor="sujet-ticket">Sujet</Label>
              <Input
                id="sujet-ticket"
                className="mt-2"
                maxLength={150}
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="message-ticket">Message</Label>
              <Textarea
                id="message-ticket"
                className="mt-2"
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="priorite-ticket">Priorité</Label>
              <Select value={priorite} onValueChange={(v) => v && setPriorite(v as PrioriteTicket)}>
                <SelectTrigger id="priorite-ticket" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPTIONS_PRIORITE.map((option) => (
                    <SelectItem key={option.valeur} value={option.valeur}>
                      {option.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {erreur && <p className="text-sm text-destructive">{erreur}</p>}

            <DialogFooter>
              <Button type="submit" disabled={!sujet.trim() || !message.trim() || envoiEnCours}>
                {envoiEnCours ? "Envoi..." : "Envoyer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default PageSupport;
