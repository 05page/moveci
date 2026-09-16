"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Car,
  ChevronLeft,
  MessagesSquare,
  Search,
  SendHorizontal,
} from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import BulleMessage from "@/components/BulleMessage";
import LigneConversation from "@/components/LigneConversation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cn,
  etiquetteJour,
  formaterFcfa,
  grouperParJour,
  urlPhoto,
} from "@/lib/utils";
import { libelleVehicule, photoPrincipale } from "@/lib/vehicule";
import type { Conversation, MessageChat, User } from "@/types";
import { api } from "@/lib/api";
import { getEcho } from "@/lib/echo";
import { toast } from "sonner";

const recupererUtilisateurConnecte = async (): Promise<User> => {
  const reponse = await api.get<{ data: User }>("me")
  return reponse.data
}

/** Même contrat que GET /conversations. Seul ce corps changera au branchement. */
const recupererConversations = async (): Promise<Conversation[]> => {
  const reponse = await api.get<{ conversations: Conversation[] }>('conversations')
  return reponse.conversations
}

/** Même contrat que GET /conversations/{id}/messages. */
const recupererMessages = async (id: string): Promise<MessageChat[]> => {
  const reponse = await api.get<{ messages: MessageChat[] }>(`conversations/${id}/messages`)
  return reponse.messages;
}

/** Même contrat que DELETE /conversations/{id}/messages/{messageId}. */
const supprimerMessage = async (conversationId: string, messageId: string): Promise<void> => {
  await api.delete(`conversations/${conversationId}/messages/${messageId}`);
}

const envoyerMessage = async (conversationId: string, content: string, destinataireId: string): Promise<MessageChat> => {
  const reponse = await api.post<{ message: MessageChat }>(`conversations/${conversationId}/messages`, { content, destinataire: destinataireId });
  return reponse.message;
}

export default function MessagerieContent() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [idOuverte, setIdOuverte] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageChat[]>([]);
  const [me, setMe] = useState<User | null>(null)
  const [chargementListe, setChargementListe] = useState(true);
  // false et non true : aucun fil n'est ouvert au premier rendu
  const [chargementFil, setChargementFil] = useState(false);
  const [brouillon, setBrouillon] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentativeListe, setTentativeListe] = useState(0);

  const finDuFil = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererConversations().then((liste) => {
      if (annule) return;
      setConversations(liste);
      setChargementListe(false);
    }).catch(() => { setChargementListe(false); setErreur("Message non récupéré") });

    return () => {
      annule = true;
    };
  }, [tentativeListe]);

  const rechargerListe = () => {
    // ÉTAPE 3 — Remettre `erreur` à null ici : sinon l'écran d'échec resterait affiché
    // même après un nouveau succès, le temps que le prochain .then() écrase la valeur.
    setErreur(null)
    setChargementListe(true);
    setTentativeListe((t) => t + 1);
  };

  useEffect(() => {
    let annule = false;
    recupererUtilisateurConnecte().then((utilisateur) => {
      if (annule) return;
      setMe(utilisateur);
    }).catch(() => { setErreur("Utilisateur non récupéré") })

    return () => {
      annule = true;
    }
  }, [tentativeListe]);

  // sans ça, chaque message envoyé part sous la ligne de flottaison
  useEffect(() => {
    finDuFil.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  /**
   * La conversation ouverte est DÉRIVÉE, jamais stockée : deux états décrivant
   * la même chose finissent par diverger — on remettrait `unread_count` à zéro
   * dans l'un et pas dans l'autre.
   */
  const ouverte = conversations.find((c) => c.id === idOuverte) ?? null;

  const triees = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        // conversation jamais entamée : reléguée en bas, elle n'a rien à raconter
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        // les ISO 8601 se comparent lexicographiquement, pas besoin de new Date()
        return b.last_message_at.localeCompare(a.last_message_at);
      }),
    [conversations]
  );

  const groupes = useMemo(
    () => grouperParJour(messages, (message) => message.created_at),
    [messages]
  );

  const ouvrirConversation = (id: string) => {
    setIdOuverte(id);
    setChargementFil(true);
    setErreur(null);
    // vider AVANT de charger : sinon les messages du fil précédent restent
    // affichés sous le nouvel en-tête pendant tout le chargement
    setMessages([]);

    recupererMessages(id).then((liste) => {
      setMessages(liste);
      setChargementFil(false);
    });

    setConversations((liste) =>
      liste.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
    );
  };

  useEffect(() => {
    if (!idOuverte) return;
    const canal = getEcho().private(`conversation.${idOuverte}`);
    canal
      .listen('.message.sent', (data: { message: MessageChat }) => {
        setMessages((liste) =>
          liste.some((m) => m.id === data.message.id) ? liste : [...liste, data.message]
        );
      })
      .listen('.message.deleted', (data: { message_id: string }) => {
        setMessages((liste) => liste.filter((m) => m.id !== data.message_id));
      });

    return () => {
      getEcho().leave(`conversation.${idOuverte}`);
    };
  }, [idOuverte]);

  const supprimerMessageDuFil = (messageId: string) => {
    if (!idOuverte) return;
    const conversationId = idOuverte;

    setMessages((liste) => liste.filter((m) => m.id !== messageId));

    supprimerMessage(conversationId, messageId).catch(() => {
      setErreur("La suppression a échoué.");
      toast.error("La suppression a échoué.");
      // resynchronise le fil avec le serveur plutôt que de deviner où remettre le message
      recupererMessages(conversationId).then(setMessages);
    });
  };

  const envoyer = () => {
    const contenu = brouillon.trim();
    if (!contenu || !ouverte || !me) return;

    // le préfixe `temp-` sert aussi de marqueur « en attente » à l'affichage :
    // pas besoin d'un état supplémentaire pour suivre les envois en cours
    const idTemporaire = `temp-${Date.now()}`;
    const provisoire: MessageChat = {
      id: idTemporaire,
      conversation_id: ouverte.id,
      sender_id: me.id,
      receiver_id: ouverte.other_participant.id,
      content: contenu,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
      sender: me,
    };

    setErreur(null);
    setMessages((liste) => [...liste, provisoire]);
    // vider tout de suite : un champ qui attend la réponse serveur donne une
    // interface qui colle, 500 ms où l'utilisateur croit que sa touche n'a rien fait
    setBrouillon("");

    envoyerMessage(ouverte.id, contenu, ouverte.other_participant.id)
      .then((reel) => {
        setMessages((liste) => {
          // le listener Reverb (voir plus haut) a pu recevoir et ajouter `reel`
          // avant que cette réponse HTTP arrive : on retire le message provisoire
          // dans tous les cas, et on ne rajoute `reel` que s'il n'y est pas déjà.
          const sansProvisoire = liste.filter((m) => m.id !== idTemporaire);
          const dejaPresent = sansProvisoire.some((m) => m.id === reel.id);
          return dejaPresent ? sansProvisoire : [...sansProvisoire, reel];
        });

        // l'aperçu de gauche mentirait sans cette mise à jour
        setConversations((liste) =>
          liste.map((c) =>
            c.id === reel.conversation_id
              ? {
                ...c,
                last_message_at: reel.created_at,
                last_message: {
                  content: reel.content,
                  created_at: reel.created_at,
                  sender_id: reel.sender_id,
                },
              }
              : c
          )
        );
      })
      .catch(() => {
        setMessages((liste) => liste.filter((m) => m.id !== idTemporaire));
        // on rend le texte : un message perdu à l'envoi coûte bien plus qu'un favori
        setBrouillon((actuel) => actuel || contenu);
        setErreur("Le message n'est pas parti. Votre texte a été restauré.");
        toast.error("Le message n'est pas parti. Votre texte a été restauré.");
      });
  };

  if (erreur && (chargementListe || !me)) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <section className="rounded-2xl border border-border p-12 text-center">
          {/* ÉTAPE 1 — Afficher le texte de `erreur` ici (pas un texte fixe : c'est le message posé par le .catch qui a échoué). */}
          {erreur && (
            <p
              role="status"
              className="shrink-0 border-t border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive"
            >
              {erreur}
            </p>
          )}
          {/* ÉTAPE 2 — Ajouter un <BoutonRecharger> (déjà importé en haut du fichier) dont le onClick appelle `rechargerListe`. */}
          <BoutonRecharger onClick={() => rechargerListe()} />
        </section>
      </main>
    );
  }

  if (chargementListe || !me) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <Skeleton className="h-8 w-48" />
        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
          <div className="space-y-px">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="hidden h-128 w-full lg:block" />
        </div>
      </main>
    );
  }

  if (conversations.length === 0) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <section className="rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessagesSquare className="size-7" />
          </span>
          <h1 className="mt-6 font-heading text-2xl font-bold">
            Aucune conversation
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Une conversation démarre depuis une annonce, jamais d&apos;ici :
            elle reste attachée au véhicule dont vous parlez. Ouvrez une fiche
            et contactez le vendeur.
          </p>
          <Link
            href="/vehicules"
            className={cn(buttonVariants({ size: "lg" }), "effet-action mt-8")}
          >
            <Search className="size-4" />
            Parcourir les véhicules
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-4rem)] min-h-0 w-full max-w-7xl flex-col lg:px-5 lg:py-6">
      {/* grid-rows-[minmax(0,1fr)] : l'équivalent vertical du minmax(0,…) des colonnes */}
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:gap-5">
        {/* ── Panneau gauche : la liste ─────────────────────────────────── */}
        <aside
          className={cn(
            "min-h-0 flex-col overflow-hidden border-border lg:flex lg:rounded-md lg:border",
            // mobile : un seul panneau à l'écran à la fois
            idOuverte ? "hidden" : "flex"
          )}
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4">
            <div>
              <h1 className="font-heading text-lg font-bold">Messages</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {conversations.length} conversation
                {conversations.length > 1 ? "s" : ""}, chacune liée à un véhicule.
              </p>
            </div>
            <BoutonRecharger onClick={rechargerListe} chargement={chargementListe} />
          </header>

          <div className="sans-barre-scroll min-h-0 flex-1 overflow-y-auto">
            {triees.map((conversation) => (
              <LigneConversation
                key={conversation.id}
                conversation={conversation}
                moiId={me.id}
                active={conversation.id === idOuverte}
                onOuvrir={ouvrirConversation}
              />
            ))}
          </div>
        </aside>

        {/* ── Panneau droit : le fil ────────────────────────────────────── */}
        <section
          className={cn(
            "min-h-0 flex-col overflow-hidden border-border lg:flex lg:rounded-md lg:border",
            idOuverte ? "flex" : "hidden lg:flex"
          )}
        >
          {!ouverte ? (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <MessagesSquare className="size-6" />
              </span>
              <p className="mt-4 font-heading text-sm font-bold">
                Sélectionnez une conversation
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Le véhicule concerné restera affiché en haut du fil pendant tout
                l&apos;échange.
              </p>
            </div>
          ) : (
            <>
              <EnteteFil
                conversation={ouverte}
                onRetour={() => setIdOuverte(null)}
              />

              {/* bg-muted et non blanc : sans fond, les cartes blanches d'en face sont invisibles */}
              <div className="sans-barre-scroll min-h-0 flex-1 space-y-6 overflow-y-auto bg-muted px-4 pb-6 pt-5">
                {chargementFil ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex",
                        index % 2 === 0 ? "justify-start" : "justify-end"
                      )}
                    >
                      <Skeleton className="h-16 w-3/5 rounded-md" />
                    </div>
                  ))
                ) : messages.length === 0 ? (
                  <p className="py-10 text-center text-xs text-muted-foreground">
                    Aucun message pour l&apos;instant. Écrivez le premier.
                  </p>
                ) : (
                  groupes.map((groupe) => (
                    // space-y-1.5 entre bulles : des messages qui se suivent forment
                    // un bloc de parole, l'air se met ENTRE les journées, pas dedans
                    <div key={groupe.jour} className="space-y-1.5">
                      <p className="mb-3 text-center text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                        {etiquetteJour(groupe.jour)}
                      </p>

                      {groupe.elements.map((message) => (
                        <BulleMessage
                          key={message.id}
                          message={message}
                          deMoi={message.sender_id === me.id}
                          enAttente={message.id.startsWith("temp-")}
                          onSupprimer={() => supprimerMessageDuFil(message.id)}
                        />
                      ))}
                    </div>
                  ))
                )}

                {/* sentinelle d'auto-scroll : elle n'affiche rien, elle sert de cible */}
                <div ref={finDuFil} />
              </div>

              {/* role="status" : le lecteur d'écran annonce l'échec sans déplacer le focus */}
              {erreur && (
                <p
                  role="status"
                  className="shrink-0 border-t border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive"
                >
                  {erreur}
                </p>
              )}

              <Composeur
                valeur={brouillon}
                onChange={setBrouillon}
                onEnvoyer={envoyer}
                contact={ouverte.other_participant.fullname}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}

/**
 * Bandeau collant du fil : le véhicule dont on parle, plus le contact.
 *
 * Il ne sort jamais de l'écran — c'est le sujet de la conversation, et sur une
 * plateforme où l'on discute d'un prix, perdre de vue lequel est un vrai risque.
 */
function EnteteFil({
  conversation,
  onRetour,
}: {
  conversation: Conversation;
  onRetour: () => void;
}) {
  const { vehicule, other_participant: contact } = conversation;
  const photo = photoPrincipale(vehicule.photos);
  const estLocation = vehicule.post_type === "location";

  return (
    <header className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b border-border bg-background px-3 py-3 sm:px-4">
      <button
        type="button"
        onClick={onRetour}
        aria-label="Retour à la liste des conversations"
        className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
      >
        <ChevronLeft className="size-5" />
      </button>

      <Link
        href={`/vehicules/${vehicule.id}`}
        className="group flex min-w-0 flex-1 items-center gap-3"
      >
        <span className="size-11 shrink-0 overflow-hidden rounded-md bg-muted">
          {photo ? (
            <img
              src={urlPhoto(photo.path)}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground">
              <Car className="size-5" />
            </span>
          )}
        </span>

        <span className="min-w-0">
          <span className="block truncate font-heading text-sm font-bold transition-colors group-hover:text-primary">
            {libelleVehicule(vehicule.description, vehicule.id)}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {contact.fullname} · {/* Number() : `prix` est une string, un + concatènerait */}
            <span className="tabular-nums">
              {formaterFcfa(Number(vehicule.prix))}
              {estLocation && " / jour"}
            </span>
          </span>
        </span>
      </Link>

      <Badge
        variant="outline"
        className="hidden shrink-0 sm:inline-flex"
      >
        {estLocation ? "Location" : "Vente"}
      </Badge>
    </header>
  );
}

/** Zone de saisie. Entrée envoie, Maj+Entrée saute une ligne. */
function Composeur({
  valeur,
  onChange,
  onEnvoyer,
  contact,
}: {
  valeur: string;
  onChange: (valeur: string) => void;
  onEnvoyer: () => void;
  contact: string;
}) {
  const vide = valeur.trim().length === 0;

  return (
    <div className="flex shrink-0 items-end gap-2 border-t border-border bg-background px-3 py-3 sm:px-4">
      <textarea
        rows={1}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // sans preventDefault, Entrée envoie ET insère un retour à la ligne
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onEnvoyer();
          }
        }}
        placeholder={`Écrire à ${contact}…`}
        aria-label={`Écrire un message à ${contact}`}
        // field-sizing-content : le champ grandit avec le texte, plafonné à max-h
        className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors field-sizing-content placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
      />

      <Button
        type="button"
        size="icon"
        onClick={onEnvoyer}
        disabled={vide}
        aria-label="Envoyer le message"
        className="effet-action size-10 shrink-0"
      >
        <SendHorizontal className="size-4" />
      </Button>
    </div>
  );
}
