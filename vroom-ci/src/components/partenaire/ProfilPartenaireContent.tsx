"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, ImagePlus, KeyRound, Loader2, MapPin, Pencil, Phone, Star, X } from "lucide-react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import { api, messageErreur } from "@/lib/api";
import { estErreurAuth } from "@/lib/erreurs";
import { formaterMoisAnnee, initiales, LIBELLES_ROLE, urlPhoto } from "@/lib/utils";
import type { ReponseAvisVendeur, User } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   PROFIL PARTENAIRE — /partenaire/{concessionnaire,auto_ecole}/profil
   L'identité que Dashboard affichait avant d'être allégé : avatar, raison
   sociale, note, coordonnées. Partagé entre les deux rôles — le contenu ne
   dépend jamais du rôle, seul `LIBELLES_ROLE[utilisateur.role]` varie déjà
   tout seul. `GET /me` + `avis/vendeur/{id}`, même paire d'appels que l'ancien
   TableauBordPartenaireContent (voir recupererDonneesPartenaire, supprimé).
   ──────────────────────────────────────────────────────────────────────────── */

const recupererProfil = async (): Promise<User> => {
  const reponseMe = await api.get<{ data: User }>("me");
  const reponseAvis = await api.get<{ data: ReponseAvisVendeur }>(`avis/vendeur/${reponseMe.data.id}`);

  return {
    ...reponseMe.data,
    note_moyenne: reponseAvis.data.note_moyenne,
    nb_avis: reponseAvis.data.total,
  };
};

const ProfilPartenaireContent = () => {
  const [utilisateur, setUtilisateur] = useState<User | null>(null);
  const [chargement, setChargement] = useState(true);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);

  // bascule affichage / formulaire, cf. le bouton "Modifier" plus bas
  const [modeEdition, setModeEdition] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState("");

  // champs du formulaire — remplis à l'ouverture de l'édition par ouvrirEdition()
  const [raisonSociale, setRaisonSociale] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");

  const [envoiAvatar, setEnvoiAvatar] = useState(false);
  const [envoiCouverture, setEnvoiCouverture] = useState(false);
  const refInputAvatar = useRef<HTMLInputElement>(null);
  const refInputCouverture = useRef<HTMLInputElement>(null);

  const [dialogueMotDePasse, setDialogueMotDePasse] = useState(false);
  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
  const [envoiMotDePasse, setEnvoiMotDePasse] = useState(false);
  const [erreurMotDePasse, setErreurMotDePasse] = useState("");

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererProfil().then((resultat) => {
      if (annule) return;
      setUtilisateur(resultat);
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

  const ouvrirEdition = () => {
    if (!utilisateur) return;
    setRaisonSociale(utilisateur.raison_sociale ?? "");
    setTelephone(utilisateur.telephone ?? "");
    setAdresse(utilisateur.adresse ?? "");
    setModeEdition(true);
  };

  const annulerEdition = () => {
    setModeEdition(false);
    setErreur("");
  };

  /** Deux endpoints distincts : PUT /me/contact (telephone + adresse, déclenche un géocodage
   * côté back) et PUT /me/update (raison_sociale). */
  const enregistrerProfil = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    setErreur("");
    setEnregistrement(true);

    try {
      // deux endpoints distincts (contact déclenche un géocodage côté back sur l'adresse, voir AuthController::updatePhoneAndAddress)
      const reponseContact = await api.put<{ user: User }>("me/contact", { telephone, adresse });
      const reponseUpdate = await api.put<{ data: User }>("me/update", { raison_sociale: raisonSociale });

      setUtilisateur(
        (actuel) =>
          actuel && {
            ...actuel,
            telephone: reponseContact.user.telephone,
            adresse: reponseContact.user.adresse,
            raison_sociale: reponseUpdate.data.raison_sociale,
          }
      );
      setModeEdition(false);
    } catch (erreurCatch) {
      setErreur(
        estErreurAuth(erreurCatch)
          ? erreurCatch.message
          : "La mise à jour a échoué. Réessayez dans quelques instants."
      );
    } finally {
      setEnregistrement(false);
    }
  };

  /** avatarProfile() ne renvoie pas le nouveau chemin — on recharge le profil entier après coup. */
  const changerAvatar = async (fichier: File) => {
    setEnvoiAvatar(true);
    try {
      const donnees = new FormData();
      donnees.append("avatar", fichier);
      await api.post("me/avatar", donnees);
      setUtilisateur(await recupererProfil());
      toast.success("Photo de profil mise à jour.");
    } catch (erreurCatch) {
      toast.error(messageErreur(erreurCatch, "L'envoi de la photo a échoué."));
    } finally {
      setEnvoiAvatar(false);
      if (refInputAvatar.current) refInputAvatar.current.value = "";
    }
  };

  /** Même mécanique que changerAvatar, endpoint réservé concessionnaire/auto_ecole côté back. */
  const changerCouverture = async (fichier: File) => {
    setEnvoiCouverture(true);
    try {
      const donnees = new FormData();
      donnees.append("cover_photo", fichier);
      await api.post("me/cover-photo", donnees);
      setUtilisateur(await recupererProfil());
      toast.success("Photo de couverture mise à jour.");
    } catch (erreurCatch) {
      toast.error(messageErreur(erreurCatch, "L'envoi de la photo a échoué."));
    } finally {
      setEnvoiCouverture(false);
      if (refInputCouverture.current) refInputCouverture.current.value = "";
    }
  };

  const fermerDialogueMotDePasse = () => {
    setDialogueMotDePasse(false);
    setMotDePasseActuel("");
    setNouveauMotDePasse("");
    setConfirmationMotDePasse("");
    setErreurMotDePasse("");
  };

  const changerMotDePasse = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    setErreurMotDePasse("");
    setEnvoiMotDePasse(true);

    try {
      await api.put("me/change-password", {
        current_password: motDePasseActuel,
        new_password: nouveauMotDePasse,
        new_password_confirmation: confirmationMotDePasse,
      });
      fermerDialogueMotDePasse();
      toast.success("Mot de passe modifié avec succès.");
    } catch (erreurCatch) {
      setErreurMotDePasse(messageErreur(erreurCatch, "La modification a échoué."));
    } finally {
      setEnvoiMotDePasse(false);
    }
  };

  if (chargement || !utilisateur) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="mt-8 h-40 w-full" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold md:text-3xl">Profil</h1>
        <div className="flex items-center gap-2">
          {!modeEdition && (
            <Button type="button" variant="outline" onClick={ouvrirEdition} className="effet-action">
              <Pencil className="size-4" />
              Modifier
            </Button>
          )}
          {utilisateur.auth_provider !== "google" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogueMotDePasse(true)}
              className="effet-action"
            >
              <KeyRound className="size-4" />
              Mot de passe
            </Button>
          )}
          <BoutonRecharger onClick={recharger} chargement={chargement} />
        </div>
      </div>

      {/* Photo de couverture — réservée concessionnaire/auto_ecole côté back (coverProfile) */}
      <div className="relative mt-8 h-32 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 sm:h-40">
        {utilisateur.cover_photo && (
          <img
            src={urlPhoto(utilisateur.cover_photo)}
            alt=""
            className="size-full object-cover"
          />
        )}
        <button
          type="button"
          disabled={envoiCouverture}
          onClick={() => refInputCouverture.current?.click()}
          className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-background disabled:opacity-60"
        >
          {envoiCouverture ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
          Couverture
        </button>
      </div>
      <input
        ref={refInputCouverture}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(evenement) => {
          const fichier = evenement.target.files?.[0];
          if (fichier) changerCouverture(fichier);
        }}
        className="hidden"
      />
      <input
        ref={refInputAvatar}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(evenement) => {
          const fichier = evenement.target.files?.[0];
          if (fichier) changerAvatar(fichier);
        }}
        className="hidden"
      />

      {modeEdition && (
        <form
          onSubmit={enregistrerProfil}
          className="mt-8 flex flex-col gap-4 rounded-2xl border border-border p-6 sm:p-8"
        >
          {erreur && (
            <p role="alert" className="text-sm text-destructive">
              {erreur}
            </p>
          )}

          <div>
            <label htmlFor="raison_sociale" className="text-sm font-medium">
              Raison sociale
            </label>
            <Input
              id="raison_sociale"
              value={raisonSociale}
              onChange={(evenement) => setRaisonSociale(evenement.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <label htmlFor="telephone" className="text-sm font-medium">
              Téléphone
            </label>
            <Input
              id="telephone"
              value={telephone}
              onChange={(evenement) => setTelephone(evenement.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <label htmlFor="adresse" className="text-sm font-medium">
              Adresse
            </label>
            <Input
              id="adresse"
              value={adresse}
              onChange={(evenement) => setAdresse(evenement.target.value)}
              className="mt-2"
            />
          </div>

          <div className="mt-2 flex gap-2">
            <Button type="submit" disabled={enregistrement} className="effet-action">
              {enregistrement ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={annulerEdition}
              disabled={enregistrement}
              className="effet-action"
            >
              <X className="size-4" />
              Annuler
            </Button>
          </div>
        </form>
      )}

      {!modeEdition && (
      <section className="mt-8 flex flex-col gap-6 rounded-2xl border border-border p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="relative shrink-0">
          {/* <img> et non <Image> : l'avatar vient du backend, absent des remotePatterns de next.config.ts */}
          {utilisateur.avatar ? (
            <img
              src={urlPhoto(utilisateur.avatar)}
              alt=""
              className="size-20 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-full bg-primary font-heading text-2xl font-bold text-primary-foreground">
              {initiales(utilisateur.fullname)}
            </span>
          )}
          <button
            type="button"
            disabled={envoiAvatar}
            onClick={() => refInputAvatar.current?.click()}
            aria-label="Changer la photo de profil"
            className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {envoiAvatar ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
          </button>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-heading text-xl font-bold md:text-2xl">
              {utilisateur.raison_sociale || utilisateur.fullname}
            </h2>
            <Badge variant="secondary">{LIBELLES_ROLE[utilisateur.role]}</Badge>
          </div>
          {utilisateur.raison_sociale && (
            <p className="mt-0.5 text-sm text-muted-foreground">{utilisateur.fullname}</p>
          )}

          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
              <Star className="size-4 fill-primary text-primary" />
              {utilisateur.note_moyenne.toFixed(1)}
              <span className="font-normal text-muted-foreground">
                ({utilisateur.nb_avis} avis)
              </span>
            </span>
            {utilisateur.adresse && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-3.5" />
                {utilisateur.adresse}
              </span>
            )}
            {utilisateur.telephone && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Phone className="size-3.5" />
                {utilisateur.telephone}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Membre depuis {formaterMoisAnnee(utilisateur.membre_since)}
          </p>
        </div>
      </section>
      )}

      <Dialog open={dialogueMotDePasse} onOpenChange={(ouvert) => !ouvert && fermerDialogueMotDePasse()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
            <DialogDescription>Le nouveau mot de passe doit faire au moins 8 caractères.</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={changerMotDePasse}
            className="space-y-4"
          >
            {erreurMotDePasse && (
              <p role="alert" className="text-sm text-destructive">
                {erreurMotDePasse}
              </p>
            )}

            <div>
              <label htmlFor="mot-de-passe-actuel" className="text-sm font-medium">
                Mot de passe actuel
              </label>
              <Input
                id="mot-de-passe-actuel"
                type="password"
                value={motDePasseActuel}
                onChange={(evenement) => setMotDePasseActuel(evenement.target.value)}
                className="mt-2"
                required
              />
            </div>

            <div>
              <label htmlFor="nouveau-mot-de-passe" className="text-sm font-medium">
                Nouveau mot de passe
              </label>
              <Input
                id="nouveau-mot-de-passe"
                type="password"
                minLength={8}
                value={nouveauMotDePasse}
                onChange={(evenement) => setNouveauMotDePasse(evenement.target.value)}
                className="mt-2"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmation-mot-de-passe" className="text-sm font-medium">
                Confirmer le nouveau mot de passe
              </label>
              <Input
                id="confirmation-mot-de-passe"
                type="password"
                minLength={8}
                value={confirmationMotDePasse}
                onChange={(evenement) => setConfirmationMotDePasse(evenement.target.value)}
                className="mt-2"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={fermerDialogueMotDePasse}
                disabled={envoiMotDePasse}
                className="effet-action"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={envoiMotDePasse} className="effet-action">
                {envoiMotDePasse ? "Modification…" : "Modifier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default ProfilPartenaireContent;
