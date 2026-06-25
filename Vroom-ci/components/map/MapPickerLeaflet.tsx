"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet"
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch"
import "leaflet-geosearch/dist/geosearch.css"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix du bug connu Leaflet + webpack : les icônes de marqueur ne se chargent
// pas correctement car webpack renomme les fichiers d'assets.
// On pointe directement vers le CDN pour contourner le problème.
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
})

interface Position {
    lat: number
    lng: number
}

interface MapPickerLeafletProps {
    onSelect: (data: { adresse: string; latitude: number; longitude: number }) => void
}

/** Gère les clics sur la carte et met à jour la position du marqueur. */
function ClickHandler({ onPositionChange }: { onPositionChange: (pos: Position) => void }) {
    useMapEvents({
        click(e) {
            onPositionChange({ lat: e.latlng.lat, lng: e.latlng.lng })
        },
    })
    return null
}

function SearchControl(){
    const map = useMap();
    useEffect(() => {
        const provider = new OpenStreetMapProvider();
        const control = GeoSearchControl({provider, style: "bar"})
        map.addControl(control)
        return () => {map.removeControl(control)}
    }, [map])
    return null
}

/** Appelle l'API Nominatim pour convertir des coordonnées GPS en adresse lisible. */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`,
            { headers: { "User-Agent": "Move Ci/1.0 (contact@vroomci.com)" } }
        )
        const data = await res.json()
        // On préfère le display_name complet, sinon les composants disponibles
        return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    } catch {
        return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    }
}

// Abidjan — position de départ par défaut
const ABIDJAN: Position = { lat: 5.3484, lng: -4.0082 }

export default function MapPickerLeaflet({ onSelect }: MapPickerLeafletProps) {
    const [position, setPosition] = useState<Position | null>(null)
    const [adresse, setAdresse]   = useState<string>("")
    const [loading, setLoading]   = useState(false)

    // Quand l'utilisateur clique, on géocode en sens inverse et on notifie le parent
    useEffect(() => {
        if (!position) return

        const fetchAdresse = async () => {
            setLoading(true)
            const result = await reverseGeocode(position.lat, position.lng)
            setAdresse(result)
            onSelect({ adresse: result, latitude: position.lat, longitude: position.lng })
            setLoading(false)
        }

        fetchAdresse()
    }, [position])

    return (
        <div className="flex flex-col gap-3">
            {/* Indication visuelle de l'adresse sélectionnée */}
            <div className="min-h-9 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-sm text-zinc-700">
                {loading && <span className="text-zinc-400 italic">Recherche de l'adresse…</span>}
                {!loading && adresse && <span>{adresse}</span>}
                {!loading && !adresse && <span className="text-zinc-400 italic">Cliquez sur la carte pour sélectionner votre position</span>}
            </div>

            {/* Carte Leaflet */}
            <MapContainer
                center={ABIDJAN}
                zoom={13}
                style={{ height: "380px", width: "100%", borderRadius: "12px" }}
            >
                <SearchControl />
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <ClickHandler onPositionChange={setPosition} />
                {position && <Marker position={[position.lat, position.lng]} />}
            </MapContainer>
        </div>
    )
}
