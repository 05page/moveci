"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingBag, Tag, type LucideIcon } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn, initiales } from "@/lib/utils";
import { onboardingSchema, type OnboardingFormData } from "@/lib/validation";
import type { ErreurAuth, User } from "@/types";

/* ────────────────────────────────────────────────────────────────────────────
   ONBOARDING — /auth/onboarding
   Dernière étape après une première connexion Google (needs_onboarding=true,
   voir api/auth/callback/route.ts) : le compte existe déjà (role=null côté
   back), il ne manque que le choix client/vendeur, le téléphone et l'adresse.
   Un pro (concessionnaire/auto_ecole) ne passe jamais par ici — Google est
   désactivé pour ces profils sur /auth (googleAutorise: false).
   ──────────────────────────────────────────────────────────────────────────── */

type OptionRole = {
  valeur: "client" | "vendeur";
  libelle: string;
  aide: string;
  icone: LucideIcon;
};

const OPTIONS_ROLE: OptionRole[] = [
  {
    valeur: "client",
    libelle: "J'achète",
    aide: "Chercher un véhicule, poser des questions, prendre rendez-vous.",
    icone: ShoppingBag,
  },
  {
    valeur: "vendeur",
    libelle: "Je vends",
    aide: "Publier mes annonces et recevoir des demandes de rendez-vous.",
    icone: Tag,
  },
];

/** Où atterrir une fois l'onboarding terminé — un sous-ensemble de DESTINATION_PAR_ROLE (/auth) : seuls client/vendeur sortent d'ici. */
const DESTINATION_PAR_ROLE: Record<"client" | "vendeur", string> = {
  client: "/client/profile",
  vendeur: "/vendeur/profile",
};

/** Champ texte + label + message d'erreur — même coquille que ChampTexte de /auth, dupliquée : deux champs seulement ici, une import cross-fichier coûterait plus cher. */
function ChampTexte({
  id,
  label,
  erreur,
  ...props
}: React.ComponentProps<"input"> & { id: string; label: string; erreur?: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        name={id}
        className="mt-1.5"
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `erreur-${id}` : undefined}
        {...props}
      />
      {erreur && (
        <p id={`erreur-${id}`} className="mt-1.5 text-xs text-destructive">
          {erreur}
        </p>
      )}
    </div>
  );
}

/** Zod et Laravel rendent tous deux un TABLEAU de messages par champ ; on ne garde que le premier. */
function premierMessage<T extends string>(
  erreurs: Record<string, string[] | undefined>
): Partial<Record<T, string>> {
  return Object.fromEntries(
    Object.entries(erreurs)
      .filter(([, messages]) => messages && messages.length > 0)
      .map(([champ, messages]) => [champ, messages![0]])
  ) as Partial<Record<T, string>>;
}

/** POST /api/auth/complete-onboarding (route dédiée, pas /api/proxy/* : elle doit aussi rafraîchir le cookie user_role). */
const terminerOnboarding = async (
  donnees: OnboardingFormData
): Promise<{ data: { user: User; role: "client" | "vendeur" } }> => {
  const reponse = await fetch("/api/auth/complete-onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(donnees),
  });
  if (!reponse.ok) throw (await reponse.json()) as ErreurAuth;
  return reponse.json();
};

export default function PageOnboarding() {
  const router = useRouter();
  const [utilisateur, setUtilisateur] = useState<User | null>(null);
  const [donnees, setDonnees] = useState<OnboardingFormData>({
    telephone: "",
    adresse: "",
    role: "client",
  });
  const [erreurs, setErreurs] = useState<Partial<Record<keyof OnboardingFormData, string>>>({});
  const [erreurGlobale, setErreurGlobale] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    // meilleur effort : une 401 ici (session expirée entre l'OAuth et cet écran) laisse juste le prénom absent, pas une page cassée
    api
      .get<{ data: User }>("me")
      .then((reponse) => setUtilisateur(reponse.data))
      .catch(() => {});
  }, []);

  const majChamp =
    (champ: "telephone" | "adresse") =>
      (evenement: React.ChangeEvent<HTMLInputElement>) =>
        setDonnees((actuelles) => ({ ...actuelles, [champ]: evenement.target.value }));

  const soumettre = (evenement: React.FormEvent) => {
    evenement.preventDefault();
    setErreurGlobale(null);
    setErreurs({});

    const resultat = onboardingSchema.safeParse(donnees);
    if (!resultat.success) {
      const { fieldErrors } = z.flattenError(resultat.error);
      setErreurs(premierMessage<keyof OnboardingFormData>(fieldErrors));
      return;
    }

    setEnCours(true);

    terminerOnboarding(resultat.data)
      .then(({ data }) => {
        router.push(DESTINATION_PAR_ROLE[data.role]);
        // sans lui, layout.tsx (Server Component, cookies lus une seule fois) garde
        // le Header affiché pour l'ancien rôle jusqu'à un vrai rechargement
        router.refresh();
      })
      .catch((erreur: ErreurAuth) => {
        if (erreur.status === 422 && erreur.errors) {
          setErreurs(premierMessage<keyof OnboardingFormData>(erreur.errors));
          return;
        }
        setErreurGlobale(erreur.message ?? "Une erreur est survenue. Réessayez.");
      })
      .finally(() => setEnCours(false));
  };

  return (
    <main className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      {/* Panneau visuel : masqué sous lg, même image que /auth pour rester dans la même famille visuelle */}
      <aside className="relative hidden lg:block">
        <Image
          fill
          src="/vendeur.jpg"
          alt=""
          sizes="50vw"
          className="object-cover"
          style={{ objectPosition: "52% center" }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/45 to-black/20" />
        <div className="absolute inset-x-0 bottom-16 px-12 text-white">
          <h2 className="font-heading text-3xl font-bold">Encore une étape</h2>
          <p className="mt-3 max-w-md text-sm text-white/80">
            Votre compte Google est relié — il ne manque plus que quelques
            informations pour accéder à tout le marché.
          </p>
        </div>
      </aside>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-4">
            {/* <img> et non <Image> : l'avatar vient de Google, absent des remotePatterns */}
            {utilisateur?.avatar ? (
              <img
                src={utilisateur.avatar}
                alt=""
                className="size-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground">
                {utilisateur ? initiales(utilisateur.fullname) : ""}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">
                {utilisateur ? `Bienvenue, ${utilisateur.fullname.split(" ")[0]}` : "Bienvenue"}
              </h1>
              <p className="text-sm text-muted-foreground">Terminons votre profil.</p>
            </div>
          </div>

          <form onSubmit={soumettre} noValidate className="mt-8 space-y-5">
            <fieldset>
              <legend className="text-sm font-medium">Vous êtes</legend>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {OPTIONS_ROLE.map((option) => {
                  const Icone = option.icone;
                  const actif = donnees.role === option.valeur;

                  return (
                    // le <input> est en sr-only : invisible mais toujours focusable au clavier
                    <label
                      key={option.valeur}
                      className={cn(
                        "cursor-pointer rounded-2xl border p-4 transition-colors",
                        actif
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={option.valeur}
                        checked={actif}
                        onChange={() =>
                          setDonnees((actuelles) => ({ ...actuelles, role: option.valeur }))
                        }
                        className="sr-only"
                      />
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Icone className="size-4" />
                        {option.libelle}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {option.aide}
                      </span>
                    </label>
                  );
                })}
              </div>
              {erreurs.role && (
                <p className="mt-1.5 text-xs text-destructive">{erreurs.role}</p>
              )}
            </fieldset>

            <ChampTexte
              id="telephone"
              label="Téléphone"
              type="tel"
              autoComplete="tel"
              placeholder="0708091011"
              value={donnees.telephone}
              onChange={majChamp("telephone")}
              erreur={erreurs.telephone}
            />

            <ChampTexte
              id="adresse"
              label="Adresse"
              autoComplete="street-address"
              placeholder="Cocody, Abidjan"
              value={donnees.adresse}
              onChange={majChamp("adresse")}
              erreur={erreurs.adresse}
            />

            {erreurGlobale && (
              <p
                role="alert"
                className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {erreurGlobale}
              </p>
            )}

            <Button type="submit" size="lg" className="effet-action w-full" disabled={enCours}>
              {enCours ? "Enregistrement…" : "Terminer mon inscription"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
