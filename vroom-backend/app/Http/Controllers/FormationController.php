<?php

namespace App\Http\Controllers;

use App\Events\DataRefresh;
use App\Http\Requests\StoreFormationRequest;
use App\Http\Requests\UpdateFormationRequest;
use App\Models\Formation;
use App\Models\InscriptionFormation;
use App\Models\Notifications;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FormationController extends Controller
{
    /**
     * Catalogue public des formations validées.
     * GET /formations
     */
    public function index(): JsonResponse
    {
        // note_moyenne n'est plus une colonne : withAvg la calcule depuis les avis
        // et l'alias conserve le nom attendu par le front.
        $formations = Formation::with([
            'autoEcole' => fn ($q) => $q->select('id', 'fullname', 'avatar')
                ->withAvg('avisVendeur as note_moyenne', 'note'),
        ])
            ->where('statut_validation', Formation::STATUT_VALIDE)
            ->where('statut', Formation::STATUT_DISPONIBLE)
            ->withCount('inscriptions')
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $formations]);
    }

    /**
     * Détail d'une formation (public).
     * GET /formations/{id}
     */
    public function show(string $id): JsonResponse
    {
        $formation = Formation::with([
            'autoEcole' => fn ($q) => $q->select('id', 'fullname', 'avatar')
                ->withAvg('avisVendeur as note_moyenne', 'note'),
        ])
            ->where('statut_validation', Formation::STATUT_VALIDE)
            ->where('statut', Formation::STATUT_DISPONIBLE)
            ->withCount('inscriptions')
            ->findOrFail($id);

        return response()->json(['success' => true, 'data' => $formation]);
    }

    /**
     * Formations de l'auto-école connectée.
     * GET /formations/mes-formations
     */
    public function mesFormations(): JsonResponse
    {
        $user = Auth::user();

        $formations = Formation::where('auto_ecole_id', $user->id)
            ->withCount('inscriptions')
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $formations]);
    }

    /**
     * Liste tous les inscrits de toutes les formations de cette auto-ecole.
     * GET /formations/mes-inscrits
     */
    public function mesInscrits(): JsonResponse
    {
        $userId = Auth::id();

        $inscrits = InscriptionFormation::whereHas('formation', function ($q) use ($userId) {
                $q->where('auto_ecole_id', $userId);
            })
            ->with([
                'client:id,fullname,email,avatar,telephone,adresse',
                'formation:id,type_permis,auto_ecole_id,titre,prix',
            ])
            ->withSum('versements as montant_paye', 'montant')
            ->orderByDesc('date_inscription')
            ->get();

        return response()->json(['success' => true, 'data' => $inscrits]);
    }
    
    /**
     * Liste des inscrits d'une formation (auto-école uniquement).
     * GET /formations/{id}/inscrits
     */
    public function inscrits(string $id): JsonResponse
    {
        $user = Auth::user();

        $formation = Formation::where('id', $id)
            ->where('auto_ecole_id', $user->id)
            ->firstOrFail();

        $inscrits = InscriptionFormation::with('client:id,fullname,email,avatar,telephone,adresse')
            ->where('formation_id', $formation->id)
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $inscrits]);
    }

    public function store(StoreFormationRequest $request): JsonResponse
    {
        $user      = Auth::user();
        $validated = $request->validated();

        try {
            $formation = Formation::create([
                'auto_ecole_id'      => $user->id,
                'titre'              => $validated['titre'],
                'description'        => $validated['texte'],
                'type_permis'        => $validated['type_permis'],
                'prix'               => $validated['prix'],
                'duree_heures'       => $validated['duree_heures'],
                'lieu'               => $validated['lieu'] ?? ($user['adresse'] ?? null),
                'nombre_places'      => $validated['nombre_places'] ?? null,
                'deroulement'        => $validated['deroulement'] ?? null,
                'statut_validation'  => Formation::STATUT_EN_ATTENTE,
            ]);

            Notifications::notifyAdmins(
                Notifications::TYPE_FORMATION,
                'Nouvelle formation à valider',
                $user->fullname . ' a soumis une formation permis ' . $validated['type_permis'],
                ['formation_id' => $formation->id]
            );

            return response()->json([
                'success' => true,
                'message' => 'Formation soumise — en attente de validation admin',
                'data'    => $formation,
            ], 201);
        } catch (\Exception $e) {
            return $this->serverError($e, 'Erreur lors du traitement de la formation. Réessayez dans quelques instants.');
        }
    }

    /**
     * Modifie une formation.
     * PUT /formations/{id}
     */
    public function update(UpdateFormationRequest $request, string $id): JsonResponse
    {
        $user = Auth::user();

        $formation = Formation::where('id', $id)
            ->where('auto_ecole_id', $user->id)
            ->firstOrFail();

        $validated = $request->validated();

        try {
            // Le front envoie toujours 'texte' : on le remappe vers la colonne
            // 'description' sans casser le contrat d'API existant.
            if (array_key_exists('texte', $validated)) {
                $validated['description'] = $validated['texte'];
            }

            $formation->update(array_intersect_key(
                $validated,
                array_flip(['titre', 'description', 'type_permis', 'prix', 'duree_heures', 'lieu', 'nombre_places', 'deroulement'])
            ));

            return response()->json(['success' => true, 'data' => $formation]);
        } catch (\Exception $e) {
            return $this->serverError($e, 'Erreur lors du traitement de la formation. Réessayez dans quelques instants.');
        }
    }

    /**
     * Supprime une formation.
     * DELETE /formations/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        $user = Auth::user();

        Formation::where('id', $id)
            ->where('auto_ecole_id', $user->id)
            ->firstOrFail()
            ->delete();

        return response()->json(['success' => true, 'message' => 'Formation supprimée']);
    }

    /**
     * Auto-école met à jour le statut d'un élève inscrit.
     * PUT /formations/{formationId}/inscrits/{inscriptionId}
     *
     * Body: { statut_eleve, date_examen?, reussite? }
     */
    public function updateInscrit(Request $request, string $formationId, string $inscriptionId): JsonResponse
    {
        $user = Auth::user();

        // Vérifie que la formation appartient à cette auto-école
        Formation::where('id', $formationId)
            ->where('auto_ecole_id', $user->id)
            ->firstOrFail();

        $inscription = InscriptionFormation::where('id', $inscriptionId)
            ->where('formation_id', $formationId)
            ->firstOrFail();

        $validated = $request->validate([
            'statut_eleve' => ['required', Rule::in([
                InscriptionFormation::STATUT_PAIEMENT_EN_COURS,
                InscriptionFormation::STATUT_INSCRIT,
                InscriptionFormation::STATUT_EN_COURS,
                InscriptionFormation::STATUT_EXAMEN_PASSE,
                InscriptionFormation::STATUT_TERMINE,
                InscriptionFormation::STATUT_ABANDONNE,
            ])],
            'date_examen' => 'nullable|date',
            'reussite'    => 'nullable|boolean',
        ]);

        $inscription->update($validated);

        // Notifie le client de l'avancement
        $messages = [
            InscriptionFormation::STATUT_PAIEMENT_EN_COURS => 'Votre dossier est en cours de traitement. Votre préinscription ne peut plus être annulée.',
            InscriptionFormation::STATUT_INSCRIT           => 'Votre paiement a été enregistré. Vous êtes officiellement inscrit(e) !',
            InscriptionFormation::STATUT_EN_COURS          => 'Votre formation a démarré. Bonne chance !',
            InscriptionFormation::STATUT_EXAMEN_PASSE      => 'Votre examen est enregistré.' . (($validated['date_examen'] ?? null) ? ' Date : ' . $validated['date_examen'] : ''),
            InscriptionFormation::STATUT_TERMINE           => ($validated['reussite'] ?? false)
                ? 'Félicitations ! Vous avez réussi votre formation.'
                : 'Votre formation est terminée.',
        ];

        if (isset($messages[$validated['statut_eleve']])) {
            Notifications::create([
                'user_id'    => $inscription->client_id,
                'type'       => Notifications::TYPE_FORMATION,
                'level'      => 'info',
                'title'      => 'Mise à jour de votre formation',
                'message'    => $messages[$validated['statut_eleve']],
                'data'       => ['inscription_id' => $inscription->id, 'formation_id' => $formationId],
                'date_envoi' => now(),
            ]);
        }

        // Temps réel — le client voit la mise à jour de son statut sans F5
        event(new DataRefresh($inscription->client_id, 'formation'));

        return response()->json(['success' => true, 'data' => $inscription->load('client:id,fullname,avatar')]);
    }

    /**
     * Stats d'une formation spécifique (auto-école uniquement).
     * GET /formations/{id}/stats
     *
     * Retourne nb total inscrits, répartition par statut, taux de réussite calculé en live.
     */
    public function stats(string $id): JsonResponse
    {
        $user = Auth::user();

        Formation::where('id', $id)
            ->where('auto_ecole_id', $user->id)
            ->firstOrFail();

        $stats = InscriptionFormation::where('formation_id', $id)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN statut_eleve = 'en_cours'     THEN 1 ELSE 0 END) as en_cours,
                SUM(CASE WHEN statut_eleve = 'examen_passe' THEN 1 ELSE 0 END) as examens_passes,
                SUM(CASE WHEN statut_eleve = 'terminé'      THEN 1 ELSE 0 END) as termines,
                SUM(CASE WHEN statut_eleve = 'terminé' AND reussite = true  THEN 1 ELSE 0 END) as reussis,
                SUM(CASE WHEN statut_eleve = 'terminé' AND reussite = false THEN 1 ELSE 0 END) as echoues,
                SUM(CASE WHEN statut_eleve = 'abandonné'    THEN 1 ELSE 0 END) as abandonnes
            ")
            ->first();

        // Taux calculé sur les terminés (pas sur le total — les en_cours ne comptent pas encore)
        $tauxReussite = $stats->termines > 0
            ? round(($stats->reussis / $stats->termines) * 100, 1)
            : null;

        return response()->json([
            'success' => true,
            'data'    => [
                'total'          => (int) $stats->total,
                'en_cours'       => (int) $stats->en_cours,
                'examens_passes' => (int) $stats->examens_passes,
                'termines'       => (int) $stats->termines,
                'reussis'        => (int) $stats->reussis,
                'echoues'        => (int) $stats->echoues,
                'abandonnes'     => (int) $stats->abandonnes,
                'taux_reussite'  => $tauxReussite,
            ],
        ]);
    }

    /**
     * Stats globales de l'auto-école connectée (toutes formations confondues).
     * GET /formations/mes-stats
     */
    public function mesStats(): JsonResponse
    {
        $userId = Auth::id();

        $formationIds = Formation::where('auto_ecole_id', $userId)->pluck('id');

        $stats = InscriptionFormation::whereIn('formation_id', $formationIds)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN statut_eleve = 'en_cours'     THEN 1 ELSE 0 END) as en_cours,
                SUM(CASE WHEN statut_eleve = 'terminé'      THEN 1 ELSE 0 END) as termines,
                SUM(CASE WHEN statut_eleve = 'terminé' AND reussite = true THEN 1 ELSE 0 END) as reussis,
                SUM(CASE WHEN statut_eleve = 'abandonné'    THEN 1 ELSE 0 END) as abandonnes
            ")
            ->first();

        $tauxReussite = $stats->termines > 0
            ? round(($stats->reussis / $stats->termines) * 100, 1)
            : null;

        // Inscriptions par mois (année en cours) — une seule requête groupée, pas 12.
        $parMois = InscriptionFormation::whereIn('formation_id', $formationIds)
            ->whereYear('date_inscription', Carbon::now()->year)
            ->selectRaw('MONTH(date_inscription) as mois, COUNT(*) as total')
            ->groupBy('mois')
            ->pluck('total', 'mois');

        $statsMensuel = [];
        for ($mois = 1; $mois <= 12; $mois++) {
            $statsMensuel[] = [
                'mois'         => $mois,
                'nom_mois'     => Carbon::create()->month($mois)->locale('fr')->translatedFormat('F'),
                'inscriptions' => (int) ($parMois[$mois] ?? 0),
            ];
        }

        // Inscriptions par jour (semaine en cours) — une seule requête groupée, pas 7.
        $debutSemaine = Carbon::now()->startOfWeek();
        $finSemaine   = Carbon::now()->endOfWeek();

        $parJour = InscriptionFormation::whereIn('formation_id', $formationIds)
            ->whereBetween('date_inscription', [$debutSemaine, $finSemaine])
            ->selectRaw('DATE(date_inscription) as jour, COUNT(*) as total')
            ->groupBy('jour')
            ->pluck('total', 'jour');

        $statsSemaine = [];
        for ($i = 0; $i < 7; $i++) {
            $jour = $debutSemaine->copy()->addDays($i);
            $cle  = $jour->format('Y-m-d');
            $statsSemaine[] = [
                'jour'         => $cle,
                'nom_jour'     => $jour->locale('fr')->translatedFormat('D'),
                'inscriptions' => (int) ($parJour[$cle] ?? 0),
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'nb_formations'  => count($formationIds),
                'total_inscrits' => (int) $stats->total,
                'en_cours'       => (int) $stats->en_cours,
                'termines'       => (int) $stats->termines,
                'reussis'        => (int) $stats->reussis,
                'abandonnes'     => (int) $stats->abandonnes,
                'taux_reussite'  => $tauxReussite,
                'stats_mensuel'  => $statsMensuel,
                'stats_semaine'  => $statsSemaine,
            ],
        ]);
    }

}
