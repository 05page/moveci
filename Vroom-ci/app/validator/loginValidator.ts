import * as z from "zod";

export const LoginValidator = z.object({
    email: z.email().max(254),
    password: z.string().min(5).max(128)
});