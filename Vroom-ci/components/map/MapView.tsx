// Fix CSS Leaflet — doit être importé avant tout composant react-leaflet
import "leaflet/dist/leaflet.css"

import L from "leaflet"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import type { UserProche } from "@/src/actions/geolocalisation.actions"

// ─── Fix icônes Leaflet manquantes avec webpack ───────────────────────────────
// Webpack ne résout pas automatiquement les assets internes de Leaflet.
// On pointe directement vers le CDN unpkg pour les images de marqueur.
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

// ─── Icône "Ma position" : point bleu pulsant (style Google Maps) ─────────────
/**
 * Marqueur de position utilisateur avec anneau pulsant.
 * L'animation @keyframes est injectée dans le DOM via la balise <style>
 * embarquée dans le html de la DivIcon.
 */
const ICON_ME = L.divIcon({
  className: "",
  html: `
    <style>
      @keyframes vroomPing {
        0%   { transform: scale(1); opacity: 0.4; }
        100% { transform: scale(3); opacity: 0; }
      }
    </style>
    <div style="position:relative;width:24px;height:24px;">
      <div style="
        position:absolute;inset:0;border-radius:50%;
        background:#3b82f6;opacity:0.4;
        animation:vroomPing 1.8s cubic-bezier(0,0,0.2,1) infinite;
      "></div>
      <div style="
        position:absolute;inset:4px;border-radius:50%;
        background:#3b82f6;border:2.5px solid white;
        box-shadow:0 2px 8px rgba(59,130,246,0.6);
      "></div>
    </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
})

// ─── Icônes custom par rôle (DivIcon = icône HTML/CSS sans image) ─────────────
/**
 * Crée une DivIcon circulaire colorée pour un rôle donné.
 * Plus grand (28px) et avec l'initiale du rôle pour la lisibilité.
 * @param color  Couleur CSS du cercle
 * @param letter Initiale affichée au centre (ex: "V", "C", "A")
 */
function createRoleIcon(color: string, letter: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: ${color};
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.28);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: white;
      font-family: sans-serif;
    ">${letter}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

/** Map rôle → couleur */
const ROLE_COLORS: Record<UserProche["role"], string> = {
  vendeur: "#efbf04",         // gold MOVE
  concessionnaire: "#a855f7", // violet
  auto_ecole: "#06b6d4",      // cyan
}

/** Labels lisibles pour les badges rôle */
const ROLE_LABELS: Record<UserProche["role"], string> = {
  vendeur: "Vendeur",
  concessionnaire: "Concessionnaire",
  auto_ecole: "Auto-école",
}

/** Initiale affichée dans le marqueur par rôle */
const ROLE_INITIALS: Record<UserProche["role"], string> = {
  vendeur: "V",
  concessionnaire: "C",
  auto_ecole: "A",
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MapViewProps {
  /** Centre initial de la carte */
  center: { lat: number; lng: number }
  /** Liste des vendeurs/partenaires à afficher */
  markers: UserProche[]
  /** Callback au clic sur un marqueur */
  onMarkerClick?: (user: UserProche) => void
  /** Classes CSS additionnelles sur le conteneur */
  className?: string
}

// ─── Composant ────────────────────────────────────────────────────────────────
// Pas de "use client" : ce composant est toujours importé via dynamic({ ssr: false })
// ce qui garantit qu'il ne s'exécute jamais côté serveur.

/**
 * Carte Leaflet interactive affichant la position utilisateur
 * et les vendeurs/partenaires proches avec des marqueurs colorés par rôle.
 *
 * IMPORTANT : importer uniquement via `dynamic(..., { ssr: false })` — Leaflet
 * accède à `window` et ne peut pas s'exécuter côté serveur.
 */
export default function MapView({
  center,
  markers,
  onMarkerClick,
  className,
}: MapViewProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      className={className}
      style={{ height: "100%", width: "100%" }}
    >
      {/* Tuiles CartoDB Voyager — plus lisibles et modernes que l'OSM brut */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />

      {/* Marqueur "Ma position" */}
      <Marker position={[center.lat, center.lng]} icon={ICON_ME}>
        <Popup>
          <span className="text-sm font-semibold text-blue-600">
            Ma position
          </span>
        </Popup>
      </Marker>

      {/* Marqueurs des vendeurs / partenaires */}
      {markers.map((user) => {
        const color = ROLE_COLORS[user.role]
        const icon = createRoleIcon(color, ROLE_INITIALS[user.role])

        return (
          <Marker
            key={user.id}
            position={[user.latitude, user.longitude]}
            icon={icon}
            eventHandlers={{
              click: () => onMarkerClick?.(user),
            }}
          >
            <Popup>
              <div className="min-w-40 space-y-1.5">
                {/* Nom + rôle */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-zinc-900">
                    {user.raison_sociale ?? user.fullname}
                  </span>
                  <span
                    className="text-[11px] font-medium px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: color }}
                  >
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>

                {/* Distance */}
                <p className="text-xs text-zinc-500">
                  {Number(user.distance).toFixed(1)} km
                </p>

                {/* Note si disponible */}
                {user.note_moyenne != null && (
                  <p className="text-xs text-zinc-600 flex items-center gap-1">
                    <span>⭐</span>
                    <span>{Number(user.note_moyenne).toFixed(1)} / 5</span>
                  </p>
                )}

                {/* Adresse si disponible */}
                {user.adresse && (
                  <p className="text-xs text-zinc-400">{user.adresse}</p>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
