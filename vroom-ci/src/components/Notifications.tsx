"use client";
import { Bell, BellOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Notification } from "@/types";
import { cn, tempsRelatif } from "@/lib/utils";
import { ICONE_TYPE_NOTIF } from "@/lib/notification";

export type NotificationsProps = {
    /** Déjà triées par le back sur `created_at` DESC : ne pas retrier ici. */
    notifs: Notification[];
    /** Recompté côté serveur via le scope `unread()` — ne pas le déduire de `notifs`. */
    nonLues: number;
    /** Marque une notif comme lue (no-op côté parent si elle l'est déjà). */
    onMarquerLue: (id: string) => void;
    onToutMarquer: () => void;
};

export default function Notifications({ notifs, nonLues, onMarquerLue, onToutMarquer }: NotificationsProps) {
    const [isOpen, setIsOpen] = useState(false)
    const boite = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const auClicAilleurs = (e: MouseEvent) => {
            if (boite.current && !boite.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const aEchap = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };

        document.addEventListener("mousedown", auClicAilleurs);
        document.addEventListener("keydown", aEchap);

        // sans ce retour, un écouteur s'empile à chaque ouverture et aucun ne part jamais
        return () => {
            document.removeEventListener("mousedown", auClicAilleurs);
            document.removeEventListener("keydown", aEchap);
        };
    }, [isOpen]);

    return (
        // `relative` sur la boîte, `absolute` sur ce qu'elle contient : c'est ce couple qui ancre le panneau sous la cloche
        <div className="relative inline-block" ref={boite}>
            <button
                type="button"
                className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setIsOpen((open) => !open)}
                aria-expanded={isOpen}
                aria-label={nonLues > 0 ? `Notifications, ${nonLues} non lues` : "Notifications"}
            >
                <Bell className="size-5" />

                {nonLues > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground">
                        {nonLues > 9 ? "9+" : nonLues}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fixed inset-x-4 top-20 z-50 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80 sm:origin-top-right">
                    <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                        <h2 className="text-sm font-semibold">Notifications</h2>

                        <div className="flex items-center gap-2">
                            {nonLues > 0 && (
                                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                                    {nonLues} non lue{nonLues > 1 ? "s" : ""}
                                </span>
                            )}
                            {nonLues > 0 && (
                                <button
                                    type="button"
                                    onClick={onToutMarquer}
                                    className="text-xs font-medium text-primary transition-colors hover:underline"
                                >
                                    Tout marquer lu
                                </button>
                            )}
                        </div>
                    </div>

                    {notifs.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                            <BellOff className="size-6 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Aucune notification</p>
                        </div>
                    ) : (
                        // l'endpoint ne pagine pas : sans hauteur plafonnée, le panneau déroule six mois d'historique
                        <ul className="sans-barre-scroll max-h-96 overflow-y-auto">
                            {notifs.map((notif) => {
                                // majuscule obligatoire : `<icone />` serait lu par React comme une balise HTML inconnue
                                const Icone = ICONE_TYPE_NOTIF[notif.type] ?? Bell;

                                return (
                                    <li key={notif.id} className="border-b last:border-b-0">
                                        <button
                                            type="button"
                                            onClick={() => onMarquerLue(notif.id)}
                                            disabled={notif.lu}
                                            className={cn(
                                                "flex w-full gap-3 px-4 py-3 text-left transition-colors",
                                                !notif.lu && "bg-muted/50 hover:bg-muted",
                                                notif.lu && "cursor-default"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                                                    notif.lu
                                                        ? "bg-muted text-muted-foreground"
                                                        : "bg-primary/15 text-foreground"
                                                )}
                                            >
                                                <Icone className="size-4" />
                                            </span>

                                            {/* `min-w-0` : sans lui, un titre long refuse de se tronquer dans un flex */}
                                            <div className="min-w-0 flex-1">
                                                <p
                                                    className={cn(
                                                        "truncate text-sm",
                                                        notif.lu ? "font-normal" : "font-semibold"
                                                    )}
                                                >
                                                    {notif.title}
                                                </p>
                                                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                                    {notif.message}
                                                </p>
                                                <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                                                    {tempsRelatif(notif.created_at)}
                                                </p>
                                            </div>

                                            {!notif.lu && (
                                                <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
