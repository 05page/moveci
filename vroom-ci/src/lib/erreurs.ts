import type { ErreurAuth } from "@/types";

/**
 * Un `catch` reçoit toujours un `unknown` : TypeScript ne fait aucune hypothèse
 * sur ce qui a été lancé (une API peut rejeter un objet, une string, n'importe quoi).
 * Ce prédicat (`valeur is ErreurAuth`) restreint le type dans la branche du `if`,
 * ce qui donne accès à `.message` et `.errors` sans cast.
 */
export function estErreurAuth(valeur: unknown): valeur is ErreurAuth {
  return (
    typeof valeur === "object" &&
    valeur !== null &&
    "status" in valeur &&
    "message" in valeur
  );
}

/**
 * Une erreur 422 SANS champ `errors` est une erreur métier bloquante : le compte
 * Google qui n'a pas de mot de passe local, le token de reset expiré. Réessayer
 * à l'identique échouera pareil — il faut proposer une autre action, pas un bouton
 * « recommencer ». Une 422 AVEC `errors`, elle, est une simple faute de saisie.
 */
export function estBlocante(erreur: ErreurAuth): boolean {
  return erreur.status === 422 && !erreur.errors;
}
