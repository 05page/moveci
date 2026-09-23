"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Car,
  Eye,
  Handshake,
  ImagePlus,
  KeyRound,
  Pencil,
  Star,
  Users,
  Wallet,
} from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import CarteStat from "@/components/CarteStat";
import CarteTransaction from "@/components/CarteTransaction";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  cn,
  formaterCompact,
  formaterFcfa,
  formaterMoisAnnee,
  initiales,
  LIBELLES_ROLE,
  urlPhoto,
  variationPourcent,
} from "@/lib/utils";
import {
  libelleVehicule,
  photoPrincipale,
  STYLE_STATUT,
} from "@/lib/vehicule";
import type { ReponseAvisVendeur, StatsVendeur, TransactionConclue, User } from "@/types";

type DonneesProfilVendeur = {
  vendeur: User;
  stats: StatsVendeur;
  transactions: TransactionConclue[];
  transactionsEnAttente: TransactionConclue[];
};

/**
 * `GET /me` renvoie le modèle User BRUT : `note_moyenne`/`nb_avis` n'y existent
 * pas (ni colonne, ni accesseur, contrairement à `membre_since`) — seul
 * `avis/vendeur/{id}` les calcule. D'où l'attente de `reponseMe` avant de
 * lancer les 3 autres appels : il faut l'id du vendeur pour l'interroger.
 * `transactions` vient de `mes-transactions` (relation `client` chargée, pas
 * `vendeur` — inverse de /client/profile.tsx) et se filtre côté front sur
 * `statut === "confirmé"` : le back renvoie tout l'historique.
 */
const recupererStatsVendeur = async (): Promise<DonneesProfilVendeur> => {
  const reponseMe = await api.get<{ data: User }>("me");

  const [reponseAvis, reponseStats, reponseTransactions] = await Promise.all([
    api.get<{ data: ReponseAvisVendeur }>(`avis/vendeur/${reponseMe.data.id}`),
    api.get<{ data: StatsVendeur }>("stats/mes-stats"),
    api.get<{ data: TransactionConclue[] }>("transactions-conclues/mes-transactions"),
  ]);

  return {
    vendeur: {
      ...reponseMe.data,
      note_moyenne: reponseAvis.data.note_moyenne,
      nb_avis: reponseAvis.data.total,
    },
    stats: reponseStats.data,
    transactions: reponseTransactions.data.filter(
      (transaction) => transaction.statut === "confirmé"
    ),
    transactionsEnAttente: reponseTransactions.data.filter(
      (transaction) => transaction.statut === "en_attente"
    ),
  };
};

/** Même contrat que POST /transactions-conclues/{id}/refuser-vendeur. */
const refuserTransaction = async (id: string): Promise<void> => {
  await api.post(`transactions-conclues/${id}/refuser-vendeur`);
};

/** Filtre du bloc « Vos ventes et locations ». */
type FiltreTransaction = "tout" | "vente" | "location";

const LIBELLES_FILTRE: Record<FiltreTransaction, string> = {
  tout: "Tout",
  vente: "Ventes",
  location: "Locations",
};

type Periode = "semaine" | "mois";

/** Forme normalisée d'une barre : les deux périodes n'ont pas la même étiquette. */
type Barre = {
  cle: string;
  etiquette: string;
  vues: number;
  ventes: number;
  courant: boolean;
};

/** "2026-08-14" dans le fuseau LOCAL. `toISOString()` bascule en UTC et décale d'un jour le soir. */
function dateLocaleIso(date: Date): string {
  return new Intl.DateTimeFormat("fr-CA").format(date);
}

/** Mois abrégé sans collision : slice(0,3) donnerait "jui" pour juin ET juillet. */
function abregerMois(mois: number): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(
    new Date(2000, mois - 1, 1)
  );
}

/** Aplatit `stats_semaine` ou `stats_mensuel` vers la forme commune attendue par le graphe. */
function construireBarres(stats: StatsVendeur, periode: Periode): Barre[] {
  if (periode === "semaine") {
    const aujourdhui = dateLocaleIso(new Date());
    return stats.stats_semaine.map((point) => ({
      cle: point.jour,
      etiquette: point.nom_jour,
      vues: point.vues,
      ventes: point.ventes,
      courant: point.jour === aujourdhui,
    }));
  }

  // getMonth() rend 0-11, la donnée backend est en 1-12
  const moisCourant = new Date().getMonth() + 1;
  return stats.stats_mensuel.map((point) => ({
    cle: String(point.mois),
    etiquette: abregerMois(point.mois),
    vues: point.vues,
    ventes: point.ventes,
    courant: point.mois === moisCourant,
  }));
}

/** Graphe en barres CSS. Une librairie de 400 ko pour sept rectangles ne se justifie pas. */
function GrapheVues({ barres, periode }: { barres: Barre[]; periode: Periode }) {
  // le plancher à 1 évite le 0/0 = NaN d'une période sans aucune vue, qui collerait tout en haut
  const maxVues = Math.max(1, ...barres.map((barre) => barre.vues));

  return (
    <>
      <div className="mt-8 flex items-end gap-1.5 sm:gap-3" aria-hidden>
        {barres.map((barre) => (
          <div key={barre.cle} className="flex min-w-0 flex-1 flex-col items-center">
            <span
              className={cn(
                "mb-2 text-[11px] font-semibold tabular-nums",
                barre.courant ? "text-primary" : "text-muted-foreground"
              )}
            >
              {barre.vues > 0 ? formaterCompact(barre.vues) : ""}
            </span>

            <div className="flex h-40 w-full items-end">
              {/* hauteur CALCULÉE : elle passe par `style`, Tailwind ne voit pas les variables d'exécution */}
              <div
                className={cn(
                  "w-full rounded-t-md transition-[height] duration-500 ease-out",
                  barre.courant ? "bg-primary" : "bg-muted"
                )}
                style={{ height: `${(barre.vues / maxVues) * 100}%` }}
              />
            </div>

            <span
              className={cn(
                "mt-2 truncate text-[11px] sm:text-xs",
                barre.courant
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {barre.etiquette}
            </span>
          </div>
        ))}
      </div>

      {/* le graphe est en aria-hidden : voici les mêmes chiffres pour un lecteur d'écran */}
      <table className="sr-only">
        <caption>
          Vues et ventes par {periode === "semaine" ? "jour" : "mois"}
        </caption>
        <thead>
          <tr>
            <th scope="col">Période</th>
            <th scope="col">Vues</th>
            <th scope="col">Ventes</th>
          </tr>
        </thead>
        <tbody>
          {barres.map((barre) => (
            <tr key={barre.cle}>
              <th scope="row">{barre.etiquette}</th>
              <td>{barre.vues}</td>
              <td>{barre.ventes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function ProfilVendeur() {
  const [donnees, setDonnees] = useState<DonneesProfilVendeur | null>(null);
  const [chargement, setChargement] = useState(true);
  const [periode, setPeriode] = useState<Periode>("semaine");
  const [filtre, setFiltre] = useState<FiltreTransaction>("tout");
  // incrémenté par le bouton Recharger : c'est ce qui redéclenche le useEffect ci-dessous
  const [tentative, setTentative] = useState(0);
  const [idEnCours, setIdEnCours] = useState<string | null>(null);
  const [erreurTransaction, setErreurTransaction] = useState<string | null>(null);

  useEffect(() => {
    // `annule` évite un setState sur un composant démonté si la réponse arrive trop tard
    let annule = false;

    recupererStatsVendeur().then((resultat) => {
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

  const refuser = (id: string) => {
    setErreurTransaction(null);
    setIdEnCours(id);

    refuserTransaction(id)
      .then(() => recupererStatsVendeur())
      .then((resultat) => {
        setDonnees(resultat);
        setIdEnCours(null);
        toast.success("Transaction refusée.");
      })
      .catch((erreur) => {
        setIdEnCours(null);
        const message = erreur?.message ?? "Le refus a échoué.";
        setErreurTransaction(message);
        toast.error(message);
      });
  };

  if (chargement || !donnees) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
        <Skeleton className="h-40 w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
        <Skeleton className="mt-12 h-64 w-full" />
      </main>
    );
  }

  const { vendeur, stats, transactions, transactionsEnAttente } = donnees;
  const compteurs = stats.stats;
  const top = stats.top_vehicule_vues.my_top_vehicle_most_vues;
  const barres = construireBarres(stats, periode);

  const transactionsFiltrees =
    filtre === "tout"
      ? transactions
      : transactions.filter((transaction) => transaction.type === filtre);

  const moisCourant = new Date().getMonth() + 1;
  // en janvier, l'index -1 rend undefined : variationPourcent renvoie alors undefined et la prop n'est pas passée
  const tendanceVues = variationPourcent(
    stats.stats_mensuel[moisCourant - 1]?.vues,
    stats.stats_mensuel[moisCourant - 2]?.vues
  );

  const stockVide = compteurs.total_vehicule === 0 && compteurs.total_vues === 0;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10">
      <section className="flex flex-col gap-6 rounded-2xl border border-border from-primary/10 via-background to-background p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-5">
          {/* <img> et non <Image> : l'avatar vient du backend, absent des remotePatterns de next.config.ts */}
          {vendeur.avatar ? (
            <img
              src={vendeur.avatar}
              alt=""
              className="size-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-2xl font-bold text-primary-foreground">
              {initiales(vendeur.fullname)}
            </span>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-2xl font-bold md:text-3xl">
                {vendeur.fullname}
              </h1>
              <Badge variant="secondary">{LIBELLES_ROLE[vendeur.role]}</Badge>
            </div>

            {/* contrairement au client, la note est réelle pour un vendeur */}
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
                <Star className="size-4 fill-primary text-primary" />
                {vendeur.note_moyenne.toFixed(1)}
                <span className="font-normal text-muted-foreground">
                  ({vendeur.nb_avis} avis)
                </span>
              </span>
              <span className="text-muted-foreground">
                Membre depuis {formaterMoisAnnee(vendeur.membre_since)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/vendeur/profile/modifier"
            className={cn(buttonVariants({ variant: "outline" }), "effet-action")}
          >
            <Pencil className="size-4" />
            Modifier
          </Link>
          <Link
            href="/vendeur/vehicules"
            className={cn(buttonVariants({ variant: "outline" }), "effet-action")}
          >
            <Car className="size-4" />
            Mes véhicules
          </Link>
          <Link
            href="/vendeur/clients"
            className={cn(buttonVariants({ variant: "outline" }), "effet-action")}
          >
            <Users className="size-4" />
            Mes clients
          </Link>
          <Link
            href="/vendeur/post-vehicule"
            className={cn(buttonVariants(), "effet-action")}
          >
            <ImagePlus className="size-4" />
            Publier une annonce
          </Link>
          <BoutonRecharger onClick={recharger} chargement={chargement} />
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <CarteStat
          libelle="Véhicules en ligne"
          valeur={compteurs.total_vehicule}
          icone={Car}
          precision="Au statut disponible"
          href="/vendeur/vehicules"
        />
        <CarteStat
          libelle="Vendus"
          valeur={compteurs.total_vehicule_vendu}
          icone={Handshake}
          precision={`${stats.rdv.total_rdv} rendez-vous confirmés`}
          href="/vendeur/vehicules?statut=vendu"
        />
        <CarteStat
          libelle="Loués"
          valeur={compteurs.total_vehicule_loue}
          icone={KeyRound}
          precision="Véhicules en location"
          href="/vendeur/vehicules?statut=loue"
        />
        <CarteStat
          libelle="Vues au total"
          valeur={formaterCompact(compteurs.total_vues)}
          icone={Eye}
          tendance={tendanceVues}
          precision={`${compteurs.total_vues_jour} aujourd'hui`}
        />
        {/* compact sur la valeur, montant exact en précision : "18 750 000 F CFA" déborde en text-3xl */}
        <CarteStat
          libelle="Revenus du mois"
          valeur={`${formaterCompact(compteurs.total_revenus)} F`}
          icone={Wallet}
          precision={formaterFcfa(compteurs.total_revenus)}
        />
      </section>

      {stockVide ? (
        <section className="mt-12 rounded-2xl border border-border p-10 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ImagePlus className="size-6" />
          </span>
          <h2 className="mt-5 font-heading text-xl font-bold">
            Votre premier véhicule vous attend
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Photos, marque, modèle, kilométrage et prix : comptez 5 minutes.
            L&apos;annonce part en ligne dès que la vérification automatique
            confirme les informations.
          </p>
          <Link
            href="/vendeur/post-vehicule"
            className={cn(buttonVariants({ size: "lg" }), "effet-action mt-6")}
          >
            <ImagePlus className="size-4" />
            Publier une annonce
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl font-bold">Votre rythme</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les vues reçues par vos annonces. La barre dorée est la période
                  en cours.
                </p>
              </div>

              <div role="tablist" className="flex gap-2">
                {(["semaine", "mois"] as const).map((valeur) => (
                  <button
                    key={valeur}
                    type="button"
                    role="tab"
                    aria-selected={valeur === periode}
                    onClick={() => setPeriode(valeur)}
                    className={cn(
                      "rounded-4xl px-4 py-2 text-sm font-semibold capitalize transition-colors",
                      valeur === periode
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:border-primary hover:text-foreground"
                    )}
                  >
                    {valeur}
                  </button>
                ))}
              </div>
            </div>

            <GrapheVues barres={barres} periode={periode} />
          </section>

          {transactionsEnAttente.length > 0 && (
            <section className="mt-16">
              <h2 className="font-heading text-xl font-bold">
                En attente de confirmation
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Montrez le QR affiché sur chaque carte au client — son scan confirme et finalise seul.
              </p>

              {erreurTransaction && (
                <p
                  role="status"
                  className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
                >
                  {erreurTransaction}
                </p>
              )}

              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {transactionsEnAttente.map((transaction) => (
                  <CarteTransaction
                    key={transaction.id}
                    transaction={transaction}
                    perspective="vendeur"
                    onRefuser={() => refuser(transaction.id)}
                    enCours={idEnCours === transaction.id}
                  />
                ))}
              </div>
            </section>
          )}

          {transactions.length > 0 && (
            <section className="mt-16">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-heading text-xl font-bold">
                    Vos ventes et locations
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Les véhicules dont la transaction a été confirmée des deux
                    côtés. Aucun paiement ne transite par Move CI.
                  </p>
                </div>

                <div role="tablist" className="flex gap-2">
                  {(["tout", "vente", "location"] as const).map((valeur) => (
                    <button
                      key={valeur}
                      type="button"
                      role="tab"
                      aria-selected={valeur === filtre}
                      onClick={() => setFiltre(valeur)}
                      className={cn(
                        "rounded-4xl px-4 py-2 text-sm font-semibold transition-colors",
                        valeur === filtre
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:border-primary hover:text-foreground"
                      )}
                    >
                      {LIBELLES_FILTRE[valeur]}
                    </button>
                  ))}
                </div>
              </div>

              {/* le filtre peut ne rien laisser : sans ce cas, la grille disparaît sans explication */}
              {transactionsFiltrees.length === 0 ? (
                <p className="mt-8 rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
                  Aucune {filtre === "vente" ? "vente" : "location"} confirmée
                  pour l&apos;instant.
                </p>
              ) : (
                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {transactionsFiltrees.map((transaction) => (
                    <CarteTransaction
                      key={transaction.id}
                      transaction={transaction}
                      perspective="vendeur"
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="mt-16">
            <h2 className="font-heading text-xl font-bold">
              Vos annonces les plus vues
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Les cinq véhicules qui attirent le plus de visiteurs.
            </p>

            <ul className="mt-6 divide-y divide-border border-y border-border">
              {top.map((vehicule, index) => {
                const statut = STYLE_STATUT[vehicule.statut];
                const libelle = libelleVehicule(vehicule.description, vehicule.id);
                const photo = photoPrincipale(vehicule.photos);

                return (
                  <li key={vehicule.id}>
                    <Link
                      href={`/vendeur/vehicule/${vehicule.id}`}
                      className="group flex items-center gap-3 py-4 transition-colors hover:bg-muted/40 sm:gap-4"
                    >
                      <span className="w-6 shrink-0 font-heading text-sm font-bold tabular-nums text-primary sm:w-7">
                        {`0${index + 1}`}
                      </span>

                      <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-16">
                        {photo ? (
                          // <img> et non <Image> : les photos viennent du backend, absent des remotePatterns
                          <img
                            src={urlPhoto(photo.path)}
                            alt=""
                            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-muted-foreground">
                            <Car className="size-6" />
                          </span>
                        )}
                      </span>

                      {/* colonne sous 640px, ligne au-delà : badge et vues ne se battent plus avec le titre */}
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                        <span className="min-w-0 sm:flex-1">
                          <span className="block truncate font-semibold transition-colors group-hover:text-primary">
                            {libelle}
                          </span>
                          <span className="mt-0.5 block text-sm tabular-nums text-muted-foreground">
                            {/* Number() obligatoire : `prix` est une string, un + concatènerait */}
                            {formaterFcfa(Number(vehicule.prix))}
                            {vehicule.post_type === "location" && " / jour"}
                          </span>
                        </span>

                        <span className="flex items-center justify-between gap-3 sm:justify-end">
                          {/* max-w + truncate : "En transaction" ne doit pas pousser les vues hors de l'écran */}
                          <Badge
                            className={cn(
                              "max-w-32 shrink truncate",
                              statut.classes
                            )}
                          >
                            {statut.libelle}
                          </Badge>

                          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold tabular-nums sm:w-20 sm:justify-end">
                            <Eye className="size-4 text-muted-foreground" />
                            {vehicule.views_count.toLocaleString("fr-FR")}
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 flex justify-center">
              <Link
                href="/vendeur/rdv"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "effet-action"
                )}
              >
                <CalendarCheck className="size-4" />
                Voir mes rendez-vous
              </Link>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
