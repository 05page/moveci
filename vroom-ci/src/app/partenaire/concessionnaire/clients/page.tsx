"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";

import BoutonRecharger from "@/components/BoutonRecharger";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formaterFcfa, initiales, tempsRelatif } from "@/lib/utils";
import type { CrmClientResume } from "@/types";

/** Même contrat que GET /crm/clients. Même page que /vendeur/clients, montée sous
 *  /partenaire/concessionnaire pour hériter du layout partenaire (sidebar). */
const recupererMesClients = async (): Promise<CrmClientResume[]> => {
  const reponse = await api.get<{ data: CrmClientResume[] }>("crm/clients");
  return reponse.data;
};

const PageMesClientsConcessionnaire = () => {
  const [clients, setClients] = useState<CrmClientResume[] | undefined>(undefined);
  const [rechargement, setRechargement] = useState(false);
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let annule = false;

    recupererMesClients().then((liste) => {
      if (annule) return;
      setClients(liste);
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

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold">Mes clients</h1>
        <BoutonRecharger onClick={recharger} chargement={rechargement} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Tous les clients ayant pris au moins un rendez-vous avec vous.
      </p>

      {clients === undefined ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-border p-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-7" />
          </span>
          <h2 className="mt-6 font-heading text-2xl font-bold">Aucun client pour l&apos;instant</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Dès qu&apos;un rendez-vous sera pris sur une de vos annonces, le client apparaîtra ici.
          </p>
        </section>
      ) : (
        <ul className="mt-6 space-y-3">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/partenaire/concessionnaire/clients/${client.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-border p-4 transition-colors hover:border-primary"
              >
                {client.avatar ? (
                  // <img> et non <Image> : l'avatar vient du backend, absent des remotePatterns
                  <img
                    src={client.avatar}
                    alt=""
                    className="size-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {initiales(client.fullname)}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-base font-bold">{client.fullname}</p>
                  <p className="truncate text-sm text-muted-foreground">{client.email}</p>
                </div>

                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                  <Badge variant="outline">{client.nb_rdv} RDV</Badge>
                  <Badge variant="outline">{client.nb_transactions} transaction{client.nb_transactions > 1 ? "s" : ""}</Badge>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <p className="font-heading text-sm font-bold tabular-nums">
                    {formaterFcfa(client.chiffre_affaires)}
                  </p>
                  {client.derniere_interaction && (
                    <p className="text-xs text-muted-foreground">
                      {tempsRelatif(client.derniere_interaction)}
                    </p>
                  )}
                </div>

                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
};

export default PageMesClientsConcessionnaire;
