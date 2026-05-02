import { api } from "@/src/lib/api"
import { SupportTicket } from "@/src/types"

// ─── Actions Support ──────────────────────────────────────────────────────────

/**
 * Soumet un nouveau ticket de support.
 * Accessible à tous les rôles connectés (client, vendeur, partenaire).
 *
 * @param data - Sujet, message et niveau de priorité du ticket
 */
export async function soumettreTicket(data: {
  sujet: string
  message: string
  priorite: string
}) {
  return api.post<SupportTicket>("/support/post-tickets", data)
}

/**
 * Récupère la liste des tickets de l'utilisateur courant.
 * Triés du plus récent au plus ancien.
 */
export async function getMesTickets() {
  return api.get<SupportTicket[]>("/support/mes-tickets")
}

/**
 * (Admin uniquement) Récupère tous les tickets, avec filtre optionnel par statut.
 *
 * @param statut - Filtre : 'ouvert' | 'en_cours' | 'resolu' | 'ferme' | undefined (tous)
 */
export async function getAdminTickets(statut?: string) {
  const qs = statut ? `?statut=${statut}` : ""
  return api.get<SupportTicket[]>(`/admin/support${qs}`)
}

/**
 * (Admin uniquement) Répond à un ticket et le passe en statut 'resolu'.
 *
 * @param id      - UUID du ticket
 * @param reponse - Texte de la réponse admin
 */
export async function repondreTicket(id: string, reponse: string) {
  return api.post<SupportTicket>(`/admin/support/${id}/repondre`, { reponse })
}
