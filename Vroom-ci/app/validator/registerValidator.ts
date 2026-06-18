import * as z from "zod";

export const registerValidator = z.object({
    fullname: z.string().min(3).max(200),
    email: z.email().max(254),
    adresse: z.string().min(5).max(100),
    telephone: z.string().regex(/^0[0-9]{9}$/, "Numéro invalide"),
    password: z.string().min(8).max(148)
        .regex(/[^a-zA-Z0-9]/, "Au moins un caractère spécial")
        .regex(/[A-Z]/, "Au moins une majuscule")
        .regex(/[0-9]/, "Au moins un chiffre"),
    password_confirmation: z.string()
}).refine(data => data.password === data.password_confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["password_confirmation"]
});