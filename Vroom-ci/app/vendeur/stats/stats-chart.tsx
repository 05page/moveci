"use client"

import { useState } from "react"
import { Bar, CartesianGrid, XAxis, YAxis, Line, ComposedChart } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { StatsMensuel } from "@/src/types"

const chartConfig = {
    vues: {
        label: "Vues",
        color: "#3b82f6",
    },
    ventes: {
        label: "Ventes",
        color: "#10b981",
    },
    locations: {
        label: "Locations",
        color: "#f59e0b",
    },
} satisfies ChartConfig

type ChartMode = "vues" | "ventes" | "locations" | "tous"

interface StatsChartProps {
    data: StatsMensuel[]
}

export function StatsChart({ data }: StatsChartProps) {
    const [mode, setMode] = useState<ChartMode>("tous")

    // Abréviations officielles françaises — juin et juillet doivent être distincts
    const MOIS_ABBR: Record<string, string> = {
        janvier: "Jan", février: "Fév", mars: "Mar", avril: "Avr",
        mai: "Mai", juin: "Juin", juillet: "Juil", août: "Aoû",
        septembre: "Sep", octobre: "Oct", novembre: "Nov", décembre: "Déc",
    }

    const chartData = data.map(d => ({
        mois:      MOIS_ABBR[d.nom_mois.toLowerCase()] ?? d.nom_mois.slice(0, 3),
        vues:      d.vues,
        ventes:    d.ventes,
        locations: d.locations,
    }))

    return (
        <Card className="rounded-2xl shadow-sm border border-border/40">
            <CardHeader className="pb-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold">
                            Performances mensuelles
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Évolution sur les 12 derniers mois.
                        </p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                        {([
                            { value: "vues",      label: "Vues" },
                            { value: "ventes",    label: "Ventes" },
                            { value: "locations", label: "Locations" },
                            { value: "tous",      label: "Tout" },
                        ] as const).map((item) => (
                            <Button
                                key={item.value}
                                variant="ghost"
                                size="sm"
                                onClick={() => setMode(item.value)}
                                className={`h-7 text-xs px-3 cursor-pointer rounded-md ${
                                    mode === item.value
                                        ? "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 hover:text-white"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {item.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
                    <ComposedChart
                        accessibilityLayer
                        data={chartData}
                        margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="mois"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tick={{ fontSize: 12 }}
                        />
                        {(mode === "vues" || mode === "tous") && (
                            <YAxis
                                yAxisId="vues"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={4}
                                tick={{ fontSize: 11 }}
                                width={45}
                            />
                        )}
                        {(mode === "ventes" || mode === "locations" || mode === "tous") && (
                            <YAxis
                                yAxisId="transactions"
                                orientation="right"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={4}
                                tick={{ fontSize: 11 }}
                                width={35}
                            />
                        )}
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />

                        {(mode === "vues" || mode === "tous") && (
                            <Bar
                                yAxisId="vues"
                                dataKey="vues"
                                fill="var(--color-vues)"
                                radius={[6, 6, 0, 0]}
                                barSize={28}
                            />
                        )}
                        {(mode === "ventes" || mode === "tous") && (
                            <Line
                                yAxisId="transactions"
                                type="monotone"
                                dataKey="ventes"
                                stroke="var(--color-ventes)"
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: "var(--color-ventes)", strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                        )}
                        {(mode === "locations" || mode === "tous") && (
                            <Line
                                yAxisId="transactions"
                                type="monotone"
                                dataKey="locations"
                                stroke="var(--color-locations)"
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: "var(--color-locations)", strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                        )}
                    </ComposedChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
