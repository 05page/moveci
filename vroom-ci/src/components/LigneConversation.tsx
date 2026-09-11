"use client";

import { Car } from "lucide-react";

import { cn, horodatageCourt, urlPhoto } from "@/lib/utils";
import { libelleVehicule, photoPrincipale } from "@/lib/vehicule";
import type { Conversation } from "@/types";

/**
 * Une ligne du panneau gauche de /messages.
 *
 * Trois informations empilées, par ordre d'importance décroissante : avec QUI,
 * à propos de QUEL véhicule, et le dernier mot échangé. Le véhicule n'est pas
 * décoratif — deux conversations avec le même vendeur sur deux annonces
 * différentes sont deux lignes distinctes, c'est la clé unique côté Laravel.
 */
export type LigneConversationProps = {
  conversation: Conversation;
  /** Id de l'utilisateur courant : décide du préfixe « Vous : » sur l'aperçu. */
  moiId: string;
  active: boolean;
  onOuvrir: (id: string) => void;
};

export default function LigneConversation({
  conversation,
  moiId,
  active,
  onOuvrir,
}: LigneConversationProps) {
  const {
    vehicule,
    other_participant: contact,
    last_message: dernier,
  } = conversation;

  const photo = photoPrincipale(vehicule.photos);
  const nonLus = conversation.unread_count;

  return (
    <button
      type="button"
      onClick={() => onOuvrir(conversation.id)}
      aria-current={active ? "true" : undefined}
      className={cn(
        // border-l-2 en permanence : sans elle, la ligne active décalerait le texte de 2px
        // last:border-b-0 : sinon un trait flotte sous la dernière ligne, dans le vide
        "flex w-full items-center gap-3 border-l-2 border-b border-b-border px-4 py-3 text-left transition-colors last:border-b-0",
        active
          ? "border-l-primary bg-secondary"
          : "border-l-transparent hover:bg-secondary/60"
      )}
    >
      <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
        {photo ? (
          // <img> et non <Image> : les photos viennent du backend, absent des remotePatterns
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

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm",
              nonLus > 0 ? "font-bold" : "font-semibold"
            )}
          >
            {contact.fullname}
          </span>

          {/* shrink-0 : l'heure ne doit jamais être rognée au profit du nom */}
          <span className="shrink-0 text-[0.6875rem] tabular-nums text-muted-foreground">
            {conversation.last_message_at
              ? horodatageCourt(conversation.last_message_at)
              : ""}
          </span>
        </span>

        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {libelleVehicule(vehicule.description, vehicule.id)}
        </span>

        <span className="mt-1 flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-xs",
              nonLus > 0 ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {dernier ? (
              <>
                {dernier.sender_id === moiId && (
                  <span className="text-muted-foreground">Vous : </span>
                )}
                {dernier.content}
              </>
            ) : (
              <span className="italic">Aucun message échangé</span>
            )}
          </span>

          {nonLus > 0 && (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[0.6875rem] font-bold tabular-nums text-primary-foreground">
              {nonLus}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
