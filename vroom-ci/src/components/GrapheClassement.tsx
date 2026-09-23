"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

/** Graphe en barres horizontales (recharts) pour un classement label → valeur,
 *  partagé par les 5 sections de /admin/stats (marques, modèles, carburant, prix, vues). */
export type LigneGrapheClassement = { libelle: string; valeur: number; detail?: string };

type GrapheClassementProps = {
  lignes: LigneGrapheClassement[];
  suffixeValeur: string;
};

const CONFIG: ChartConfig = {
  valeur: { label: "Valeur", color: "var(--primary)" },
};

const GrapheClassement = ({ lignes, suffixeValeur }: GrapheClassementProps) => {
  if (lignes.length === 0) {
    return <p className="mt-6 text-sm text-muted-foreground">Pas encore de données.</p>;
  }

  return (
    <ChartContainer config={CONFIG} className="mt-6 aspect-auto w-full" style={{ height: lignes.length * 40 + 20 }}>
      <BarChart data={lignes} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="libelle"
          tickLine={false}
          axisLine={false}
          width={120}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, _item, _index, payload) => {
                const detail = (payload as unknown as LigneGrapheClassement | undefined)?.detail;
                return `${value} ${suffixeValeur}${detail ? ` · ${detail}` : ""}`;
              }}
            />
          }
        />
        <Bar dataKey="valeur" fill="var(--color-valeur)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
};

export default GrapheClassement;
