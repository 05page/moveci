"use client";
import { QRCodeSVG } from "qrcode.react";
import jsQR from "jsqr";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarRange, Car, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cn,
  formaterDateCourte,
  formaterFcfa,
  initiales,
  urlPhoto,
} from "@/lib/utils";
import { libelleVehicule, photoPrincipale } from "@/lib/vehicule";
import type { TransactionConclue } from "@/types";


export type CarteTransactionProps = {
  transaction: TransactionConclue;
  perspective: "client" | "vendeur";
  onConfirmer?: (code: string) => void;
  onRefuser?: () => void;
  onRestituer?: (code: string) => void;
  enCours?: boolean;
  /** Vers la fiche détaillée de CETTE transaction (`/client/transactions/{id}` ou `/vendeur/transactions/{id}`) — absent = titre non cliquable, comme sur les cartes déjà utilisées dans les pages profil. */
  hrefDetail?: string;
};

/** Verbe affiché selon le camp et la nature du deal. */
const VERBES: Record<"client" | "vendeur", Record<"vente" | "location", string>> =
{
  client: { vente: "Acheté à", location: "Loué auprès de" },
  vendeur: { vente: "Vendu à", location: "Loué à" },
};

/** Libellé du badge posé sur la photo : un achat vu du client est une vente vue du vendeur. */
const LIBELLES_NATURE: Record<
  "client" | "vendeur",
  Record<"vente" | "location", string>
> = {
  client: { vente: "Achat", location: "Location" },
  vendeur: { vente: "Vente", location: "Location" },
};

type ChampCodeOuScanProps = {
  code: string;
  onChangeCode: (valeur: string) => void;
  disabled: boolean;
};
  
/** `BarcodeDetector` n'est pas encore dans les types TS standard — déclaré à la main, minimal. */
type BarcodeDetectorNatif = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorNatif;
  }
}

function ChampCodeOuScan({ code, onChangeCode, disabled }: ChampCodeOuScanProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanOuvert, setScanOuvert] = useState(false);

  // Ne tourne que pendant que le scan est ouvert (scanOuvert === true) — s'arrête et
  // coupe la caméra dès que scanOuvert repasse à false, ou que le composant démonte.
  useEffect(() => {
    if (!scanOuvert) return;

    let flux: MediaStream | null = null;
    let arrete = false;
    let idFrame = 0;

    const demarrerScan = async () => {
      flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (arrete || !videoRef.current) return;
      videoRef.current.srcObject = flux;

      // API native si dispo (Chrome/Edge/Android) — sinon repli jsQR fait à la main.
      const detecteur = window.BarcodeDetector
        ? new window.BarcodeDetector({ formats: ["qr_code"] })
        : null;

      const boucle = async () => {
        if (arrete || !videoRef.current) return;

        let valeurLue: string | null = null;

        if (detecteur) {
          const resultats = await detecteur.detect(videoRef.current);
          valeurLue = resultats[0]?.rawValue ?? null;
        } else if (canvasRef.current && videoRef.current.videoWidth > 0) {
          const canvas = canvasRef.current;
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const image = ctx?.getImageData(0, 0, canvas.width, canvas.height);
          if (image) {
            valeurLue = jsQR(image.data, image.width, image.height)?.data ?? null;
          }
        }

        if (valeurLue) {
          onChangeCode(valeurLue);
          setScanOuvert(false);
          return;
        }

        idFrame = requestAnimationFrame(boucle);
      };

      boucle();
    };

    demarrerScan();

    // Cleanup : appelé quand scanOuvert repasse à false OU que le composant démonte.
    return () => {
      arrete = true;
      cancelAnimationFrame(idFrame);
      flux?.getTracks().forEach((piste) => piste.stop());
    };
  }, [scanOuvert, onChangeCode]);

  return (
    <div>
      {scanOuvert ? (
        <div className="space-y-2">
          <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-md" />
          {/* jamais affiché — sert seulement au repli jsQR pour lire les pixels de la vidéo */}
          <canvas ref={canvasRef} className="hidden" />
          <Button type="button" size="sm" variant="outline" onClick={() => setScanOuvert(false)}>
            Annuler le scan
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" disabled={disabled} onClick={() => setScanOuvert(true)}>
          Scanner le QR du vendeur
        </Button>
      )}
    </div>
  );
}

export default function CarteTransaction({
  transaction,
  perspective,
  onConfirmer,
  onRefuser,
  onRestituer,
  enCours = false,
  hrefDetail,
}: CarteTransactionProps) {
  const { vehicule, type, statut } = transaction;
  const [code, setCode] = useState("");

  // une seule des deux relations est chargée, selon l'endpoint qui a produit la donnée
  const contrepartie =
    perspective === "client" ? transaction.vendeur : transaction.client;

  const libelle = libelleVehicule(vehicule.description, vehicule.id);
  const photo = photoPrincipale(vehicule.photos);

  const estLocation = type === "location";

  return (
    <article className="group overflow-hidden rounded-2xl border border-border transition-colors hover:border-primary">
      <div className="relative aspect-16/10 bg-muted">
        {photo ? (
          // <img> et non <Image> : les photos viennent du backend, absent des remotePatterns
          <img
            src={urlPhoto(photo.path)}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <Car className="size-10" />
          </span>
        )}

        <Badge
          className={cn(
            "absolute left-3 top-3",
            estLocation
              ? "bg-background text-foreground"
              : "bg-primary text-primary-foreground"
          )}
        >
          {LIBELLES_NATURE[perspective][type]}
        </Badge>

        {/* visible sur les transactions "en_attente" (section dédiée) ou si un appelant oublie de filtrer */}
        {statut !== "confirmé" && (
          <Badge variant="outline" className="absolute right-3 top-3 bg-background">
            {statut}
          </Badge>
        )}
      </div>

      <div className="p-5">
        {hrefDetail ? (
          <Link
            href={hrefDetail}
            className="lien-anime block truncate font-heading text-lg font-bold hover:text-primary"
          >
            {libelle}
          </Link>
        ) : (
          <h3 className="truncate font-heading text-lg font-bold">{libelle}</h3>
        )}

        <p className="mt-1 font-semibold tabular-nums">
          {/* Number() obligatoire : `prix_final` est une string, un + concatènerait */}
          {formaterFcfa(Number(transaction.prix_final))}
          {estLocation && (
            <span className="font-normal text-muted-foreground"> / jour</span>
          )}
        </p>

        {/* les deux dates ne sont renseignées que sur une location */}
        {estLocation && transaction.date_debut_location && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarRange className="size-3.5 shrink-0" />
            {formaterDateCourte(transaction.date_debut_location)}
            {transaction.date_fin_location &&
              ` → ${formaterDateCourte(transaction.date_fin_location)}`}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
          {contrepartie ? (
            <>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initiales(contrepartie.fullname)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted-foreground">
                  {VERBES[perspective][type]}
                </span>
                <Link
                  href={`/vendeurs/${contrepartie.id}`}
                  className="lien-anime block truncate text-sm font-semibold hover:text-primary"
                >
                  {contrepartie.fullname}
                </Link>
              </span>
            </>
          ) : (
            <span className="flex-1 text-xs text-muted-foreground">
              Contrepartie non chargée
            </span>
          )}

          <Link
            href={`/vehicules/${vehicule.id}`}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
            aria-label={`Voir la fiche de ${libelle}`}
          >
            Fiche
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Conclu le {formaterDateCourte(transaction.created_at)}
        </p>

        {statut === "en_attente" && (onConfirmer || onRefuser) && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {/* Un seul scan côté client finalise tout (voir docs/transaction.md §1.3/§2.1) —
                le vendeur n'a plus d'action à faire, juste montrer son QR en attendant. */}
            {perspective === "vendeur"
              ? transaction.code_confirmation && (
                  <div className="text-center">
                    <QRCodeSVG value={transaction.code_confirmation} size={96} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Montrez ce QR au client — sa confirmation finalise la transaction.
                    </p>
                  </div>
                )
              : onConfirmer && (
                  <div className="flex flex-wrap items-center gap-2">
                    <ChampCodeOuScan code={code} onChangeCode={setCode} disabled={enCours} />
                    <Button
                      type="button"
                      size="sm"
                      disabled={code.length !== 6 || enCours}
                      onClick={() => onConfirmer(code)}
                    >
                      Confirmer
                    </Button>
                  </div>
                )}

            {onRefuser && (
              <button
                type="button"
                onClick={onRefuser}
                disabled={enCours}
                className="text-xs font-medium text-destructive transition-colors hover:underline disabled:opacity-60"
              >
                Refuser la transaction
              </button>
            )}
          </div>
        )}

        {/* Restitution : location déjà confirmée (statut "confirmé"), fenêtre ouverte
            (code_restitution non-null) et pas encore restituée. Un seul scan client
            finalise tout (voir docs/transaction.md §1.3/§2.1), même principe que la remise. */}
        {estLocation &&
          statut === "confirmé" &&
          transaction.code_restitution &&
          !transaction.restitue_par_client &&
          (onRestituer || perspective === "vendeur") && (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted-foreground">Restitution du véhicule</p>

              {perspective === "vendeur" ? (
                <div className="text-center">
                  <QRCodeSVG value={transaction.code_restitution} size={96} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Montrez ce QR au client — sa confirmation finalise la restitution.
                  </p>
                </div>
              ) : (
                onRestituer && (
                  <div className="flex flex-wrap items-center gap-2">
                    <ChampCodeOuScan code={code} onChangeCode={setCode} disabled={enCours} />
                    <Button
                      type="button"
                      size="sm"
                      disabled={code.length !== 6 || enCours}
                      onClick={() => onRestituer(code)}
                    >
                      Confirmer
                    </Button>
                  </div>
                )
              )}
            </div>
          )}
      </div>
    </article>
  );
}
