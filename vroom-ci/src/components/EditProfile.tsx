"use client";

import React, { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { updateProfileSchema, type UpdateProfileFormData } from "@/lib/validation";
import type { ErreurAuth, User } from "@/types";
import { z } from "zod";
import { toast } from "sonner";

/**
 * Pop-up d'édition de profil. Dialog CONTRÔLÉ depuis le parent (open/onOpenChange),
 * même convention que app/admin/parc-auto/page.tsx — pas de DialogTrigger interne,
 * c'est le parent qui décide quand l'ouvrir (ex. le bouton "Modifier mon profil").
 */
type EditProfileProps = {
    user: User;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Appelé avec l'utilisateur mis à jour renvoyé par Laravel, pour que le parent rafraîchisse son affichage. */
    onSuccess: (user: User) => void;
};

export default function EditProfile({ user, open, onOpenChange, onSuccess }: EditProfileProps) {
    // 1. State du formulaire, PRÉ-REMPLI depuis `user` (pas de champs vides à l'ouverture).
    //    `UpdateProfileFormData` = { fullname?, email?, telephone?, adresse? } (lib/validation.ts).
    //    `user.email`/`telephone`/`adresse` sont eux-mêmes optionnels sur `User` — un
    //    `?? ""` est nécessaire pour ne jamais passer `undefined` à un <Input> contrôlé
    //    (sinon React le traite comme non-contrôlé, cf. point de vigilance du CLAUDE.md).
    //    Exemple :
    //    const [formData, setFormData] = useState<UpdateProfileFormData>({
    //      fullname: user.fullname,
    //      email: user.email ?? "",
    //      telephone: user.telephone ?? "",
    //      adresse: user.adresse ?? "",
    //    });
    //    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof UpdateProfileFormData, string>>>({});
    //    const [error, setError] = useState<string | null>(null);
    //    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<UpdateProfileFormData>({
        fullname: user.fullname,
        email: user.email,
        telephone: user.telephone ?? "",
        adresse: user.adresse ?? "",
    });
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof UpdateProfileFormData, string>>>({});
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setFieldErrors({});
        const result = updateProfileSchema.safeParse(formData);
        if (!result.success) {
            const { fieldErrors: erreursZod } = z.flattenError(result.error);
            setFieldErrors({
                fullname: erreursZod.fullname?.[0],
                email: erreursZod.email?.[0],
                telephone: erreursZod.telephone?.[0],
                adresse: erreursZod.adresse?.[0],
            })
        }
        setIsLoading(true);
        try {
            const response = await api.put<{ success: boolean; message: string; data: User }>(
                "me/update",
                result.data
            );
            onSuccess(response.data);
            onOpenChange(false)
            toast.success("Profil mis à jour.");
        } catch (erreur) {
            const message = (erreur as ErreurAuth).message ?? "Une erreur est survenue. Réessayez.";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Modifier mon profil</DialogTitle>
                    <DialogDescription>
                        Ces informations sont visibles par les vendeurs et acheteurs avec qui vous échangez.
                    </DialogDescription>
                </DialogHeader>

                {/* 3. Branche ce <form> sur ton handler de l'étape 2 (onSubmit={handleSubmit}),
            et chaque <Input> sur formData/setFormData + fieldErrors — même
            pattern que ChampTexte dans app/auth/page.tsx. */}
                <form className="space-y-4" onSubmit={handleEditSubmit}>
                    <div>
                        <label htmlFor="fullname" className="text-sm font-medium">
                            Nom complet
                        </label>
                        <Input id="fullname" name="fullname" className="mt-1.5"
                            value={formData.fullname}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="text-sm font-medium">
                            Email
                        </label>
                        <Input id="email" name="email" type="email" className="mt-1.5"
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label htmlFor="telephone" className="text-sm font-medium">
                            Téléphone
                        </label>
                        <Input id="telephone" name="telephone" type="tel" className="mt-1.5"
                            value={formData.telephone}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label htmlFor="adresse" className="text-sm font-medium">
                            Adresse
                        </label>
                        <Input id="adresse" name="adresse" className="mt-1.5"
                            value={formData.adresse}
                            onChange={handleChange}
                        />
                    </div>

                    {/* 4. Affiche `error` ici s'il est non-null, role="alert" comme dans auth/page.tsx */}

                    {error && (
                        <p
                            role="alert"
                            className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
                        >
                            {error}
                        </p>
                    )}
                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className={cn(buttonVariants({ variant: "outline" }))}
                        >
                            Annuler
                        </button>
                        <Button type="submit">
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
