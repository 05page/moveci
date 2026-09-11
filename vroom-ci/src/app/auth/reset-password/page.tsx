"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { estErreurAuth } from "@/lib/erreurs";
import { ArrowLeft, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type SubmitEvent } from "react";

const LONGUEUR_MINIMALE = 8;

type DonneesReset = {
  token: string;
  email: string;
  password: string;
  /** Nom imposé par la règle Laravel `confirmed` (PasswordResetController:80). */
  password_confirmation: string;
};

/** Même contrat que POST /api/reset-password (PasswordResetController::resetPassword). */
const reinitialiserMotDePasse = (donnees: DonneesReset): Promise<{ message: string }> =>
  api.post<{ message: string }>("reset-password", donnees);

/**
 * useSearchParams() ne peut pas être résolu au build : les query params n'existent
 * qu'à la requête. Next tente quand même de prérendre la page, échoue, et
 * `next build` s'arrête — alors que `pnpm dev` ne dit rien.
 *
 * D'où ce découpage : le <Suspense> marque la frontière à partir de laquelle Next
 * accepte un rendu client uniquement. C'est le seul cas du projet où une erreur
 * apparaît au build sans jamais apparaître en dev.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<EcranAttente />}>
      <FormulaireReset />
    </Suspense>
  );
}

function EcranAttente() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md items-center px-5 py-12">
      <p className="text-sm text-muted-foreground">Chargement…</p>
    </main>
  );
}

function FormulaireReset() {
  const parametres = useSearchParams();
  const token = parametres.get("token");
  const email = parametres.get("email");

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [etat, setEtat] = useState<"idle" | "envoi" | "succes" | "bloque">("idle");
  const [message, setMessage] = useState("");
  const [erreurChamp, setErreurChamp] = useState("");

  const soumettre = async (evenement: SubmitEvent<HTMLFormElement>) => {
    evenement.preventDefault();

    // le garde-fou du rendu garantit token/email non nuls, TypeScript l'ignore ici
    if (!token || !email) return;

    if (motDePasse.length < LONGUEUR_MINIMALE) {
      setErreurChamp(`Le mot de passe doit contenir au moins ${LONGUEUR_MINIMALE} caractères.`);
      return;
    }

    // vérifié ici en plus du serveur : évite un aller-retour pour une faute de frappe
    if (motDePasse !== confirmation) {
      setErreurChamp("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    setErreurChamp("");
    setEtat("envoi");

    try {
      const reponse = await reinitialiserMotDePasse({
        token,
        email,
        password: motDePasse,
        password_confirmation: confirmation,
      });
      setMessage(reponse.message);
      setEtat("succes");
    } catch (erreur) {
      setMessage(
        estErreurAuth(erreur)
          ? erreur.message
          : "Une erreur est survenue. Réessayez dans quelques instants."
      );
      setEtat("bloque");
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md items-center px-5 py-12">
      <div className="w-full">
        <Link
          href="/auth"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Retour à la connexion
        </Link>

        {/* Lien tronqué par un client mail : on n'affiche pas un formulaire condamné d'avance */}
        {!token || !email ? (
          <div className="mt-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" />
            </div>
            <h1 className="mt-5 text-2xl font-bold">Lien incomplet</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ce lien de réinitialisation est incomplet ou a expiré. Demandez-en un nouveau,
              il reste valable 60 minutes.
            </p>
            <Link
              href="/auth/forgot-password"
              className="mt-6 inline-block text-sm font-semibold underline underline-offset-4 hover:text-primary"
            >
              Demander un nouveau lien
            </Link>
          </div>
        ) : etat === "succes" ? (
          <div className="mt-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <ShieldCheck className="size-6" />
            </div>
            <h1 className="mt-5 text-2xl font-bold">Mot de passe modifié</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            {/* resetPassword révoque tous les tokens Sanctum : le prévenir évite un faux bug */}
            <p className="mt-4 text-sm text-muted-foreground">
              Par sécurité, vous avez été déconnecté de tous vos autres appareils.
            </p>
            <Link
              href="/auth"
              className="mt-6 inline-block text-sm font-semibold underline underline-offset-4 hover:text-primary"
            >
              Se connecter
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-bold">Nouveau mot de passe</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Vous modifiez le mot de passe du compte{" "}
              <span className="font-semibold text-foreground">{email}</span>.
            </p>

            {etat === "bloque" && (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm"
              >
                <p>{message}</p>
                {/* le token est mort : le resoumettre échouerait à l'identique */}
                <Link
                  href="/auth/forgot-password"
                  className="mt-2 inline-block font-semibold underline underline-offset-4"
                >
                  Demander un nouveau lien
                </Link>
              </div>
            )}

            <form onSubmit={soumettre} className="mt-6 space-y-4">
              <div>
                <label htmlFor="password" className="text-sm font-medium">
                  Nouveau mot de passe
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={LONGUEUR_MINIMALE}
                  autoComplete="new-password"
                  value={motDePasse}
                  onChange={(evenement) => setMotDePasse(evenement.target.value)}
                  className="mt-2 h-11"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {LONGUEUR_MINIMALE} caractères minimum.
                </p>
              </div>

              <div>
                <label htmlFor="password_confirmation" className="text-sm font-medium">
                  Confirmer le mot de passe
                </label>
                <Input
                  id="password_confirmation"
                  name="password_confirmation"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(evenement) => setConfirmation(evenement.target.value)}
                  aria-invalid={erreurChamp !== ""}
                  aria-describedby={erreurChamp ? "erreur-champ" : undefined}
                  className="mt-2 h-11"
                />
                {erreurChamp && (
                  <p id="erreur-champ" className="mt-2 text-sm text-destructive">
                    {erreurChamp}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={etat === "envoi"}
                className="effet-action w-full"
              >
                {etat === "envoi" ? "Enregistrement…" : "Changer mon mot de passe"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
