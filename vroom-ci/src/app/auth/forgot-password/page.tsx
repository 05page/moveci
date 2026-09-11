"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { estBlocante, estErreurAuth } from "@/lib/erreurs";
import { ArrowLeft, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, type SubmitEvent } from "react";

/** Même contrat que POST /api/forgot-password (PasswordResetController::sendResetLink). */
const demanderLienReset = (email: string): Promise<{ message: string }> =>
  api.post<{ message: string }>("forgot-password", { email });

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"idle" | "envoi" | "envoye" | "bloque">("idle");
  const [message, setMessage] = useState("");
  const [erreurEmail, setErreurEmail] = useState("");

  const soumettre = async (evenement: SubmitEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    setEtat("envoi");
    setErreurEmail("");
    setMessage("");

    try {
      const reponse = await demanderLienReset(email);
      setMessage(reponse.message);
      setEtat("envoye");
    } catch (erreur) {
      if (!estErreurAuth(erreur)) {
        setMessage("Une erreur est survenue. Réessayez dans quelques instants.");
        setEtat("bloque");
        return;
      }

      // faute de saisie : on repasse en "idle" pour que le champ reste corrigeable
      if (erreur.errors?.email) {
        setErreurEmail(erreur.errors.email[0]);
        setEtat("idle");
        return;
      }

      setMessage(erreur.message);
      setEtat(estBlocante(erreur) ? "bloque" : "idle");
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

        {etat === "envoye" ? (
          <div className="mt-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <MailCheck className="size-6" />
            </div>

            <h1 className="mt-5 text-2xl font-bold">Vérifiez votre boîte mail</h1>

            {/* le message vient du back : il ne dit pas si le compte existe, c'est voulu */}
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Le lien envoyé à <span className="font-semibold text-foreground">{email}</span>{" "}
              expire dans 60 minutes.
            </p>

            <button
              type="button"
              onClick={() => setEtat("idle")}
              className="mt-6 text-sm font-semibold underline underline-offset-4 hover:text-primary"
            >
              Je n&apos;ai rien reçu, réessayer
            </button>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-bold">Mot de passe oublié</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Saisissez l&apos;adresse de votre compte. Vous recevrez un lien pour choisir un
              nouveau mot de passe.
            </p>

            {etat === "bloque" && (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm"
              >
                <p>{message}</p>
                {/* réessayer donnerait la même erreur : on propose la seule action utile */}
                <Link
                  href="/auth"
                  className="mt-2 inline-block font-semibold underline underline-offset-4"
                >
                  Aller à la connexion
                </Link>
              </div>
            )}

            <form onSubmit={soumettre} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium">
                  Adresse email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(evenement) => setEmail(evenement.target.value)}
                  aria-invalid={erreurEmail !== ""}
                  aria-describedby={erreurEmail ? "erreur-email" : undefined}
                  placeholder="vous@exemple.ci"
                  className="mt-2 h-11"
                />
                {erreurEmail && (
                  <p id="erreur-email" className="mt-2 text-sm text-destructive">
                    {erreurEmail}
                  </p>
                )}
              </div>

              {/* disabled pendant l'envoi : trois clics = trois tokens, seul le dernier marche */}
              <Button
                type="submit"
                size="lg"
                disabled={etat === "envoi"}
                className="effet-action w-full"
              >
                {etat === "envoi" ? "Envoi en cours…" : "Envoyer le lien"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
