<?php

namespace App\Jobs;

use App\Models\Notifications;
use App\Models\Vehicules;
use Gemini\Data\Blob;
use Gemini\Enums\MimeType;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ValidateVehiculeWithGemini implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 60;

    /**
     * Laravel sérialise uniquement l'ID du modèle en base.
     * Quand le worker traite le job, il recharge le véhicule depuis la DB.
     */
    public function __construct(public Vehicules $vehicule) {}

    /**
     * Travail exécuté en arrière-plan par le queue worker.
     *
     * Flux :
     *   1. Charger la description + photos du véhicule
     *   2. Construire le prompt texte + blobs images (max 3 photos)
     *   3a. Gemini valide   → on ne fait rien (l'admin valide manuellement)
     *   3b. Gemini invalide → statut = rejetee + notification au propriétaire
     *   3c. Gemini en erreur → on laisse le véhicule en_attente, on loggue
     */
    public function handle(): void
    {
        $this->vehicule->load(['description', 'photos']);
        $desc = $this->vehicule->description;

        if (!$desc) {
            Log::error("ValidateVehiculeWithGemini : description manquante pour véhicule {$this->vehicule->id}");
            return;
        }

        $kilometrage = $desc->kilometrage ?? null;

        $prompt = "Vous êtes un modérateur automobile pour une marketplace ivoirienne. " .
            "Analysez ce véhicule " . ($this->vehicule->type === 'occasion' ? 'd\'occasion' : 'neuf') . " : " .
            "marque {$desc->marque}, modèle {$desc->modele}, année {$desc->annee}, " .
            "carburant " . ($desc->carburant ?? 'non renseigné') . ", " .
            "kilométrage déclaré : " . ($kilometrage ? "{$kilometrage} km" : 'non renseigné') . ", " .
            "historique d'accidents : " . ($desc->historique_accidents ?? 'non renseigné') . ", " .
            "équipements : " . implode(', ', $desc->equipements ?? []) . ". " .

            "Des photos du véhicule sont jointes. Effectuez ces vérifications dans l'ordre : " .

            "1. TABLEAU DE BORD : Cherchez parmi les photos une photo du tableau de bord montrant le compteur kilométrique. " .
            "Si aucune photo de tableau de bord n'est présente, répondez valide=false avec l'explication : " .
            "'Aucune photo du tableau de bord fournie. Veuillez ajouter une photo du tableau de bord montrant clairement le compteur kilométrique.' " .

            "2. KILOMÉTRAGE : Si une photo de tableau de bord est trouvée et que le compteur est lisible, " .
            "comparez le kilométrage visible avec le kilométrage déclaré ({$kilometrage} km). " .
            "Une tolérance de 500 km est acceptable. " .
            "Si la valeur lue diffère de plus de 500 km du kilométrage déclaré, répondez valide=false. " .
            "Si le compteur n'est pas lisible clairement sur la photo, passez à la vérification suivante. " .

            "3. COHÉRENCE GÉNÉRALE : Vérifiez que les photos correspondent bien à la description " .
            "(marque, modèle, état général cohérent avec le kilométrage et l'historique déclaré, " .
            "absence de dommages visibles non déclarés). " .

            "Répondez UNIQUEMENT au format JSON strict sans texte autour : " .
            "{\"valide\": true/false, \"prix_suggere\": nombre, \"explication\": \"texte\"}. " .
            "Le prix doit être en FCFA (XOF) basé sur le marché ivoirien. " .
            "L'explication doit être en français, claire et précise pour le vendeur.";

        // Toutes les photos sont envoyées — Gemini doit chercher le tableau de bord parmi elles
        $parts  = [$prompt];
        $photos = $this->vehicule->photos;

        foreach ($photos as $photo) {
            try {
                $content = Storage::disk('public')->get($photo->path);
                if (!$content) continue;

                $extension = strtolower(pathinfo($photo->path, PATHINFO_EXTENSION));
                $mimeType  = match ($extension) {
                    'png'        => MimeType::IMAGE_PNG,
                    'webp'       => MimeType::IMAGE_WEBP,
                    'heic'       => MimeType::IMAGE_HEIC,
                    'heif'       => MimeType::IMAGE_HEIF,
                    default      => MimeType::IMAGE_JPEG,
                };

                $parts[] = new Blob(mimeType: $mimeType, data: base64_encode($content));
            } catch (\Throwable) {
                // Photo illisible → on l'ignore, Gemini analysera avec les autres
            }
        }

        try {
            $geminiResponse = retry(3, function () use ($parts) {
                return Gemini::generativeModel(model: 'gemini-2.5-flash')
                    ->generateContent($parts);
            }, 2000);

            $responseText = trim($geminiResponse->text());
            $responseText = preg_replace('/```json\n?|\n?```/', '', $responseText);
            $aiResult     = json_decode($responseText, true);

            if (!$aiResult || !isset($aiResult['valide'])) {
                throw new \Exception('Format de réponse invalide de l\'IA');
            }

            if ($aiResult['valide']) {
                Log::info("ValidateVehiculeWithGemini : véhicule {$this->vehicule->id} validé par Gemini.");
                return;
            }

            $this->vehicule->update([
                'status_validation'      => Vehicules::STATUS_REJETEE,
                'description_validation' => $aiResult['explication'] ?? 'Données incohérentes détectées par l\'IA.',
            ]);

            Notifications::create([
                'user_id'    => $this->vehicule->created_by,
                'type'       => Notifications::TYPE_MODERATION,
                'title'      => 'Annonce rejetée automatiquement',
                'message'    => 'Votre annonce ' . $desc->marque . ' ' . $desc->modele .
                    ' a été rejetée : ' . ($aiResult['explication'] ?? 'données incohérentes.'),
                'data'       => ['vehicule_id' => $this->vehicule->id],
                'lu'         => false,
                'date_envoi' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error("ValidateVehiculeWithGemini : erreur Gemini pour véhicule {$this->vehicule->id} : " . $e->getMessage());
        }
    }

    public function failed(\Throwable $e): void
    {
        Log::error("ValidateVehiculeWithGemini : job échoué définitivement pour véhicule {$this->vehicule->id} : " . $e->getMessage());
    }
}
