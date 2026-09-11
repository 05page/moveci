"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import type { ErreurAuth, ReponseAuth, RoleUser, User } from "@/types";
import { Building2, ChevronLeft, ChevronRight, Eye, EyeOff, ShieldAlert, ShoppingBag, Tag, GraduationCap, UserRound, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { Suspense, useState } from "react";
import { LoginFormData, loginSchema, RegisterFormData, registerSchema, ROLES_PRO } from "@/lib/validation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { z } from "zod";

/**
 * Route Socialite du backend. Elle vit dans routes/web.php et NON routes/api.php :
 * il n'y a donc pas de préfixe /api ici (vérifié avec php artisan route:list).
 */
const URL_GOOGLE = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/google/redirect`;

/** Logo Google officiel. Lucide ne fournit aucune icône de marque, il faut le SVG. */
function IconeGoogle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.28a12 12 0 0 0 0 10.77l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.95 1.18 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.1C6.23 6.87 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}

/** Champ texte + label + message d'erreur. Les props restantes vont au <input>. */
function ChampTexte({
  id,
  label,
  erreur,
  aide,
  ...props
}: React.ComponentProps<"input"> & { id: string; label: string; erreur?: string; aide?: string }) {
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
        aria-describedby={erreur ? `erreur-${id}` : aide ? `aide-${id}` : undefined}
        {...props}
      />
      {erreur ? (
        <p id={`erreur-${id}`} className="mt-1.5 text-xs text-destructive">
          {erreur}
        </p>
      ) : (
        aide && (
          <p id={`aide-${id}`} className="mt-1.5 text-xs text-muted-foreground">
            {aide}
          </p>
        )
      )}
    </div>
  );
}

/** Champ mot de passe. La visibilité est un state LOCAL : deux champs se basculent séparément. */
function ChampMotDePasse({
  id,
  label,
  erreur,
  ...props
}: React.ComponentProps<"input"> & { id: string; label: string; erreur?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>

      <div className="relative mt-1.5">
        <Input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          placeholder="••••••••"
          className="pr-10"
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? `erreur-${id}` : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((ouvert) => !ouvert)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {erreur && (
        <p id={`erreur-${id}`} className="mt-1.5 text-xs text-destructive">
          {erreur}
        </p>
      )}
    </div>
  );
}

type OptionRole = {
  /** Dérivé du schéma : `admin` en est exclu, impossible de le mettre ici par erreur. */
  valeur: RegisterFormData["role"];
  libelle: string;
  /** Phrase qui aide à choisir, à la 1re personne : "Je vends mon véhicule". */
  aide: string;
  icone: LucideIcon;
};

type ProfilInscription = {
  id: "particulier" | "pro";
  libelle: string;
  description: string;
  icone: LucideIcon;
  roles: OptionRole[];
  googleAutorise: boolean;
  /** `raison_sociale` est required_if:role,concessionnaire,auto_ecole (register:156). */
  raisonSocialeRequise: boolean;
  validationAdmin: boolean;
};

const PROFILS_INSCRIPTION: ProfilInscription[] = [
  {
    id: "particulier",
    libelle: "Particulier",
    description: "Vous achetez ou vous vendez votre propre véhicule.",
    icone: UserRound,
    googleAutorise: true,
    raisonSocialeRequise: false,
    validationAdmin: false,
    roles: [
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
    ],
  },
  {
    id: "pro",
    libelle: "Professionnel",
    description: "Vous représentez une concession ou une auto-école agréée.",
    icone: Building2,
    googleAutorise: false,
    raisonSocialeRequise: true,
    validationAdmin: true,
    roles: [
      {
        valeur: "concessionnaire",
        libelle: "Concession",
        aide: "Gérer un stock de véhicules et suivre les ventes.",
        icone: Building2,
      },
      {
        valeur: "auto_ecole",
        libelle: "Auto-école",
        aide: "Publier des formations au permis et gérer les inscrits.",
        icone: GraduationCap,
      },
    ],
  },
];

/**
 * Zod et Laravel rendent tous deux un TABLEAU de messages par champ. Les states
 * d'erreur n'en veulent qu'un : on garde le premier et on jette les champs vides.
 */
function premierMessage<T extends string>(
  erreurs: Record<string, string[] | undefined>
): Partial<Record<T, string>> {
  return Object.fromEntries(
    Object.entries(erreurs)
      .filter(([, messages]) => messages && messages.length > 0)
      .map(([champ, messages]) => [champ, messages![0]])
  ) as Partial<Record<T, string>>;
}

/** Où atterrit chacun après connexion. Record = un rôle oublié ne compile pas. */
const DESTINATION_PAR_ROLE: Record<RoleUser, string> = {
  client: "/client/profile",
  vendeur: "/vendeur/profile",
  concessionnaire: "/partenaire/concessionnaire/dashboard",
  auto_ecole: "/partenaire/auto_ecole/dashboard",
  admin: "/",
};

/** Sans délai, isLoading passe à true puis false dans le même tick : invisible. */
const DELAI_RESEAU = 700;

/** Emails sentinelles : ils forcent un échec, pour tester l'affichage des erreurs. */
const EMAIL_COMPTE_BLOQUE = "bloque@test.ci";
const EMAIL_DEJA_PRIS = "pris@test.ci";

/** Fabrique un User plausible. Le vrai viendra de la réponse Laravel. */
function faussUser(email: string, fullname: string, role: RoleUser): User {
  return {
    id: "9d4e2f1a-6c3b-4a71-8e15-2b7f0c9d4e11",
    fullname,
    email,
    avatar: null,
    role,
    statut: "actif",
    membre_since: new Date().toISOString(),
    note_moyenne: 0,
    nb_avis: 0,
  };
}

/**
 * POST /api/auth/login — PAS /api/proxy/login : cette route dédiée pose le
 * cookie httpOnly côté serveur (voir app/api/auth/login/route.ts), le proxy
 * générique se contente de relayer sans jamais toucher aux cookies.
 */
const connecter = async (email: string, motDePasse: string): Promise<ReponseAuth> => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: motDePasse })
  });
  if (!response.ok) throw (await response.json()) as ErreurAuth;
  return (await response.json()) as ReponseAuth;
};

/**
 * POST /api/register simulé. Le 422 porte `errors` champ par champ : c'est là
 * qu'arrive "email déjà pris", que Zod ne peut pas connaître côté client.
 */
const inscrire = async (donnees: RegisterFormData): Promise<ReponseAuth> => {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(donnees)
  });
  if (!response.ok) throw (await response.json()) as ErreurAuth;
  return (await response.json()) as ReponseAuth;
};

const ContenuAuth = () => {

  const router = useRouter();
  const parametres = useSearchParams();
  const modeInitial = parametres.get('mode') === "inscription" ? "inscription" : "connexion";
  const [mode, setMode] = useState<"connexion" | "inscription">(modeInitial);
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormdata] = useState<LoginFormData>({
    email: "",
    password: ""
  })
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [profilId, setProfilId] = useState<ProfilInscription["id"] | null>(null);
  const profil = PROFILS_INSCRIPTION.find((candidat) => candidat.id === profilId) ?? null;

  const [registerData, setRegisterData] = useState<RegisterFormData>({
    fullname: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: "client",
    raison_sociale: "",
    telephone: "",
    adresse: "",
  });
  const [registerErrors, setRegisterErrors] = useState<
    Partial<Record<keyof RegisterFormData, string>>
  >({});

  /** Handler curryfié : majChamp("email") RENVOIE le onChange du champ email. */
  const majChamp =
    (champ: keyof RegisterFormData) =>
      (evenement: React.ChangeEvent<HTMLInputElement>) =>
        setRegisterData((donnees) => ({ ...donnees, [champ]: evenement.target.value }));

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRegisterErrors({});

    const result = registerSchema.safeParse(registerData);

    // 8.1 — setRegisterErrors et NON setFieldErrors : ce dernier est le state de la connexion
    if (!result.success) {
      const { fieldErrors } = z.flattenError(result.error);
      setRegisterErrors(premierMessage<keyof RegisterFormData>(fieldErrors));
      return;
    }

    // 8.4 — la règle vient du RÔLE (comme le required_if de Laravel), pas de l'écran.
    // Sans ce nettoyage, une chaîne vide part au back et pollue la base.
    const donnees = { ...result.data };
    const estPro = ROLES_PRO.includes(donnees.role as (typeof ROLES_PRO)[number]);

    if (!estPro) delete donnees.raison_sociale;
    if (!donnees.telephone) delete donnees.telephone;
    if (!donnees.adresse) delete donnees.adresse;

    setIsLoading(true);

    inscrire(donnees)
      .then((reponse) => {
        // 8.5 — un pro naît en_attente (register:161) : son tableau de bord lui
        // renverrait un 403. Il va sur un écran d'attente, pas sur son espace.
        router.push(
          estPro ? "/auth/verification" : DESTINATION_PAR_ROLE[reponse.role]
        );
        // Même raison que dans handleLogoinSubmit : forcer le layout racine
        // à relire les cookies fraîchement posés.
        router.refresh();
      })
      .catch((erreur: ErreurAuth) => {
        // 8.6 — "email déjà pris" n'existe QUE côté serveur : Zod ne peut pas le savoir
        if (erreur.status === 422 && erreur.errors) {
          setRegisterErrors(premierMessage<keyof RegisterFormData>(erreur.errors));
          return;
        }

        setError(erreur.message ?? "Une erreur est survenue. Réessayez.");
      })
      // 8.7 — sans finally, un rejet laisserait le bouton désactivé à vie
      .finally(() => setIsLoading(false));
  };

  const handleLogoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const result = loginSchema.safeParse(formData);

    // 7.2 — flattenError ne s'appelle QUE dans la branche d'échec : ailleurs,
    // result.error n'existe pas. `?.[0]` car Zod rend un tableau par champ.
    if (!result.success) {
      const { fieldErrors: erreursZod } = z.flattenError(result.error);

      setFieldErrors({
        email: erreursZod.email?.[0],
        password: erreursZod.password?.[0],
      });
      return;
    }

    setIsLoading(true);

    // 7.4 — result.data et non formData : typé, nettoyé, transformé
    connecter(result.data.email, result.data.password)
      .then((reponse) => {
        // 7.5 — le back renvoie le rôle, la table dit où il atterrit
        router.push(DESTINATION_PAR_ROLE[reponse.role]);
        // router.refresh() : sans lui, layout.tsx (Server Component, cookies
        // lus une seule fois) reste sur son ancien rendu — le Header continue
        // d'afficher "Connexion" jusqu'à un vrai rechargement de page.
        router.refresh();
      })
      .catch((erreur: ErreurAuth) => {
        // 7.6 — un 422 désigne des CHAMPS, tout le reste est un message global
        if (erreur.status === 422 && erreur.errors) {
          setFieldErrors({
            email: erreur.errors.email?.[0],
            password: erreur.errors.password?.[0],
          });
          return;
        }

        setError(erreur.message ?? "Une erreur est survenue. Réessayez.");
      })
      // 7.7 — sans finally, un rejet laisserait le bouton désactivé à vie
      .finally(() => setIsLoading(false));
  };
  return (
    <main className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      {/* Panneau visuel : masqué sous lg, il n'apporte rien sur mobile et coûte une image */}
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
          <h2 className="font-heading text-3xl font-bold">
            Un compte, tout le marché automobile ivoirien
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/80">
            Acheter, vendre, louer ou se former : le même compte vous suit partout.
          </p>
        </div>
      </aside>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">
              {mode === "connexion" ? "Connexion" : "Créer un compte"}
            </h1>
          </div>

          {/* noValidate coupe les bulles natives du navigateur, qui doubleraient les messages Zod */}
          {mode === "connexion" && (
            <form onSubmit={handleLogoinSubmit} noValidate className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.ci"
                  className="mt-1.5"
                  value={formData.email}
                  onChange={(evenement) =>
                    setFormdata({ ...formData, email: evenement.target.value })
                  }
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={fieldErrors.email ? "erreur-email" : undefined}
                />
                {fieldErrors.email && (
                  <p id="erreur-email" className="mt-1.5 text-xs text-destructive">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="password" className="text-sm font-medium">
                    Mot de passe
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="lien-anime text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>

                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pr-10"
                    value={formData.password}
                    onChange={(evenement) =>
                      setFormdata({ ...formData, password: evenement.target.value })
                    }
                    aria-invalid={fieldErrors.password ? true : undefined}
                    aria-describedby={
                      fieldErrors.password ? "erreur-password" : undefined
                    }
                  />
                  {/* type="button" obligatoire : sans lui un <button> dans un <form> soumet */}
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>

                {fieldErrors.password && (
                  <p id="erreur-password" className="mt-1.5 text-xs text-destructive">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* role="alert" : un lecteur d'écran annonce l'erreur serveur dès son apparition */}
              {error && (
                <p
                  role="alert"
                  className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}

              {/* disabled UNIQUEMENT pendant l'envoi : jamais parce que le formulaire est invalide */}
              <Button
                type="submit"
                size="lg"
                className="effet-action w-full"
                disabled={isLoading}
              >
                {isLoading ? "Connexion…" : "Se connecter"}
              </Button>
            </form>
          )}

          {/* Écran 1 de l'inscription : tant qu'aucun profil n'est choisi, pas de formulaire */}
          {mode === "inscription" && profil === null && (
            <div className="mt-8 space-y-3">
              <p className="text-sm text-muted-foreground">
                Quel type de compte souhaitez-vous créer ?
              </p>

              {PROFILS_INSCRIPTION.map((candidat) => {
                const Icone = candidat.icone;

                return (
                  <button
                    key={candidat.id}
                    type="button"
                    onClick={() => {
                      setProfilId(candidat.id);
                      // le rôle suit le profil : jamais un pro avec role="client"
                      setRegisterData((donnees) => ({
                        ...donnees,
                        role: candidat.roles[0].valeur,
                      }));
                    }}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-border p-5 text-left transition-colors hover:border-primary"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icone className="size-5" />
                    </span>

                    {/* des <span className="block"> et non des <div> : un <button> n'accepte pas de contenu de flux */}
                    <span className="min-w-0 flex-1">
                      <span className="block font-heading font-bold">
                        {candidat.libelle}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {candidat.description}
                      </span>
                      {candidat.validationAdmin && (
                        <span className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ShieldAlert className="size-3.5 shrink-0" />
                          Compte vérifié par un administrateur avant activation
                        </span>
                      )}
                    </span>

                    <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Écran 2 : le formulaire, entièrement piloté par le profil choisi */}
          {mode === "inscription" && profil !== null && (
            <form onSubmit={handleRegisterSubmit} noValidate className="mt-8 space-y-5">
              <button
                type="button"
                onClick={() => setProfilId(null)}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
                {profil.libelle} — changer de profil
              </button>

              <fieldset>
                <legend className="text-sm font-medium">Vous êtes</legend>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {profil.roles.map((option) => {
                    const Icone = option.icone;
                    const actif = registerData.role === option.valeur;

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
                            setRegisterData((donnees) => ({
                              ...donnees,
                              role: option.valeur,
                            }))
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
              </fieldset>

              <ChampTexte
                id="fullname"
                label="Nom complet"
                autoComplete="name"
                placeholder="Koffi Aristide"
                value={registerData.fullname}
                onChange={majChamp("fullname")}
                erreur={registerErrors.fullname}
              />

              {/* la règle vient de la donnée (required_if côté Laravel), pas d'un if sur profilId */}
              {profil.raisonSocialeRequise && (
                <ChampTexte
                  id="raison_sociale"
                  label="Raison sociale"
                  autoComplete="organization"
                  placeholder="Ivoire Auto Motors"
                  value={registerData.raison_sociale ?? ""}
                  onChange={majChamp("raison_sociale")}
                  erreur={registerErrors.raison_sociale}
                />
              )}

              <ChampTexte
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.ci"
                value={registerData.email}
                onChange={majChamp("email")}
                erreur={registerErrors.email}
              />

              <ChampTexte
                id="telephone"
                label="Téléphone"
                type="tel"
                autoComplete="tel"
                placeholder="0708091011"
                value={registerData.telephone ?? ""}
                onChange={majChamp("telephone")}
                erreur={registerErrors.telephone}
              />

              <ChampTexte
                id="adresse"
                label="Adresse"
                autoComplete="street-address"
                placeholder="Cocody, Abidjan"
                value={registerData.adresse ?? ""}
                onChange={majChamp("adresse")}
                erreur={registerErrors.adresse}
                aide="Sert à vous proposer les véhicules proches de chez vous."
              />

              <ChampMotDePasse
                id="password"
                label="Mot de passe"
                autoComplete="new-password"
                value={registerData.password}
                onChange={majChamp("password")}
                erreur={registerErrors.password}
              />

              <ChampMotDePasse
                id="password_confirmation"
                label="Confirmer le mot de passe"
                autoComplete="new-password"
                value={registerData.password_confirmation}
                onChange={majChamp("password_confirmation")}
                erreur={registerErrors.password_confirmation}
              />

              {error && (
                <p
                  role="alert"
                  className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="effet-action w-full"
                disabled={isLoading}
              >
                {isLoading ? "Création…" : "Créer mon compte"}
              </Button>

              {profil.validationAdmin && (
                <p className="text-center text-xs text-muted-foreground">
                  Votre compte sera activé après vérification par un administrateur.
                </p>
              )}
            </form>
          )}

          {/* Absent de l'écran de choix du profil : on ignore encore si le visiteur y a droit */}
          {(mode === "connexion" || profil?.googleAutorise) && (
            <>
              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <a
                href={URL_GOOGLE}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "effet-action w-full"
                )}
              >
                <IconeGoogle />
                Continuer avec Google
              </a>

              {profil !== null && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Vous serez inscrit comme{" "}
                  {profil.roles.find((option) => option.valeur === registerData.role)?.libelle.toLowerCase()}.
                </p>
              )}
            </>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {mode === "connexion" ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "connexion" ? "inscription" : "connexion");
                setProfilId(null);
              }}
              className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              {mode === "connexion" ? "Créer un compte" : "Se connecter"}
            </button>
          </p>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            En continuant, vous acceptez nos{" "}
            <Link href="/cgu" className="underline underline-offset-4 hover:text-primary">
              conditions générales
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
export default function AuthPage() {
  return (
    <Suspense>
      <ContenuAuth />
    </Suspense>
  )
}
