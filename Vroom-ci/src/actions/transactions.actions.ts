import { api } from "@/src/lib/api"
import type { TransactionConclue } from "@/src/types"

/** Client — liste ses transactions en attente/confirmées. */
export const getMesDemandes = () =>
  api.get<TransactionConclue[]>("/transactions-conclues/mes-demandes")

/** Vendeur — liste ses transactions. */
export const getMesTransactions = () =>
  api.get<TransactionConclue[]>("/transactions-conclues/mes-transactions")

/** Vendeur — confirme avec le code reçu par notification. */
export const confirmerVendeur = (id: string, code: string) =>
  api.post<TransactionConclue>(`/transactions-conclues/${id}/confirmer-vendeur`, { code })

/** Client — confirme avec le code et les dates si c'est une location. */
export const confirmerClient = (
  id: string,
  data: { code: string; date_debut_location?: string; date_fin_location?: string }
) => api.post<TransactionConclue>(`/transactions-conclues/${id}/confirmer-client`, data)

/** Client — refuse la transaction. */
export const refuserTransaction = (id: string, motif?: string) =>
  api.post<void>(`/transactions-conclues/${id}/refuser`, { motif })

export const refuserTransactionVendeur = (id: string, motif?: string) =>
  api.post<void>(`/transactions-conclues/${id}/refuser-vendeur`, { motif })
