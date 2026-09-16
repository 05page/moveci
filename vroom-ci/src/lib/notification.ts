import {
    Archive,
    Calendar,
    Car,
    GraduationCap,
    Handshake,
    KeyRound,
    LifeBuoy,
    ShieldAlert,
    TrendingUp,
    type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { Notification, TypeNotification } from "@/types";

/** Icône par type. Exhaustif sur les NEUF valeurs en base, `abonnement` hérité compris (types/index.ts:545). */
export const ICONE_TYPE_NOTIF: Record<TypeNotification, LucideIcon> = {
    rdv: Calendar,
    reservation: KeyRound,
    transaction: Handshake,
    alerte_vehicule: Car,
    formation: GraduationCap,
    moderation: ShieldAlert,
    support: LifeBuoy,
    tendance: TrendingUp,
    abonnement: Archive,
};

/** Même contrat que GET /notifications/mes-notifs : charge utile sous `data`. */
export const recupererNotifications = async (): Promise<{
    notifications: Notification[];
    unread_count: number;
}> => {
    const reponse = await api.get<{
        data: { notifications: Notification[]; unread_count: number };
    }>("notifications/mes-notifs");
    return reponse.data;
};

/**
 * État + actions des notifs du header (Header, admin/layout, partenaire/layout
 * en sont chacun un consommateur). `actif` laisse Header attendre `estConnecte`
 * avant de fetcher ; les layouts déjà protégés par l'auth passent `true`.
 */
export const useNotifications = (actif = true) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [nonLues, setNonLues] = useState(0);

    useEffect(() => {
        if (!actif) return;

        recupererNotifications()
            .then((reponse) => {
                setNotifications(reponse.notifications);
                setNonLues(reponse.unread_count);
            })
            .catch(() => { });
    }, [actif]);

    /** Optimiste : coche tout de suite, et ne revient en arrière que si l'API échoue. */
    const marquerLue = async (id: string) => {
        const cible = notifications.find((n) => n.id === id);
        if (!cible || cible.lu) return;

        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lu: true } : n)));
        setNonLues((prev) => Math.max(0, prev - 1));

        try {
            await api.post(`notifications/${id}/read`);
        } catch {
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lu: false } : n)));
            setNonLues((prev) => prev + 1);
        }
    };

    const marquerToutesLues = async () => {
        if (nonLues === 0) return;
        const notificationsAvant = notifications;
        const nonLuesAvant = nonLues;

        setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
        setNonLues(0);

        try {
            await api.post("notifications/read-all");
        } catch {
            setNotifications(notificationsAvant);
            setNonLues(nonLuesAvant);
        }
    };

    return { notifications, nonLues, marquerLue, marquerToutesLues };
};
