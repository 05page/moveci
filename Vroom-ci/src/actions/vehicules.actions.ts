import { api } from "@/src/lib/api"
import type { AllVehicules, MesVehicules, vehicule } from "@/src/types"

/** Récupère la liste publique de tous les véhicules avec leurs stats. */
export const getVehicules = () => api.get<AllVehicules>("/vehicules")

/** Récupère le détail d'un véhicule par son identifiant. */
export const getVehicule = (id: string | number) =>
  api.get<vehicule>(`/vehicules/${id}`)

/** Récupère les véhicules postés par l'utilisateur connecté. */
export const getMesVehicules = () =>
  api.get<MesVehicules>("/vehicules/mes-vehicules")

export const getMonVehicule = (id: number | string) =>
  api.get<vehicule>(`/vehicules/mon-vehicule/${id}`)
/** Publie un nouveau véhicule avec ses photos (multipart/form-data). */
export const postVehicule = (formData: FormData) =>
  api.upload<vehicule>("/vehicules/post-vehicule", formData)

/** Met à jour les informations d'un véhicule existant. */
export const updateVehicule = (id: string | number, data: Partial<vehicule>) =>
  api.put<vehicule>(`/vehicules/${id}`, data)

/** Supprime définitivement un véhicule par son identifiant. */
export const deleteVehicule = (id: string | number) =>
  api.delete<unknown>(`/vehicules/${id}`)
