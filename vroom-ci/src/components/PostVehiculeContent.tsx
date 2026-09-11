"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Camera,
  Car,
  FileText,
  ImagePlus,
  Loader2,
  Settings2,
  X,
} from "lucide-react";

import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxIcon,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn, urlPhoto } from "@/lib/utils";
import { MARQUES, MODELES_PAR_MARQUE, type Marque } from "@/lib/marques-vehicules";
import type {
  HistoriqueAccidents,
  PhotoVehicule,
  PostTypeVehicule,
  StatutDocument,
  TypeVehicule,
  VehiculeFiche,
} from "@/types";

/** `Combobox` infère son type Value depuis `items` : élargi en `string[]` pour matcher `formulaire.marque` (une simple string côté back, pas un enum). */
const MARQUES_RECHERCHABLES: string[] = MARQUES.slice();

const OPTIONS_POST_TYPE: { valeur: PostTypeVehicule; libelle: string }[] = [
  { valeur: "vente", libelle: "Vente" },
  { valeur: "location", libelle: "Location" },
];

const OPTIONS_TYPE: { valeur: TypeVehicule; libelle: string }[] = [
  { valeur: "neuf", libelle: "Neuf" },
  { valeur: "occasion", libelle: "Occasion" },
];

/** "" = non précisé côté formulaire — converti en `undefined` avant l'envoi, le back n'accepte pas la chaîne vide sur un `Rule::in`. */
const OPTIONS_DOCUMENT: { valeur: StatutDocument | ""; libelle: string }[] = [
  { valeur: "", libelle: "Non précisé" },
  { valeur: "à_jour", libelle: "À jour" },
  { valeur: "expirée", libelle: "Expirée" },
  { valeur: "non_concerné", libelle: "Non concerné" },
];

const OPTIONS_ACCIDENTS: { valeur: HistoriqueAccidents | ""; libelle: string }[] = [
  { valeur: "", libelle: "Non précisé" },
  { valeur: "aucun", libelle: "Aucun accident" },
  { valeur: "quelques_accidents", libelle: "Quelques accidents" },
  { valeur: "nombreux_accidents", libelle: "Nombreux accidents" },
];

/** Descendant, la plus récente en premier — c'est l'ordre dans lequel un vendeur cherche son année. */
const ANNEE_COURANTE = new Date().getFullYear();
const OPTIONS_ANNEE: { valeur: string; libelle: string }[] = [
  { valeur: "", libelle: "Non précisée" },
  ...Array.from({ length: ANNEE_COURANTE - 1990 + 2 }, (_, i) => {
    const annee = ANNEE_COURANTE + 1 - i;
    return { valeur: String(annee), libelle: String(annee) };
  }),
];

/** `carburant` est une string libre côté back (max 100) — cette liste ne fait que borner le formulaire aux valeurs courantes. */
const OPTIONS_CARBURANT: { valeur: string; libelle: string }[] = [
  { valeur: "", libelle: "Non précisé" },
  { valeur: "Essence", libelle: "Essence" },
  { valeur: "Diesel", libelle: "Diesel" },
  { valeur: "Hybride", libelle: "Hybride" },
  { valeur: "Électrique", libelle: "Électrique" },
  { valeur: "GPL", libelle: "GPL" },
];

const OPTIONS_TRANSMISSION: { valeur: string; libelle: string }[] = [
  { valeur: "", libelle: "Non précisée" },
  { valeur: "Automatique", libelle: "Automatique" },
  { valeur: "Manuelle", libelle: "Manuelle" },
  { valeur: "Semi-automatique", libelle: "Semi-automatique" },
];

/** Liste libre côté back (`equipements` est un `json` casté en array, pas un enum) — celle-ci ne sert qu'à peupler les cases à cocher. */
const EQUIPEMENTS_DISPONIBLES = [
  "Climatisation",
  "Vitres électriques",
  "GPS",
  "Bluetooth",
  "Caméra de recul",
  "Régulateur de vitesse",
  "Sièges cuir",
  "Toit ouvrant",
  "ABS",
  "Airbags",
];

const PHOTOS_MAX = 8;
const TAILLE_PHOTO_MAX_OCTETS = 2 * 1024 * 1024; // 2048 Ko, comme `photos.*` côté back

type FormulaireVehicule = {
  post_type: PostTypeVehicule;
  type: TypeVehicule;
  marque: string;
  modele: string;
  annee: string;
  prix: string;
  negociable: boolean;
  date_disponibilite: string;
  carburant: string;
  transmission: string;
  kilometrage: string;
  couleur: string;
  nombre_portes: string;
  nombre_places: string;
  visite_technique: StatutDocument | "";
  date_visite_technique: string;
  carte_grise: StatutDocument | "";
  date_carte_grise: string;
  assurance: StatutDocument | "";
  historique_accidents: HistoriqueAccidents | "";
  equipements: string[];
};

const FORMULAIRE_VIDE: FormulaireVehicule = {
  post_type: "vente",
  type: "occasion",
  marque: "",
  modele: "",
  annee: "",
  prix: "",
  negociable: false,
  date_disponibilite: "",
  carburant: "",
  transmission: "",
  kilometrage: "",
  couleur: "",
  nombre_portes: "",
  nombre_places: "",
  visite_technique: "",
  date_visite_technique: "",
  carte_grise: "",
  date_carte_grise: "",
  assurance: "",
  historique_accidents: "",
  equipements: [],
};

const posterVehicule = async (donnees: FormulaireVehicule, photos: File[]) => {
  const formData = new FormData();

  // Correction au passage : marque et modele sont `required` côté back eux aussi
  // (j'avais dit "3 seuls champs required" plus tôt, c'était faux — il y en a 5).
  formData.append("post_type", donnees.post_type);
  formData.append("type", donnees.type);
  formData.append("prix", donnees.prix);
  formData.append("marque", donnees.marque);
  formData.append("modele", donnees.modele);
  formData.append("negociable", donnees.negociable ? "1" : "0");

  const champsOptionnels: (keyof FormulaireVehicule)[] = [
    "annee",
    "date_disponibilite",
    "carburant",
    "transmission",
    "kilometrage",
    "couleur",
    "nombre_portes",
    "nombre_places",
    "visite_technique",
    "date_visite_technique",
    "carte_grise",
    "date_carte_grise",
    "assurance",
    "historique_accidents",
  ];

  champsOptionnels.forEach((champ) => {
    const valeur = donnees[champ];
    if (typeof valeur === "string" && valeur !== "") {
      formData.append(champ, valeur);
    }
  });

  donnees.equipements.forEach((equipement) => {
    formData.append("equipements[]", equipement);
  });

  photos.forEach((photo) => {
    formData.append("photos[]", photo);
  });

  const reponse = await api.post<{data: { vehicule: { id: string } };
}>("vehicules/post-vehicule", formData);

  return reponse.data.vehicule;
};

const updateVehicule = async (id:  string, donnees: FormulaireVehicule, photos: File[]) => {
  const formData = new FormData();
  formData.append("_method", "PUT");

  const champsOptionnels: (keyof FormulaireVehicule)[] = [
    "post_type",
    "type",
    "prix",
    "modele",
    "marque",
    "annee",
    "date_disponibilite",
    "carburant",
    "transmission",
    "kilometrage",
    "couleur",
    "nombre_portes",
    "nombre_places",
    "visite_technique",
    "date_visite_technique",
    "carte_grise",
    "date_carte_grise",
    "assurance",
    "historique_accidents"
  ];
  formData.append("negociable", donnees.negociable ? "1" : "0");

  champsOptionnels.forEach((champ) => {
    const valeur = donnees[champ];
    if (typeof valeur === "string" && valeur !== "") {
      formData.append(champ, valeur);
    }
  });
  donnees.equipements.forEach((equipement) => {
    formData.append("equipements[]", equipement);
  });

  photos.forEach((photo) => {
    formData.append("photos[]", photo);
  });

  const reponse = await api.post<{
    data: { vehicule: { id: string } };
  }>(`vehicules/${id}`, formData);

  return reponse.data.vehicule
}

/** Même contrat que GET /vehicules/mon-vehicule/{id} (VehiculesController::monVehicule). */
const recupererMonVehicule = async (id: string): Promise<VehiculeFiche> => {
  const reponse = await api.get<{ data: VehiculeFiche }>(`vehicules/mon-vehicule/${id}`);
  return reponse.data;
};

/**
 * `VehiculeFiche` -> `FormulaireVehicule` : les colonnes numériques/nullable de la
 * fiche deviennent des strings (le formulaire ne connaît que des strings), "" pour
 * toute valeur absente. Les 10 premiers caractères d'une date isolent "YYYY-MM-DD"
 * du timestamp complet que Laravel peut renvoyer, seul format qu'accepte <input type="date">.
 */
const formulaireDepuisFiche = (vehicule: VehiculeFiche): FormulaireVehicule => {
  const description = vehicule.description;

  return {
    post_type: vehicule.post_type,
    type: vehicule.type,
    marque: description?.marque ?? "",
    modele: description?.modele ?? "",
    annee: description?.annee != null ? String(description.annee) : "",
    prix: vehicule.prix,
    negociable: vehicule.negociable,
    date_disponibilite: vehicule.date_disponibilite?.slice(0, 10) ?? "",
    carburant: description?.carburant ?? "",
    transmission: description?.transmission ?? "",
    kilometrage: description?.kilometrage != null ? String(description.kilometrage) : "",
    couleur: description?.couleur ?? "",
    nombre_portes: description?.nombre_portes != null ? String(description.nombre_portes) : "",
    nombre_places: description?.nombre_places != null ? String(description.nombre_places) : "",
    visite_technique: description?.visite_technique ?? "",
    date_visite_technique: description?.date_visite_technique?.slice(0, 10) ?? "",
    carte_grise: description?.carte_grise ?? "",
    date_carte_grise: description?.date_carte_grise?.slice(0, 10) ?? "",
    assurance: description?.assurance ?? "",
    historique_accidents: description?.historique_accidents ?? "",
    equipements: description?.equipements ?? [],
  };
};

export type PostVehiculeContentProps = {
  /** Présent = mode édition (PUT sur ce véhicule). Absent = création. */
  id?: string;
};

export default function PostVehiculeContent({ id }: PostVehiculeContentProps) {
  const navigate = useRouter();
  const modeEdition = id !== undefined;
  const [formulaire, setFormulaire] = useState<FormulaireVehicule>(FORMULAIRE_VIDE);
  const [photos, setPhotos] = useState<File[]>([]);
  const [apercus, setApercus] = useState<string[]>([]);
  const [photosExistantes, setPhotosExistantes] = useState<PhotoVehicule[]>([]);
  const [chargementFiche, setChargementFiche] = useState(modeEdition);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let annule = false;

    recupererMonVehicule(id)
      .then((vehicule) => {
        if (annule) return;
        setFormulaire(formulaireDepuisFiche(vehicule));
        setPhotosExistantes(vehicule.photos);
        setChargementFiche(false);
      })
      .catch(() => {
        if (annule) return;
        setErreur("Impossible de charger ce véhicule.");
        setChargementFiche(false);
      });

    return () => {
      annule = true;
    };
  }, [id]);

  // un objectURL non révoqué fuit tant que l'onglet reste ouvert : on nettoie à chaque changement ET au démontage
  useEffect(() => {
    return () => {
      apercus.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [apercus]);

  const definirChamp = <C extends keyof FormulaireVehicule>(
    champ: C,
    valeur: FormulaireVehicule[C]
  ) => {
    setFormulaire((actuel) => ({ ...actuel, [champ]: valeur }));
  };

  // vide pour une marque hors liste ("Autre") ou tant qu'aucune marque n'est choisie
  const modelesDisponibles = useMemo(
    () => MODELES_PAR_MARQUE[formulaire.marque as Marque] ?? [],
    [formulaire.marque]
  );

  const basculerEquipement = (equipement: string) => {
    setFormulaire((actuel) => ({
      ...actuel,
      equipements: actuel.equipements.includes(equipement)
        ? actuel.equipements.filter((e) => e !== equipement)
        : [...actuel.equipements, equipement],
    }));
  };

  const ajouterPhotos = (fichiers: FileList | null) => {
    if (!fichiers) return;
    setErreur(null);

    const candidats = Array.from(fichiers).slice(0, PHOTOS_MAX - photos.length);
    const rejetees = candidats.filter((f) => f.size > TAILLE_PHOTO_MAX_OCTETS);

    if (rejetees.length > 0) {
      setErreur(`${rejetees.length} photo(s) dépassent 2 Mo et n'ont pas été ajoutées.`);
    }

    const valides = candidats.filter((f) => f.size <= TAILLE_PHOTO_MAX_OCTETS);
    setPhotos((actuel) => [...actuel, ...valides]);
    setApercus((actuel) => [...actuel, ...valides.map((f) => URL.createObjectURL(f))]);
  };

  const retirerPhoto = (index: number) => {
    URL.revokeObjectURL(apercus[index]);
    setPhotos((actuel) => actuel.filter((_, i) => i !== index));
    setApercus((actuel) => actuel.filter((_, i) => i !== index));
  };

  // le formulaire complet couvre bien plus que ces 3 champs, mais ce sont les seuls `required` côté back en plus de post_type/type (déjà bornés par le Select)
  const pretAEnvoyer =
    formulaire.marque.trim().length > 0 &&
    formulaire.modele.trim().length > 0 &&
    formulaire.prix.trim().length > 0;

  const envoyer = async () => {
    if (!pretAEnvoyer || envoi) return;

    setEnvoi(true);
    setErreur(null);

    try {
      if (modeEdition) {
        await updateVehicule(id, formulaire, photos);
        toast.success("Annonce modifiée.");
        navigate.push(`/vendeur/vehicule/${id}`);
      } else {
        await posterVehicule(formulaire, photos);
        setFormulaire(FORMULAIRE_VIDE);
        setPhotos([]);
        setApercus([]);
        toast.success("Annonce publiée.");
        navigate.push("/vehicules");
      }
      apercus.forEach((url) => URL.revokeObjectURL(url));
    } catch {
      const message = modeEdition
        ? "La modification a échoué. Réessayez dans quelques instants."
        : "La publication a échoué. Réessayez dans quelques instants.";
      setErreur(message);
      toast.error(message);
    } finally {
      setEnvoi(false);
    }
  };

  if (chargementFiche) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-8 lg:py-10">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-8 h-96 w-full" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 lg:py-10">
      <header>
        <h1 className="font-heading text-2xl font-bold md:text-3xl">
          {modeEdition ? "Modifier le véhicule" : "Publier un véhicule"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {modeEdition
            ? "L'annonce repasse en attente de validation après modification."
            : "L'annonce reste en attente de validation (vérification automatique des photos) avant d'apparaître dans le catalogue."}
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          envoyer();
        }}
        className="mt-8 space-y-8"
      >
        {/* ── Type d'annonce ─────────────────────────────────────────── */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="post_type">Annonce</Label>
            <Select
              value={formulaire.post_type}
              onValueChange={(v) => v && definirChamp("post_type", v as PostTypeVehicule)}
            >
              <SelectTrigger id="post_type" className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPTIONS_POST_TYPE.map((o) => (
                  <SelectItem key={o.valeur} value={o.valeur}>
                    {o.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="type">État</Label>
            <Select
              value={formulaire.type}
              onValueChange={(v) => v && definirChamp("type", v as TypeVehicule)}
            >
              <SelectTrigger id="type" className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPTIONS_TYPE.map((o) => (
                  <SelectItem key={o.valeur} value={o.valeur}>
                    {o.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <Separator />

        {/* ── Identification ─────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-heading text-sm font-bold">
            <Car className="size-4 text-primary" />
            Identification
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="marque">Marque *</Label>
              <Combobox
                items={MARQUES_RECHERCHABLES}
                value={formulaire.marque || null}
                onValueChange={(v) => {
                  definirChamp("marque", v ?? "");
                  // le modèle appartient à l'ancienne marque : il ne veut plus rien dire une fois la marque changée
                  definirChamp("modele", "");
                }}
              >
                <ComboboxInputGroup className="mt-2">
                  <ComboboxInput id="marque" placeholder="Rechercher une marque…" required />
                  <ComboboxClear />
                  <ComboboxIcon />
                </ComboboxInputGroup>
                <ComboboxContent>
                  <ComboboxEmpty>Aucune marque trouvée.</ComboboxEmpty>
                  <ComboboxList>
                    {(marque: string) => (
                      <ComboboxItem key={marque} value={marque}>
                        {marque}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
            <div>
              <Label htmlFor="modele">Modèle *</Label>
              {modelesDisponibles.length > 0 ? (
                <Combobox
                  items={modelesDisponibles}
                  value={formulaire.modele || null}
                  onValueChange={(v) => definirChamp("modele", v ?? "")}
                >
                  <ComboboxInputGroup className="mt-2">
                    <ComboboxInput
                      id="modele"
                      placeholder="Rechercher un modèle…"
                      disabled={!formulaire.marque}
                      required
                    />
                    <ComboboxClear />
                    <ComboboxIcon />
                  </ComboboxInputGroup>
                  <ComboboxContent>
                    <ComboboxEmpty>Aucun modèle trouvé.</ComboboxEmpty>
                    <ComboboxList>
                      {(modele: string) => (
                        <ComboboxItem key={modele} value={modele}>
                          {modele}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              ) : (
                // marque hors liste ("Autre") ou pas encore choisie : aucun modèle connu à proposer, on repasse en saisie libre
                <Input
                  id="modele"
                  value={formulaire.modele}
                  onChange={(e) => definirChamp("modele", e.target.value)}
                  placeholder={formulaire.marque ? "Modèle" : "Choisissez d'abord une marque"}
                  disabled={!formulaire.marque}
                  className="mt-2"
                  required
                />
              )}
            </div>
            <div>
              <Label htmlFor="annee">Année</Label>
              <Select
                value={formulaire.annee}
                onValueChange={(v) => definirChamp("annee", v ?? "")}
              >
                <SelectTrigger id="annee" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPTIONS_ANNEE.map((o) => (
                    <SelectItem key={o.valeur || "vide"} value={o.valeur}>
                      {o.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="kilometrage">Kilométrage</Label>
              <Input
                id="kilometrage"
                type="number"
                inputMode="numeric"
                value={formulaire.kilometrage}
                onChange={(e) => definirChamp("kilometrage", e.target.value)}
                placeholder="48500"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="carburant">Carburant</Label>
              <Select
                value={formulaire.carburant}
                onValueChange={(v) => definirChamp("carburant", v ?? "")}
              >
                <SelectTrigger id="carburant" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPTIONS_CARBURANT.map((o) => (
                    <SelectItem key={o.valeur || "vide"} value={o.valeur}>
                      {o.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transmission">Transmission</Label>
              <Select
                value={formulaire.transmission}
                onValueChange={(v) => definirChamp("transmission", v ?? "")}
              >
                <SelectTrigger id="transmission" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPTIONS_TRANSMISSION.map((o) => (
                    <SelectItem key={o.valeur || "vide"} value={o.valeur}>
                      {o.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="couleur">Couleur</Label>
              <Input
                id="couleur"
                value={formulaire.couleur}
                onChange={(e) => definirChamp("couleur", e.target.value)}
                placeholder="Gris"
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre_portes">Portes</Label>
                <Input
                  id="nombre_portes"
                  type="number"
                  inputMode="numeric"
                  value={formulaire.nombre_portes}
                  onChange={(e) => definirChamp("nombre_portes", e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="nombre_places">Places</Label>
                <Input
                  id="nombre_places"
                  type="number"
                  inputMode="numeric"
                  value={formulaire.nombre_places}
                  onChange={(e) => definirChamp("nombre_places", e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* ── Prix & disponibilité ───────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-heading text-sm font-bold">
            <Banknote className="size-4 text-primary" />
            Prix &amp; disponibilité
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="prix">Prix (FCFA) *</Label>
              <Input
                id="prix"
                type="number"
                inputMode="numeric"
                min={0}
                value={formulaire.prix}
                onChange={(e) => definirChamp("prix", e.target.value)}
                placeholder="6250000"
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="date_disponibilite">Disponible à partir du</Label>
              <Input
                id="date_disponibilite"
                type="date"
                value={formulaire.date_disponibilite}
                onChange={(e) => definirChamp("date_disponibilite", e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={formulaire.negociable}
              onChange={(e) => definirChamp("negociable", e.target.checked)}
              className="size-4 rounded border-input accent-primary"
            />
            Prix négociable
          </label>
        </section>

        <Separator />

        {/* ── Papiers ─────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-heading text-sm font-bold">
            <FileText className="size-4 text-primary" />
            Papiers
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="visite_technique">Visite technique</Label>
              <Select
                value={formulaire.visite_technique}
                onValueChange={(v) =>
                  definirChamp("visite_technique", (v ?? "") as StatutDocument | "")
                }
              >
                <SelectTrigger id="visite_technique" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPTIONS_DOCUMENT.map((o) => (
                    <SelectItem key={o.valeur || "vide"} value={o.valeur}>
                      {o.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date_visite_technique">Date de visite technique</Label>
              <Input
                id="date_visite_technique"
                type="date"
                value={formulaire.date_visite_technique}
                onChange={(e) => definirChamp("date_visite_technique", e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="carte_grise">Carte grise</Label>
              <Select
                value={formulaire.carte_grise}
                onValueChange={(v) => definirChamp("carte_grise", (v ?? "") as StatutDocument | "")}
              >
                <SelectTrigger id="carte_grise" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPTIONS_DOCUMENT.map((o) => (
                    <SelectItem key={o.valeur || "vide"} value={o.valeur}>
                      {o.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date_carte_grise">Date de carte grise</Label>
              <Input
                id="date_carte_grise"
                type="date"
                value={formulaire.date_carte_grise}
                onChange={(e) => definirChamp("date_carte_grise", e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="assurance">Assurance</Label>
              <Select
                value={formulaire.assurance}
                onValueChange={(v) => definirChamp("assurance", (v ?? "") as StatutDocument | "")}
              >
                <SelectTrigger id="assurance" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPTIONS_DOCUMENT.map((o) => (
                    <SelectItem key={o.valeur || "vide"} value={o.valeur}>
                      {o.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="historique_accidents">Historique accidents</Label>
              <Select
                value={formulaire.historique_accidents}
                onValueChange={(v) =>
                  definirChamp("historique_accidents", (v ?? "") as HistoriqueAccidents | "")
                }
              >
                <SelectTrigger id="historique_accidents" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPTIONS_ACCIDENTS.map((o) => (
                    <SelectItem key={o.valeur || "vide"} value={o.valeur}>
                      {o.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <Separator />

        {/* ── Équipements ─────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-heading text-sm font-bold">
            <Settings2 className="size-4 text-primary" />
            Équipements
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
            {EQUIPEMENTS_DISPONIBLES.map((equipement) => (
              <label key={equipement} className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={formulaire.equipements.includes(equipement)}
                  onChange={() => basculerEquipement(equipement)}
                  className="size-4 rounded border-input accent-primary"
                />
                {equipement}
              </label>
            ))}
          </div>
        </section>

        <Separator />

        {/* ── Photos ──────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-heading text-sm font-bold">
            <Camera className="size-4 text-primary" />
            Photos <span className="font-normal text-muted-foreground">({photos.length}/{PHOTOS_MAX}, 2 Mo max chacune)</span>
          </h2>

          {photosExistantes.length > 0 && (
            <div>
              {/* pas de bouton retirer : l'API de modification ne fait qu'ajouter des photos, jamais en supprimer */}
              <p className="text-xs text-muted-foreground">Déjà en ligne :</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {photosExistantes.map((photo) => (
                  <div key={photo.id} className="size-24 overflow-hidden rounded-lg border border-border">
                    <img src={urlPhoto(photo.path)} alt="" className="size-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {apercus.map((url, index) => (
              <div key={url} className="group relative size-24 overflow-hidden rounded-lg border border-border">
                <img src={url} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => retirerPhoto(index)}
                  aria-label="Retirer cette photo"
                  className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}

            {photos.length < PHOTOS_MAX && (
              <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <ImagePlus className="size-5" />
                <span className="text-[0.6875rem]">Ajouter</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => ajouterPhotos(e.target.files)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </section>

        {erreur && (
          <p role="status" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={!pretAEnvoyer || envoi}
          className={cn(buttonVariants({ size: "lg" }), "effet-action w-full")}
        >
          {envoi ? <Loader2 className="size-4 animate-spin" /> : <Car className="size-4" />}
          {envoi
            ? modeEdition
              ? "Enregistrement…"
              : "Publication…"
            : modeEdition
              ? "Enregistrer les modifications"
              : "Publier le véhicule"}
        </button>
      </form>
    </main>
  );
}
