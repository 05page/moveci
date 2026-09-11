import { z } from "zod";

// Chaque schéma reflète UN endpoint de vroom-backend. Toute règle ajoutée côté
// Laravel doit être répercutée ici, sinon le front laisse passer un 422.

/** Rôles acceptés à l'inscription. `admin` en est exclu : il ne se crée qu'en base. */
export const ROLES_INSCRIPTION = [
  "client",
  "vendeur",
  "concessionnaire",
  "auto_ecole",
] as const;

/** Rôles pour lesquels `raison_sociale` devient obligatoire (required_if côté Laravel). */
export const ROLES_PRO = ["concessionnaire", "auto_ecole"] as const;

/** Numéro ivoirien : 10 chiffres, indicatif +225 facultatif. */
const REGEX_TELEPHONE = /^(\+225)?[0-9]{10}$/;

const email = z
  .email("Email invalide")
  .min(1, "L'email est requis")
  .max(255, "L'email ne doit pas dépasser 255 caractères");

/** min:8 côté Laravel (register:149). Descendre en dessous garantit un 422. */
const motDePasse = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères");

const telephone = z
  .string()
  .regex(REGEX_TELEPHONE, "Numéro invalide (ex : 0708091011)");

const adresse = z
  .string()
  .max(500, "L'adresse ne doit pas dépasser 500 caractères");

/** POST /api/login — le back ne contrôle QUE required|email et required|string. */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Le mot de passe est requis"),
});

/**
 * POST /api/register. `password_confirmation` porte ce nom exact car Laravel
 * dérive le champ de la règle `confirmed` sur `password` : le renommer donne un 422.
 */
export const registerSchema = z
  .object({
    fullname: z
      .string()
      .min(3, "Le nom complet doit faire au moins 3 caractères")
      .max(255, "Le nom ne doit pas dépasser 255 caractères"),
    email,
    password: motDePasse,
    password_confirmation: z.string().min(1, "Confirmez le mot de passe"),
    role: z.enum(ROLES_INSCRIPTION, { message: "Choisissez un profil" }),
    raison_sociale: z
      .string()
      .max(255, "La raison sociale ne doit pas dépasser 255 caractères")
      .optional(),
    telephone: telephone.optional(),
    adresse: adresse.optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .refine((donnees) => donnees.password === donnees.password_confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["password_confirmation"],
  })
  .refine(
    (donnees) =>
      !ROLES_PRO.includes(donnees.role as (typeof ROLES_PRO)[number]) ||
      (donnees.raison_sociale?.trim().length ?? 0) > 0,
    {
      message: "La raison sociale est requise pour un compte professionnel",
      path: ["raison_sociale"],
    }
  );

/** POST /api/forgot-password — réponse volontairement neutre côté back (anti-énumération). */
export const forgotPasswordSchema = z.object({ email });

/** POST /api/reset-password — le token vient du lien reçu par mail, pas d'une saisie. */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Lien de réinitialisation invalide"),
    email,
    password: motDePasse,
    password_confirmation: z.string().min(1, "Confirmez le mot de passe"),
  })
  .refine((donnees) => donnees.password === donnees.password_confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["password_confirmation"],
  });

/** PUT /api/me/change-password — refusé en 422 si le compte est lié à Google. */
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Le mot de passe actuel est requis"),
    new_password: motDePasse,
    new_password_confirmation: z.string().min(1, "Confirmez le mot de passe"),
  })
  .refine(
    (donnees) => donnees.new_password === donnees.new_password_confirmation,
    {
      message: "Les mots de passe ne correspondent pas",
      path: ["new_password_confirmation"],
    }
  );

/** POST /api/auth/complete-onboarding — les 3 champs sont required, et le rôle limité. */
export const onboardingSchema = z.object({
  telephone,
  adresse: adresse.min(1, "L'adresse est requise"),
  role: z.enum(["client", "vendeur"], { message: "Choisissez un profil" }),
});

/** PUT /api/users/{id} — tous les champs en `sometimes` : on n'envoie que ceux modifiés. */
export const updateProfileSchema = z.object({
  fullname: z.string().min(3).max(255).optional(),
  email: email.optional(),
  telephone: telephone.optional(),
  adresse: adresse.optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type OnboardingFormData = z.infer<typeof onboardingSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
