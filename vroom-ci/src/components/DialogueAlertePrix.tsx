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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, messageErreur } from "@/lib/api";

export type DialogueAlertePrixProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    marqueDefaut: string;
    modeleDefaut: string;
    /** Prix affiché sur la carte au moment de l'ouverture — sert de valeur par défaut du seuil. */
    prixDefaut: number;
};

export default function DialogueAlertePrix({
    open,
    onOpenChange,
    marqueDefaut,
    modeleDefaut,
    prixDefaut,
}: DialogueAlertePrixProps) {
    const [marque, setMarque] = useState(marqueDefaut);
    const [modele, setModele] = useState(modeleDefaut);
    const [prixMax, setPrixMax] = useState(String(prixDefaut));
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);

    const soumettre = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErreur(null);

        const payload = {
            marque_cible: marque,
            modele_cible: modele,
            prix_max: Number(prixMax),
        };

        setEnvoiEnCours(true);
        try {
            await api.post("alertes", payload);
            toast.success("Alerte créée.");
            onOpenChange(false);
        } catch (erreurCatch) {
            const message = messageErreur(erreurCatch, "La création de l'alerte a échoué.");
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
                        <DialogTitle>Créer une alerte de prix</DialogTitle>
                        <DialogDescription>
                            Vous serez prévenu dès qu&apos;une annonce correspondant à ces critères sera publiée.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="marque-alerte">Marque</Label>
                            <Input
                                id="marque-alerte"
                                className="mt-2"
                                value={marque}
                                onChange={(e) => setMarque(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="modele-alerte">Modèle</Label>
                            <Input
                                id="modele-alerte"
                                className="mt-2"
                                value={modele}
                                onChange={(e) => setModele(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="prix-max-alerte">Prix maximum (FCFA)</Label>
                        <Input
                            id="prix-max-alerte"
                            type="number"
                            min={0}
                            className="mt-2"
                            value={prixMax}
                            onChange={(e) => setPrixMax(e.target.value)}
                        />
                    </div>

                    {erreur && <p className="text-sm text-destructive">{erreur}</p>}

                    <DialogFooter>
                        <Button type="submit" disabled={!prixMax || envoiEnCours}>
                            {envoiEnCours ? "Création..." : "Créer l'alerte"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
