import * as z from "zod";

export const registerValidator = z.object({
    fullname: z.string().min(3, "Au moins 3 caractères").max(200, "Nom trop long"),
    role: z.enum(["client", "vendeur", "concessionnaire", "auto_ecole"], { message: "Rôle invalide" }),
    email: z.email("Email invalide").max(254, "Email trop long"),
    adresse: z.string().min(5, "Au moins 5 caractères").max(100, "Adresse trop longue"),
    telephone: z.string().regex(/^0[0-9]{9}$/, "Numéro invalide"),
    password: z.string()
        .min(5, "Au moins 5 caractères")
        .max(148, "Mot de passe trop long")
        .regex(/[^a-zA-Z0-9]/, "Au moins un caractère spécial")
        .regex(/[A-Z]/, "Au moins une majuscule")
        .regex(/[0-9]/, "Au moins un chiffre"),
    password_confirmation: z.string().min(1, "Confirmation requise"),
    raison_sociale: z.string().max(200).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
}).refine(data => data.password === data.password_confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["password_confirmation"]
});
