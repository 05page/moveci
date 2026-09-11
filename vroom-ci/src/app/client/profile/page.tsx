"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Car,
  Clock,
  KeyRound,
  MapPin,
  Pencil,
  Search,
  ShieldCheck,
  ShoppingBag,
  Wallet,
} from "lucide-react";

import { api } from "@/lib/api";
import BoutonRecharger from "@/components/BoutonRecharger";
import CarteStat from "@/components/CarteStat";
import EditProfile from "@/components/EditProfile";
import CarteTransaction from "@/components/CarteTransaction";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cn,
  formaterCompact,
  formaterDateHeure,
  formaterFcfa,
  formaterMoisAnnee,
  initiales,
  joursRestants,
  LIBELLES_ROLE,
} from "@/lib/utils";
import type {
  ProchaineEcheance,
  ProjectionClient,
  TransactionConclue,
  User,
} from "@/types";

type DonneesProfilClient = {
  client: User;
  projection: ProjectionClient;
  echeance: ProchaineEcheance | null;
  acquisitions: TransactionConclue[];
};

/**
 * Agrégation réelle : `client` vient de `/me`, `acquisitions`/`projection` sont
 * dérivées de `/transactions-conclues/mes-demandes`. `echeance` reste `null`
 * pour l'instant — son calcul croise aussi `/rdv/mes-rdv`, remis à une passe
 * dédiée.
 */
const recupererProfilClient = async (): Promise<DonneesProfilClient> => {

  const [responseMe, responseTransactions]= await Promise.all([
    api.get<{data: User}>("me"),
    api.get<{data: TransactionConclue[] }>("transactions-conclues/mes-demandes")
  ]);

  // 2. Sors `client` et `transactions` du `.data` de chaque réponse.
  const client = responseMe.data;
  const transactions = responseTransactions.data;
  const acquisitions = transactions.filter((t) => t.statut === "confirmé");
  const nb_achats = acquisitions.filter((a) => a.type === "vente").length;
  const nb_locations = acquisitions.filter((l) => l.type === "location").length;
  const total_depense = acquisitions.filter((a) => a.type === "vente").reduce((somme, a) => somme + Number(a.prix_final), 0)

  return {
    client,
    projection: {
      nb_achats,
      nb_locations,
      total_depense,
    },
    echeance: null,
    acquisitions,
  };
};

/** Libellé des 3 valeurs de `rendez_vous.type` (constantes du modèle RendezVous). */
const LIBELLES_NATURE_RDV: Record<
  Extract<ProchaineEcheance, { type: "rdv" }>["nature"],
  string
> = {
  visite: "Visite",
  essai_routier: "Essai routier",
  premiere_rencontre: "Première rencontre",
};

/** Bandeau d'urgence en tête de page. Ne rend rien si aucune échéance n'attend le client. */
function BandeauEcheance({ echeance }: { echeance: ProchaineEcheance | null }) {
  if (!echeance) return null;

  // switch sur le discriminant : TypeScript n'ouvre les champs que dans la bonne branche
  switch (echeance.type) {
    case "transaction": {
      const jours = joursRestants(echeance.expires_at);
      const delai =
        jours <= 0
          ? "Expire aujourd'hui"
          : `Il vous reste ${jours} jour${jours > 1 ? "s" : ""}`;

      return (
        <div className="mt-8 flex flex-col gap-5 rounded-2xl border border-primary bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Vente à confirmer
              </p>
              <h2 className="mt-1 font-heading text-lg font-bold">
                {echeance.vehicule_libelle}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">
                  {formaterFcfa(Number(echeance.prix_final))}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {delai}
                </span>
              </p>
            </div>
          </div>

          <Link
            href="/client/transactions"
            className={cn(buttonVariants({ size: "lg" }), "effet-action shrink-0")}
          >
            Confirmer la vente
          </Link>
        </div>
      );
    }

    case "rdv":
      return (
        <div className="mt-8 flex flex-col gap-5 rounded-2xl border border-primary bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CalendarCheck className="size-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                {LIBELLES_NATURE_RDV[echeance.nature]} à venir
              </p>
              <h2 className="mt-1 font-heading text-lg font-bold">
                {echeance.vehicule_libelle}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {formaterDateHeure(echeance.date_heure)}
                </span>
                {/* `lieu` est nullable : sans ce repli, "null" s'afficherait à l'écran */}
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {echeance.lieu ?? "Lieu à convenir"}
                </span>
              </p>
            </div>
          </div>

          <Link
            href="/client/rdv"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "effet-action shrink-0"
            )}
          >
            Voir le rendez-vous
          </Link>
        </div>
      );
  }
}

export default function ProfilClient() {
  const [donnees, setDonnees] = useState<DonneesProfilClient | null>(null);
  const [chargement, setChargement] = useState(true);
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);
  // 1. Ajoute un state pour piloter le Dialog d'édition — même principe que
  //    `dialogueRejet` dans app/admin/parc-auto/page.tsx.
  const [editionOuverte, setEditionOuverte] = useState(false);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererProfilClient().then((resultat) => {
      if (annule) return;
      setDonnees(resultat);
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

  if (chargement || !donnees) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="mt-8 h-28 w-full" />
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-80 w-full" />
          ))}
        </div>
      </main>
    );
  }

  const { client, projection, echeance, acquisitions } = donnees;
  const aDesVehicules = acquisitions.length > 0;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
      <section className="flex flex-col gap-6 rounded-2xl border border-border bg-linear-to-br from-primary/10 via-background to-background p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-5">
          {/* <img> et non <Image> : l'avatar vient du backend, absent des remotePatterns de next.config.ts */}
          {client.avatar ? (
            <img
              src={client.avatar}
              alt=""
              className="size-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-2xl font-bold text-primary-foreground">
              {initiales(client.fullname)}
            </span>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-2xl font-bold md:text-3xl">
                {client.fullname}
              </h1>
              <Badge variant="secondary">{LIBELLES_ROLE[client.role]}</Badge>
            </div>
            {/* note_moyenne et nb_avis sont forcés à 0 côté back : les afficher ferait croire à un compte mal noté */}
            <p className="mt-2 text-sm text-muted-foreground">
              Membre depuis {formaterMoisAnnee(client.membre_since)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* 2. Remplace ce <Link> par un <button type="button"> qui ouvre le
              Dialog : onClick={() => setEditionOuverte(true)}. Garde les
              mêmes className/icône/texte, juste le déclencheur qui change. */}
          <button type="button"
          onClick={() => setEditionOuverte(true)}
            className={cn(buttonVariants({ variant: "outline" }), "effet-action")}
          >
            <Pencil className="size-4" />
            Modifier mon profil
          </button>
          <BoutonRecharger onClick={recharger} chargement={chargement} />
        </div>
      </section>

      {/* 3. Rends EditProfile ici (sorti de la <section>, n'importe où dans le
          JSX puisque le Dialog se téléporte via un Portal). `user={client}`,
          `open={editionOuverte}`, `onOpenChange={setEditionOuverte}`.
          `onSuccess` doit remplacer SEULEMENT `client` dans `donnees`, sans
          perdre `projection`/`echeance`/`acquisitions` — utilise le setter
          fonctionnel pour partir de l'état précédent :
          onSuccess={(user) => setDonnees((d) => d && { ...d, client: user })} */}
          <EditProfile 
          user={client}
          open={editionOuverte}
          onOpenChange={setEditionOuverte}
          onSuccess={(user) => setDonnees((d) => d && {...d, client: user})}
          />

      <BandeauEcheance echeance={echeance} />

      {/* pas de compteurs de favoris / alertes / rdv ici : ils vivent sur leurs propres pages */}
      {!aDesVehicules ? (
        <section className="mt-8 rounded-2xl border border-border p-10 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Car className="size-6" />
          </span>
          <h2 className="mt-5 font-heading text-xl font-bold">
            Aucun véhicule à votre nom
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Vos achats et vos locations apparaîtront ici dès qu&apos;une
            transaction sera confirmée par vous et par le vendeur.
          </p>
          <Link
            href="/vehicules"
            className={cn(buttonVariants({ size: "lg" }), "effet-action mt-6")}
          >
            <Search className="size-4" />
            Parcourir les véhicules
          </Link>
        </section>
      ) : (
        <section className="mt-12">
          <h2 className="font-heading text-xl font-bold">Mes véhicules</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ce que vous avez acheté et loué sur Move CI, une fois la vente
            confirmée des deux côtés.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <CarteStat
              libelle="Achats"
              valeur={projection.nb_achats}
              icone={ShoppingBag}
              precision="Véhicules acquis"
            />
            <CarteStat
              libelle="Locations"
              valeur={projection.nb_locations}
              icone={KeyRound}
              precision="Véhicules loués"
            />
            {/* « achats » et non « dépensé » : les locations sont exclues, leur prix est journalier */}
            <CarteStat
              libelle="Total des achats"
              valeur={`${formaterCompact(projection.total_depense)} F`}
              icone={Wallet}
              precision={formaterFcfa(projection.total_depense)}
            />
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {acquisitions.map((transaction) => (
              <CarteTransaction
                key={transaction.id}
                transaction={transaction}
                perspective="client"
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
