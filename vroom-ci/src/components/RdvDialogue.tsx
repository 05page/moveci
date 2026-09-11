"use client";
import React, { useState } from "react";
import { toast } from "sonner";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { api, messageErreur } from "@/lib/api";
import type { Rdv, TypeRendezVous } from "@/types";

// ÉTAPE 1 — Ajoute `vehiculeId: string;` ici : le backend (StoreRendezVousRequest::rules())
//   exige `vehicule_id` sur CHAQUE création de rendez-vous, ce dialogue doit donc savoir
//   pour quel véhicule il est ouvert.
export type DialogueRdvProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    date: string;
    type: string;
    vehiculeId: string;
    motif: string;
};

const TYPES_RDV: { valeur: TypeRendezVous; libelle: string }[] = [
    { valeur: "visite", libelle: "Visite" },
    { valeur: "essai_routier", libelle: "Essai routier" },
    { valeur: "premiere_rencontre", libelle: "Première rencontre" },
];

export default function RdvDialogue({ open, onOpenChange, date, type, motif, vehiculeId }: DialogueRdvProps) {
    const [formData, setFormData] = useState({ dateRdv: date, typeRdv: type, motifRdv: motif });
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);

    const handleChange = (champ: keyof typeof formData, valeur: string) => {
        // `...prev` recopie toutes les clés existantes du state précédent, `[champ]: valeur` écrase seulement celle qui a changé.
        setFormData((prev) => ({ ...prev, [champ]: valeur }));
    };

    const soumettre = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErreur(null);
        setEnvoiEnCours(true);

        const payload = {
            vehicule_id: vehiculeId,
            date_heure: formData.dateRdv,
            type: formData.typeRdv,
            motif: formData.motifRdv,
        };

        try {
            await api.post<{ data: Rdv }>("/rdv", payload);
            toast.success("Demande de rendez-vous envoyée.");
            onOpenChange(false);
        } catch (erreurCatch) {
            const message = messageErreur(erreurCatch, "La création du rendez-vous a échoué.");
            setErreur(message);
            toast.error(message);
        } finally {
            setEnvoiEnCours(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={soumettre} className="flex flex-col gap-5">
                    <DialogHeader>
                        <DialogTitle>Prendre rendez-vous</DialogTitle>
                        <DialogDescription>
                            Le vendeur reçoit votre demande et vous confirme un créneau.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="date-rdv">Date</Label>
                            <Input
                                id="date-rdv"
                                type="date"
                                className="mt-2"
                                value={formData.dateRdv}
                                onChange={(e) => handleChange("dateRdv", e.target.value)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="type-rdv">Type de rendez-vous</Label>
                            <Select
                                value={formData.typeRdv}
                                onValueChange={(v) => handleChange("typeRdv", v ?? "")}
                            >
                                <SelectTrigger id="type-rdv" className="mt-2 w-full">
                                    <SelectValue placeholder="Choisir un type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {TYPES_RDV.map((item) => (
                                            <SelectItem key={item.valeur} value={item.valeur}>
                                                {item.libelle}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="motif-rdv">Motif (facultatif)</Label>
                        <Input
                            id="motif-rdv"
                            type="text"
                            className="mt-2"
                            value={formData.motifRdv}
                            onChange={(e) => handleChange("motifRdv", e.target.value)}
                        />
                    </div>

                    {erreur && <p className="text-sm text-destructive">{erreur}</p>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={!formData.dateRdv || !formData.typeRdv || envoiEnCours}>
                            {envoiEnCours ? "Envoi..." : "Envoyer la demande"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
