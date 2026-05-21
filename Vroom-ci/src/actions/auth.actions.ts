import { api } from "@/src/lib/api"
import type { User } from "@/src/types"

/** Récupère le profil de l'utilisateur connecté. */
export const getMe = () => api.get<User>("/me")

/** Met à jour les informations de profil de l'utilisateur connecté. */
export const updateProfile = (data: Partial<User>) =>
  api.put<User>("/me/update", data)

/** Met à jour les informations de contact de l'utilisateur connecté. */
export const updateContact = (data: { telephone?: string; adresse?: string }) =>
  api.put<User>("/me/contact", data)

/**
 * Envoie un email de réinitialisation de mot de passe.
 * La réponse est identique que l'email existe ou non (anti-énumération).
 */
export const forgotPassword = (email: string) =>
  api.post<{ message: string }>("/forgot-password", { email })

/**
 * Réinitialise le mot de passe avec le token reçu par email.
 * @param token  Le token extrait de l'URL (?token=xxx)
 * @param email  L'email extrait de l'URL (?email=xxx)
 * @param password              Nouveau mot de passe
 * @param password_confirmation Confirmation du nouveau mot de passe
 */
export const resetPassword = (data: {
  token: string
  email: string
  password: string
  password_confirmation: string
}) => api.post<{ message: string }>("/reset-password", data)
