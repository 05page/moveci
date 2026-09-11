"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

/**
 * Graphe en barres temporel générique (recharts), partagé entre les pages stats
 * qui ont une série "par semaine/mois" (concessionnaire : vues/ventes, auto-école :
 * inscriptions). Chaque point de `donnees` doit avoir une clé `etiquette` (l'axe X)
 * plus une valeur numérique par entrée de `series`.
 */
export type PointGrapheTemporel = { etiquette: string } & Record<string, number | string>;

export type SerieGrapheTemporel = { cle: string; libelle: string; couleur: string };

type GrapheBarresTemporelProps = {
  donnees: PointGrapheTemporel[];
  series: SerieGrapheTemporel[];
};

const GrapheBarresTemporel = ({ donnees, series }: GrapheBarresTemporelProps) => {
  const config: ChartConfig = Object.fromEntries(
    series.map((serie) => [serie.cle, { label: serie.libelle, color: serie.couleur }])
  );

  return (
    <ChartContainer config={config} className="mt-8 aspect-auto h-64 w-full">
      <BarChart data={donnees}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="etiquette" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.map((serie) => (
          <Bar key={serie.cle} dataKey={serie.cle} fill={`var(--color-${serie.cle})`} radius={4} />
        ))}
      </BarChart>
    </ChartContainer>
  );
};

export default GrapheBarresTemporel;
