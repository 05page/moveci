"use client";
import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { api, messageErreur } from "@/lib/api";

const MOTIFS_SIGNALEMENT = [
    { valeur: "annonce_frauduleuse", libelle: "Annonce frauduleuse" },
    { valeur: "prix_suspect", libelle: "Prix suspect / trop bas" },
    { valeur: "vehicule_deja_vendu", libelle: "Véhicule déjà vendu ailleurs" },
    { valeur: "contenu_inapproprie", libelle: "Contenu inapproprié" },
    { valeur: "compte_suspect", libelle: "Compte suspect" },
    { valeur: "autre", libelle: "Autre" },
];

export type DialogueSignalementProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Le back exige l'un OU l'autre (SignalementController::store, routes/api.php:116). */
    cible: { type: "vehicule" | "vendeur"; id: string; label: string };
};

export default function DialogueSignalement({ open, onOpenChange, cible }: DialogueSignalementProps) {
    const [motif, setMotif] = useState("");
    const [description, setDescription] = useState("");
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);

    const soumettre = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErreur(null);

        const payload = {
            motif,
            description: description || undefined,
            ...(cible.type === "vehicule"
                ? { cible_vehicule_id: cible.id }
                : { cible_user_id: cible.id }),
        };

        setEnvoiEnCours(true);
        try {
            await api.post("signalements", payload);
            toast.success("Signalement envoyé.");
            setMotif("");
            setDescription("");
            onOpenChange(false);
        } catch (erreurCatch) {
            const message = messageErreur(erreurCatch, "L'envoi du signalement a échoué.");
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
                        <DialogTitle>Signaler {cible.label}</DialogTitle>
                        <DialogDescription>
                            Votre signalement est transmis à notre équipe de modération.
                        </DialogDescription>
                    </DialogHeader>

                    <div>
                        <Label htmlFor="motif-signalement">Motif</Label>
                        <Select value={motif} onValueChange={(v) => setMotif(v ?? "")}>
                            <SelectTrigger id="motif-signalement" className="mt-2 w-full">
                                <SelectValue placeholder="Choisir un motif" />
                            </SelectTrigger>
                            <SelectContent>
                                {MOTIFS_SIGNALEMENT.map((option) => (
                                    <SelectItem key={option.valeur} value={option.valeur}>
                                        {option.libelle}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="description-signalement">Description (facultatif)</Label>
                        <Textarea
                            id="description-signalement"
                            className="mt-2"
                            maxLength={1000}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Décrivez le problème en quelques mots"
                        />
                    </div>

                    {erreur && <p className="text-sm text-destructive">{erreur}</p>}

                    <DialogFooter>
                        <Button type="submit" disabled={!motif || envoiEnCours}>
                            {envoiEnCours ? "Envoi..." : "Signaler"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
