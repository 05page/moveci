import * as z from "zod";

export const LoginValidator = z.object({
    email: z.email("Email invalide").max(254, "Email trop long"),
    password: z.string().min(5, "Au moins 5 caractères").max(128, "Mot de passe trop long")
});
