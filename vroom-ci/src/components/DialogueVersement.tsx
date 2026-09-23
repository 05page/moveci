import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";// adapte le chemin si différent
import { Versement } from "@/types";
import { api, messageErreur } from "@/lib/api";

type EleveInscrit = {
  id: string;
  client: { fullname: string };
};

type Props = {
  formationId: string;
  eleve: EleveInscrit | null;
  onClose: () => void;
  onSucces: (versement: { montant_paye: number }) => void;
};

const ajouterVersement = (
  formationId: string,
  inscriptionId: string,
  donnees: { montant: string; date_versement: string; note: string }
): Promise<{ data: { versement: Versement; montant_paye: number; reste: number } }> =>
  api.post<{ data: { versement: Versement; montant_paye: number; reste: number } }>(
    `formations/${formationId}/inscrits/${inscriptionId}/versements`,
    {
      montant: Number(donnees.montant),
      date_versement: donnees.date_versement || null,
      note: donnees.note || null,
    }
  );
export function DialogueAjouterVersement({ formationId, eleve, onClose, onSucces }: Props) {
  const [montant, setMontant] = useState("");
  const [dateVersement, setDateVersement] = useState("");
  const [note, setNote] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const reinitialiser = () => {
    setMontant("");
    setDateVersement("");
    setNote("");
    setErreur(null);
  };

  const fermer = () => {
    reinitialiser();
    onClose();
  };

  const envoyer = async () => {
    if (envoi || !eleve) return;

    const montantNombre = Number(montant);
    if (!montantNombre || montantNombre <= 0) {
      setErreur("Le montant doit être supérieur à 0.");
      return;
    }

    setEnvoi(true);
    setErreur(null);
    try {
      const reponse = await ajouterVersement(formationId, eleve.id, {
        montant: montant,
        date_versement: dateVersement,
        note,
      });
      toast.success("Versement enregistré");
      onSucces({ montant_paye: reponse.data.montant_paye });
      fermer();
    } catch (e) {
      const message = messageErreur(e, "L'enregistrement du versement a échoué.");
      setErreur(message);
      toast.error(message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Dialog open={eleve !== null} onOpenChange={(ouvert) => !ouvert && fermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un paiement {eleve ? `— ${eleve.client.fullname}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="montant-versement">Montant (FCFA)</Label>
            <Input
              id="montant-versement"
              type="number"
              min={1}
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="date-versement">Date du versement</Label>
            <Input
              id="date-versement"
              type="date"
              value={dateVersement}
              onChange={(e) => setDateVersement(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="note-versement">Note (optionnel)</Label>
            <Input
              id="note-versement"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-2"
            />
          </div>

          {erreur && (
            <p role="status" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
              {erreur}
            </p>
          )}
        </div>
        <DialogFooter>
          <button type="button" onClick={fermer} className={cn(buttonVariants({ variant: "outline" }))}>
            Annuler
          </button>
          <button type="button" disabled={envoi} onClick={envoyer} className={cn(buttonVariants())}>
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}