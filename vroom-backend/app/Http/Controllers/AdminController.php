<?php

namespace App\Http\Controllers;

use App\Events\DataRefresh;
use App\Models\Formation;
use App\Models\InscriptionFormation;
use App\Models\LogModeration;
use App\Models\Notifications;
use App\Models\Signalement;
use App\Models\TransactionConclue;
use App\Models\User;
use App\Models\Vehicules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    /**
     * Liste tous les comptes administrateurs.
     */
    public function admins(): JsonResponse
    {
        $admins = User::admins()
            ->select('id', 'fullname', 'email', 'telephone', 'adresse', 'niveau_acces', 'statut', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $admins], 200);
    }

    /**
     * Crée un nouveau compte administrateur.
     * Seul un admin connecté peut créer d'autres admins (route protégée par role:admin).
     */
    public function createAdmin(Request $request): JsonResponse
    {
        $request->validate([
            'fullname'      => 'required|string|max:255',
            'email'         => 'required|email|unique:users,email',
            'password'      => 'required|string|min:8',
            'telephone'     => 'sometimes|nullable|string|max:20',
            'adresse'       => 'sometimes|nullable|string|max:500',
            'niveau_acces'  => 'sometimes|nullable|string|max:50',
        ]);

        $admin = User::create([
            'fullname'     => $request->fullname,
            'email'        => $request->email,
            'password'     => Hash::make($request->password),
            'role'         => User::ADMIN,
            'statut'       => User::ACTIF,
            'telephone'    => $request->telephone,
            'adresse'      => $request->adresse,
            'niveau_acces' => $request->niveau_acces,
        ]);

        $this->logAction('CREATE_ADMIN', 'utilisateur', $admin->id, "Création admin : {$admin->email}");

        return response()->json(['success' => true, 'data' => $admin, 'message' => 'Administrateur créé'], 201);
    }

    // ── Utilisateurs ──────────────────────────────────────

    public function users(Request $request): JsonResponse
    {
        $filtres = $request->validate([
            'role'   => 'sometimes|string|in:client,vendeur,concessionnaire,auto_ecole,admin',
            'statut' => 'sometimes|string|in:actif,suspendu,banni,en_attente',
        ]);

        $query = User::query();

        if (isset($filtres['role']))   $query->where('role', $filtres['role']);
        if (isset($filtres['statut'])) $query->where('statut', $filtres['statut']);

        $users = $query
            ->select(
                'id',
                'fullname',
                'email',
                'telephone',
                'role',
                'statut',
                'created_at',
                'raison_sociale',
                'rccm',
                'numero_agrement'
            )
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $users], 200);
    }

    public function suspendre(Request $request, $id): JsonResponse
    {
        return $this->changerStatut($id, User::SUSPENDU, 'SUSPEND_USER', 'utilisateur', $this->detailsValides($request));
    }

    public function bannir(Request $request, $id): JsonResponse
    {
        return $this->changerStatut($id, User::BANNI, 'BAN_USER', 'utilisateur', $this->detailsValides($request));
    }

    public function restaurer(Request $request, $id): JsonResponse
    {
        return $this->changerStatut($id, User::ACTIF, 'RESTORE_USER', 'utilisateur', $this->detailsValides($request));
    }

    // Valider un compte concessionnaire / auto_ecole en attente
    public function validerCompte(Request $request, $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->statut !== User::EN_ATTENTE) {
            return response()->json(['success' => false, 'message' => 'Ce compte n\'est pas en attente de validation'], 422);
        }

        $user->restaurer(); // → statut = actif

        $this->logAction('VALIDATE_ACCOUNT', 'utilisateur', $id, $this->detailsValides($request));

        return response()->json(['success' => true, 'message' => 'Compte validé'], 200);
    }

    // Véhicules

    public function vehiculesEnAttente(): JsonResponse
    {
        $vehicules = Vehicules::with(['creator:id,fullname,role', 'description'])
            ->enAttente()
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json(['success' => true, 'data' => $vehicules], 200);
    }

    /**
     * Liste tous les véhicules, tous statuts confondus.
     * Utilisé par le panel admin pour la vue de modération complète.
     */
    public function vehicules(): JsonResponse
    {
        $vehicules = Vehicules::with(['creator:id,fullname,role', 'description', 'photos'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $vehicules], 200);
    }

    public function validerVehicule(Request $request, $id): JsonResponse
    {
        $vehicule = Vehicules::findOrFail($id);
        $vehicule->update(['status_validation' => Vehicules::STATUS_VALIDATED]);

        $this->logAction('VALIDATE_VEHICLE', 'vehicule', $id, $this->detailsValides($request));

        // Temps réel — le vendeur voit la validation sans F5
        event(new DataRefresh($vehicule->created_by, 'vehicule'));

        return response()->json(['success' => true, 'message' => 'Véhicule validé'], 200);
    }

    public function rejeterVehicule(Request $request, $id): JsonResponse
    {
        $request->validate(['details' => 'required|string|max:500']);

        $vehicule = Vehicules::findOrFail($id);
        $vehicule->update([
            'status_validation'      => Vehicules::STATUS_REJETEE,
            'description_validation' => $request->details,
        ]);

        $this->logAction('REJECT_VEHICLE', 'vehicule', $id, $request->details);

        // Temps réel — le vendeur voit le rejet sans F5
        event(new DataRefresh($vehicule->created_by, 'vehicule'));

        return response()->json(['success' => true, 'message' => 'Véhicule rejeté'], 200);
    }

    public function suspendreVehicule($id): JsonResponse
    {
        $vehicule = Vehicules::findOrFail($id);
        $vehicule->update(['statut' => 'suspendu']);
        $this->logAction('SUSPEND_VEHICLE', 'vehicule', $id, null);
        event(new DataRefresh($vehicule->created_by, 'vehicule'));
        return response()->json(['success' => true, 'message' => 'Véhicule suspendu.']);
    }

    public function supprimerVehicule($id): JsonResponse
    {
        $vehicule = Vehicules::findOrFail($id);
        $createdBy = $vehicule->created_by;
        $vehicule->delete();
        $this->logAction('DELETE_VEHICLE', 'vehicule', $id, null);
        event(new DataRefresh($createdBy, 'vehicule'));
        return response()->json(['success' => true, 'message' => 'Véhicule supprimé.']);
    }

    /**
     * Liste toutes les formations avec filtres optionnels.
     * Parametre statut_validation : en_attente | validé | rejeté
     */
    public function formations(Request $request): JsonResponse
    {
        $query = Formation::with(['autoEcole:id,fullname,avatar', 'description'])
            ->withCount('inscriptions')
            ->orderBy('created_at', 'desc');

        $filtres = $request->validate([
            'statut_validation' => 'sometimes|string|in:en_attente,validé,rejeté',
        ]);

        if (isset($filtres['statut_validation'])) {
            $query->where('statut_validation', $filtres['statut_validation']);
        }

        $formations = $query->paginate(20);

        return response()->json(['success' => true, 'data' => $formations], 200);
    }

    /**
     * Valide une formation soumise par une auto-ecole.
     * La formation devient visible dans le catalogue public.
     */
    public function validerFormation(Request $request, $id): JsonResponse
    {
        $formation = Formation::findOrFail($id);
        $formation->update(['statut_validation' => 'validé']);

        $this->logAction('VALIDATE_FORMATION', 'formation', $id, $this->detailsValides($request));

        // Temps réel — l'auto-école voit la validation sans F5
        event(new DataRefresh($formation->auto_ecole_id, 'formation'));

        return response()->json(['success' => true, 'message' => 'Formation validée'], 200);
    }

    /**
     * Rejette une formation avec un motif obligatoire.
     * Le motif est sauvegarde dans les details du log.
     */
    public function rejeterFormation(Request $request, $id): JsonResponse
    {
        $request->validate(['motif' => 'required|string|max:500']);

        $formation = Formation::findOrFail($id);
        $formation->update(['statut_validation' => 'rejeté']);

        $this->logAction('REJECT_FORMATION', 'formation', $id, $request->motif);

        // Temps réel — l'auto-école voit le rejet sans F5
        event(new DataRefresh($formation->auto_ecole_id, 'formation'));

        return response()->json(['success' => true, 'message' => 'Formation rejetée'], 200);
    }

    // ── Signalements ───────────────────────────────────────

    public function signalements(Request $request): JsonResponse
    {
        $filtres = $request->validate([
            'statut' => 'sometimes|string|in:en_attente,traité,rejeté',
        ]);

        $query = Signalement::with(['client:id,fullname', 'cibleUser:id,fullname', 'cibleVehicule.description', 'cibleVehicule.creator:id,fullname', 'cibleVehicule.photos']);

        if (isset($filtres['statut'])) $query->where('statut', $filtres['statut']);

        $signalements = $query->orderBy('date_signalement', 'asc')->paginate(20);

        return response()->json(['success' => true, 'data' => $signalements], 200);
    }

    public function traiterSignalement(Request $request, $id): JsonResponse
    {
        // --- Étape 1 : Validation des paramètres ---
        $request->validate([
            'action'       => 'required|in:traiter,rejeter',
            'action_cible' => 'nullable|string|in:avertissement,suspendre,bannir,aucune',
            'note_admin'   => 'nullable|string|max:500',
        ]);

        // --- Étape 2 : Chargement du signalement avec ses relations ---
        $signalement = Signalement::with(['cibleUser', 'cibleVehicule.description'])->findOrFail($id);

        $action      = $request->input('action');
        $actionCible = $request->input('action_cible');
        $noteAdmin   = $request->input('note_admin');

        if ($action === 'traiter') {
            // --- Étape 3a : Marquer le signalement comme traité ---
            $signalement->traiter();

            // --- Étape 3b : Appliquer l'action sur la cible (user ou véhicule) ---
            if ($actionCible && $actionCible !== 'aucune') {

                if ($signalement->cibleUser) {
                    // "avertissement" : notif seulement, pas de changement de statut
                    match ($actionCible) {
                        'avertissement' => null,
                        'suspendre'     => $signalement->cibleUser->suspendre(),
                        'bannir'        => $signalement->cibleUser->bannir(),
                        default         => null,
                    };
                }

                if ($signalement->cibleVehicule) {
                    match ($actionCible) {
                        'suspendre' => $signalement->cibleVehicule->update(['statut' => 'suspendu']),
                        'bannir'    => $signalement->cibleVehicule->update(['statut' => 'banni']),
                        default     => null,
                    };
                }
            }

            // --- Étape 3c : Notification pour la cible ---
            // Destinataire : le user cible ou le créateur du véhicule signalé
            $cibleUserId = $signalement->cible_user_id
                ?? $signalement->cibleVehicule?->created_by;

            if ($cibleUserId) {
                $isCibleVehicule = (bool) $signalement->cible_vehicule_id;

                [$titre, $messageAction] = match ($actionCible) {
                    'avertissement' => [
                        'Avertissement de notre équipe',
                        $isCibleVehicule
                            ? 'Votre annonce a fait l\'objet d\'un signalement. Ceci est un avertissement.'
                            : 'Votre compte a fait l\'objet d\'un signalement. Ceci est un avertissement.',
                    ],
                    'suspendre' => [
                        $isCibleVehicule ? 'Annonce suspendue' : 'Compte suspendu',
                        $isCibleVehicule
                            ? 'Votre annonce a été suspendue suite à un signalement.'
                            : 'Votre compte a été suspendu suite à un signalement.',
                    ],
                    'bannir' => [
                        $isCibleVehicule ? 'Annonce bannie' : 'Compte banni',
                        $isCibleVehicule
                            ? 'Votre annonce a été bannie définitivement suite à un signalement.'
                            : 'Votre compte a été banni définitivement suite à un signalement.',
                    ],
                    default => [
                        'Action de modération',
                        $isCibleVehicule
                            ? 'Une action de modération a été appliquée sur votre annonce.'
                            : 'Une action de modération a été appliquée sur votre compte.',
                    ],
                };

                $lignes = [$messageAction];
                if ($noteAdmin) {
                    $lignes[] = "Note de l'administrateur : {$noteAdmin}";
                }

                Notifications::create([
                    'user_id'    => $cibleUserId,
                    'type'       => Notifications::TYPE_MODERATION,
                    'level'      => 'info',
                    'title'      => $titre,
                    'message'    => implode(' ', $lignes),
                    'data'       => ['signalement_id' => $signalement->id, 'action_cible' => $actionCible],
                    'lu'         => false,
                    'date_envoi' => now(),
                ]);
            }

            // --- Étape 3d : Notification pour le reporter ---
            Notifications::create([
                'user_id'    => $signalement->client_id,
                'type'       => Notifications::TYPE_MODERATION,
                'level'      => 'info',
                'title'      => 'Votre signalement a été traité',
                'message'    => 'Nous avons examiné votre signalement et pris les mesures appropriées.',
                'data'       => ['signalement_id' => $signalement->id],
                'lu'         => false,
                'date_envoi' => now(),
            ]);
        } else {
            // --- Étape 4 : Rejet du signalement — notification reporter uniquement ---
            $signalement->rejeter();

            $messageRejet = "Après examen, votre signalement n'a pas donné lieu à une action de notre part.";
            if ($noteAdmin) {
                $messageRejet .= " Précision de l'administrateur : {$noteAdmin}";
            }

            Notifications::create([
                'user_id'    => $signalement->client_id,
                'type'       => Notifications::TYPE_MODERATION,
                'level'      => 'info',
                'title'      => 'Votre signalement a été examiné',
                'message'    => $messageRejet,
                'data'       => ['signalement_id' => $signalement->id],
                'lu'         => false,
                'date_envoi' => now(),
            ]);
        }

        // --- Étape 5 : Associer l'admin au signalement ---
        $signalement->update([
            'admin_id' => Auth::id(),
            'action_cible' => $actionCible,
            'note_admin'   => $noteAdmin ?: null,
        ]);

        // --- Étape 6 : Log avec détails complets ---
        $logDetails = "Action: {$action}";
        if ($actionCible) $logDetails .= ", Action cible: {$actionCible}";
        if ($noteAdmin)   $logDetails .= ", Note: {$noteAdmin}";

        $this->logAction('HANDLE_SIGNALEMENT', 'signalement', $id, $logDetails);

        return response()->json([
            'success' => true,
            'message' => $action === 'traiter' ? 'Signalement traité avec succès' : 'Signalement rejeté',
        ], 200);
    }

    /**
     * Liste toutes les transactions conclues — vue admin globale.
     * Filtres optionnels : statut, type, vendeur_id
     */
    public function transactions(Request $request): JsonResponse
    {
        $query = TransactionConclue::with([
            'vendeur:id,fullname,email,role',
            'client:id,fullname,email',
            'vehicule.description',
        ]);

        $filtres = $request->validate([
            'statut' => 'sometimes|string|in:en_attente,confirmé,expiré,refusé',
            'type'   => 'sometimes|string|in:vente,location',
        ]);

        if (isset($filtres['statut'])) $query->where('statut', $filtres['statut']);
        if (isset($filtres['type']))   $query->where('type', $filtres['type']);

        $transactions = $query->orderBy('created_at', 'desc')->paginate(30);

        return response()->json(['success' => true, 'data' => $transactions], 200);
    }

    /**
     * Statistiques globales de la plateforme pour le dashboard admin.
     * Agrège les données utilisateurs, véhicules, transactions et signalements.
     */
    public function stats(): JsonResponse
    {
        $rolesUtilisateurs = [User::CLIENT, User::VENDEUR, User::CONCESSIONNAIRE, User::AUTO_ECOLE];

        // --- Utilisateurs ---
        $usersByRole = User::whereIn('role', $rolesUtilisateurs)
            ->selectRaw('role, count(*) as total')
            ->groupBy('role')
            ->pluck('total', 'role');

        $usersByStatut = User::whereIn('role', $rolesUtilisateurs)
            ->selectRaw('statut, count(*) as total')
            ->groupBy('statut')
            ->pluck('total', 'statut');

        // Inscriptions par mois sur les 6 derniers mois
        $inscriptionsParMois = User::whereIn('role', $rolesUtilisateurs)
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as mois, count(*) as total")
            ->groupBy('mois')
            ->orderBy('mois')
            ->get();

        // --- Véhicules ---
        $vehiculesValidation = Vehicules::selectRaw('status_validation, count(*) as total')
            ->groupBy('status_validation')
            ->pluck('total', 'status_validation');

        $vehiculesStatut = Vehicules::selectRaw('statut, count(*) as total')
            ->groupBy('statut')
            ->pluck('total', 'statut');

        // --- Transactions ---
        $transactionsRaw = TransactionConclue::selectRaw('type, statut, count(*) as total')
            ->groupBy('type', 'statut')
            ->get();

        $caVentes = TransactionConclue::where('type', 'vente')
            ->where('statut', TransactionConclue::STATUT_CONFIRME)
            ->sum('prix_final');

        // --- Signalements ---
        $signalementsStatut = Signalement::selectRaw('statut, count(*) as total')
            ->groupBy('statut')
            ->pluck('total', 'statut');

        // --- Auto-écoles & formations ---
        $partenairesParType = User::whereIn('role', [User::CONCESSIONNAIRE, User::AUTO_ECOLE])
            ->selectRaw('role, count(*) as total')
            ->groupBy('role')
            ->pluck('total', 'role');

        $formationsValidation = Formation::selectRaw('statut_validation, count(*) as total')
            ->groupBy('statut_validation')
            ->pluck('total', 'statut_validation');

        $formationsParPermis = Formation::selectRaw('type_permis, count(*) as total')
            ->groupBy('type_permis')
            ->orderByDesc('total')
            ->get();

        $inscriptionsParStatut = InscriptionFormation::selectRaw('statut_eleve, count(*) as total')
            ->groupBy('statut_eleve')
            ->pluck('total', 'statut_eleve');

        // Taux de réussite : parmi les élèves ayant passé l'examen, combien ont réussi
        $totalExamens = InscriptionFormation::whereIn('statut_eleve', ['examen_passe', 'terminé'])->count();
        $totalReussis = InscriptionFormation::where('reussite', true)->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'users_par_role'          => $usersByRole,
                'users_par_statut'        => $usersByStatut,
                'inscriptions_par_mois'   => $inscriptionsParMois,
                'vehicules_validation'    => $vehiculesValidation,
                'vehicules_statut'        => $vehiculesStatut,
                'transactions'            => $transactionsRaw,
                'ca_ventes'               => (int) $caVentes,
                'signalements_statut'     => $signalementsStatut,
                'partenaires_par_type'    => $partenairesParType,
                'formations_validation'   => $formationsValidation,
                'formations_par_permis'   => $formationsParPermis,
                'inscriptions_par_statut' => $inscriptionsParStatut,
                'examens_total'           => $totalExamens,
                'examens_reussis'         => $totalReussis,
            ],
        ]);
    }

    /**
     * Données comportementales acheteurs : marques/modèles favoris, carburant, prix, conversion RDV.
     * GET /admin/stats/marche
     */
    public function statsMarche(): JsonResponse
    {
        // -- Top marques favoris (+ vues associées)
        $topMarquesFavoris = DB::table('favoris')
            ->join('vehicules', 'favoris.vehicule_id', '=', 'vehicules.id')
            ->join('vehicules_description', 'vehicules.id', '=', 'vehicules_description.vehicule_id')
            ->whereNull('favoris.deleted_at')
            ->select('vehicules_description.marque', DB::raw('count(favoris.id) as favoris'))
            ->groupBy('vehicules_description.marque')
            ->orderByDesc('favoris')
            ->limit(8)
            ->get();

        $vuesParMarque = DB::table('vehicule_vues')
            ->join('vehicules_description', 'vehicule_vues.vehicule_id', '=', 'vehicules_description.vehicule_id')
            ->select('vehicules_description.marque', DB::raw('count(*) as vues'))
            ->groupBy('vehicules_description.marque')
            ->pluck('vues', 'marque');

        $topMarquesFavoris = $topMarquesFavoris->map(fn($row) => [
            'marque'  => $row->marque,
            'favoris' => $row->favoris,
            'vues'    => $vuesParMarque[$row->marque] ?? 0,
        ]);

        // -- Top modèles favoris
        $topModelesFavoris = DB::table('favoris')
            ->join('vehicules', 'favoris.vehicule_id', '=', 'vehicules.id')
            ->join('vehicules_description', 'vehicules.id', '=', 'vehicules_description.vehicule_id')
            ->whereNull('favoris.deleted_at')
            ->select('vehicules_description.marque', 'vehicules_description.modele', DB::raw('count(favoris.id) as favoris'))
            ->groupBy('vehicules_description.marque', 'vehicules_description.modele')
            ->orderByDesc('favoris')
            ->limit(8)
            ->get();

        // -- Répartition carburant (favoris + vues)
        $favorisByCarbu = DB::table('favoris')
            ->join('vehicules', 'favoris.vehicule_id', '=', 'vehicules.id')
            ->join('vehicules_description', 'vehicules.id', '=', 'vehicules_description.vehicule_id')
            ->whereNull('favoris.deleted_at')
            ->whereNotNull('vehicules_description.carburant')
            ->select('vehicules_description.carburant', DB::raw('count(favoris.id) as favoris'))
            ->groupBy('vehicules_description.carburant')
            ->get()
            ->keyBy('carburant');

        $vuesByCarbu = DB::table('vehicule_vues')
            ->join('vehicules_description', 'vehicule_vues.vehicule_id', '=', 'vehicules_description.vehicule_id')
            ->whereNotNull('vehicules_description.carburant')
            ->select('vehicules_description.carburant', DB::raw('count(*) as vues'))
            ->groupBy('vehicules_description.carburant')
            ->pluck('vues', 'carburant');

        $repartitionCarburant = $favorisByCarbu->map(fn($row) => [
            'carburant' => $row->carburant,
            'favoris'   => $row->favoris,
            'vues'      => $vuesByCarbu[$row->carburant] ?? 0,
        ])->values();

        // -- Tranches de prix (favoris) — CASE WHEN compatible PostgreSQL
        $tranchesPrix = DB::table('favoris')
            ->join('vehicules', 'favoris.vehicule_id', '=', 'vehicules.id')
            ->whereNull('favoris.deleted_at')
            ->selectRaw("
                CASE
                    WHEN vehicules.prix < 5000000               THEN '< 5M'
                    WHEN vehicules.prix BETWEEN 5000000 AND 10000000  THEN '5–10M'
                    WHEN vehicules.prix BETWEEN 10000001 AND 20000000 THEN '10–20M'
                    WHEN vehicules.prix BETWEEN 20000001 AND 35000000 THEN '20–35M'
                    ELSE '> 35M'
                END as tranche,
                count(favoris.id) as favoris
            ")
            ->groupBy('tranche')
            ->get()
            ->sortBy(fn($row) => match ($row->tranche) {
                '< 5M'   => 1,
                '5–10M'  => 2,
                '10–20M' => 3,
                '20–35M' => 4,
                default  => 5,
            })
            ->values();

        // -- Conversion RDV → transaction
        $totalRdv    = DB::table('rendez_vous')->count();
        $rdvTermines = DB::table('rendez_vous')->where('statut', 'terminé')->count();
        $txConfirmees = DB::table('transactions_conclues')->where('statut', 'confirmé')->count();
        $taux = $rdvTermines > 0 ? round(($txConfirmees / $rdvTermines) * 100, 1) : 0;

        // -- Top marques par vues
        $topMarquesVues = DB::table('vehicule_vues')
            ->join('vehicules_description', 'vehicule_vues.vehicule_id', '=', 'vehicules_description.vehicule_id')
            ->select('vehicules_description.marque', DB::raw('count(*) as vues'))
            ->groupBy('vehicules_description.marque')
            ->orderByDesc('vues')
            ->limit(8)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'top_marques_favoris'           => $topMarquesFavoris,
                'top_modeles_favoris'           => $topModelesFavoris,
                'repartition_carburant_demande' => $repartitionCarburant,
                'tranches_prix_demande'         => $tranchesPrix,
                'conversion_rdv_transaction'    => [
                    'total_rdv'               => $totalRdv,
                    'rdv_termines'            => $rdvTermines,
                    'transactions_confirmees' => $txConfirmees,
                    'taux_conversion'         => $taux,
                ],
                'top_marques_vues'              => $topMarquesVues,
            ],
        ]);
    }

    /**
     * Répartition géographique des utilisateurs et véhicules par zone (commune).
     * Extrait la commune depuis le champ adresse (format "Ville, Commune" ou "Commune").
     * GET /admin/stats/geographie
     */
    public function statsGeographie(): JsonResponse
    {
        // Expression SQL pour extraire la zone depuis l'adresse texte
        // Si l'adresse contient une virgule → prend la 2e partie, sinon prend l'adresse entière
        $zoneExpr = "CASE WHEN adresse LIKE '%,%' THEN TRIM(SUBSTRING_INDEX(adresse, ',', -1)) ELSE TRIM(adresse) END";

        // Acheteurs par zone (rôle client)
        $acheteursByZone = DB::table('users')
            ->selectRaw("$zoneExpr as zone, count(*) as total")
            ->where('role', 'client')
            ->whereNotNull('adresse')
            ->where('adresse', '!=', '')
            ->groupByRaw($zoneExpr)
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        // Vendeurs par zone (rôle vendeur ou concessionnaire)
        $vendeursByZone = DB::table('users')
            ->selectRaw("$zoneExpr as zone, count(*) as total")
            ->whereIn('role', ['vendeur', 'concessionnaire'])
            ->whereNotNull('adresse')
            ->where('adresse', '!=', '')
            ->groupByRaw($zoneExpr)
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        // Partenaires par zone (concessionnaire + auto_ecole)
        $partenairesByZone = DB::table('users')
            ->selectRaw("$zoneExpr as zone, count(*) as total")
            ->whereIn('role', ['concessionnaire', 'auto_ecole'])
            ->whereNotNull('adresse')
            ->where('adresse', '!=', '')
            ->groupByRaw($zoneExpr)
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        // Véhicules par zone (via la table users — créateur du véhicule)
        $vehiculesByZone = DB::table('vehicules')
            ->join('users', 'vehicules.created_by', '=', 'users.id')
            ->selectRaw("$zoneExpr as zone, count(vehicules.id) as total")
            ->whereNotNull('users.adresse')
            ->where('users.adresse', '!=', '')
            ->groupByRaw($zoneExpr)
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        // Calcul de la couverture : zones avec vendeurs vs sans vendeurs
        $toutesZonesVendeurs = DB::table('users')
            ->selectRaw("$zoneExpr as zone")
            ->whereIn('role', ['vendeur', 'concessionnaire'])
            ->whereNotNull('adresse')
            ->where('adresse', '!=', '')
            ->groupByRaw($zoneExpr)
            ->pluck('zone');

        $toutesZonesAcheteurs = DB::table('users')
            ->selectRaw("$zoneExpr as zone")
            ->where('role', 'client')
            ->whereNotNull('adresse')
            ->where('adresse', '!=', '')
            ->groupByRaw($zoneExpr)
            ->pluck('zone');

        $zonesVendeursSet  = collect($toutesZonesVendeurs)->filter()->unique()->values();
        $zonesAcheteursSet = collect($toutesZonesAcheteurs)->filter()->unique()->values();

        // Zones avec acheteurs mais sans vendeurs = zones non couvertes
        $zonesSansVendeurs = $zonesAcheteursSet->diff($zonesVendeursSet)->count();
        $zonesAvecVendeurs = $zonesVendeursSet->count();
        $zonesTotal        = $zonesAcheteursSet->union($zonesVendeursSet)->unique()->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'acheteurs_par_zone'   => $acheteursByZone,
                'vendeurs_par_zone'    => $vendeursByZone,
                'partenaires_par_zone' => $partenairesByZone,
                'vehicules_par_zone'   => $vehiculesByZone,
                'couverture' => [
                    'zones_avec_vendeurs' => $zonesAvecVendeurs,
                    'zones_sans_vendeurs' => $zonesSansVendeurs,
                    'zones_total'         => $zonesTotal,
                ],
            ],
        ]);
    }

    public function logs(Request $request): JsonResponse
    {
        $filtres = $request->validate([
            'cible_type' => 'sometimes|string|in:utilisateur,vehicule,formation,signalement',
        ]);

        $query = LogModeration::with(['admin:id,fullname']);

        if (isset($filtres['cible_type'])) $query->where('cible_type', $filtres['cible_type']);
        $logs = $query->orderBy('date_action', 'desc')->paginate(50);

        return response()->json(['success' => true, 'data' => $logs], 200);
    }

    private function changerStatut($id, string $statut, string $action, string $cibleType, ?string $details): JsonResponse
    {
        $user = User::findOrFail($id);

        match ($statut) {
            User::SUSPENDU => $user->suspendre(),
            User::BANNI    => $user->bannir(),
            User::ACTIF    => $user->restaurer(),
        };

        $this->logAction($action, $cibleType, $id, $details);

        // Notifier l'utilisateur du changement de statut de son compte
        [$titre, $message] = match ($statut) {
            User::SUSPENDU => [
                'Compte suspendu',
                'Votre compte a été suspendu par notre équipe.' . ($details ? ' Motif : ' . $details : ''),
            ],
            User::BANNI => [
                'Compte banni',
                'Votre compte a été banni définitivement par notre équipe.' . ($details ? ' Motif : ' . $details : ''),
            ],
            User::ACTIF => [
                'Compte réactivé',
                'Votre compte a été réactivé. Vous pouvez de nouveau accéder à la plateforme.',
            ],
        };

        Notifications::create([
            'user_id'    => $user->id,
            'type'       => Notifications::TYPE_MODERATION,
            'level'      => 'info',
            'title'      => $titre,
            'message'    => $message,
            'data'       => [],
            'lu'         => false,
            'date_envoi' => now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Statut mis à jour : ' . $statut], 200);
    }

    /**
     * Valide et retourne le champ optionnel "details" des actions de modération.
     * Garantit une string ≤ 500 caractères ou null — jamais un tableau ni un texte illimité.
     */
    private function detailsValides(Request $request): ?string
    {
        $validated = $request->validate([
            'details' => 'nullable|string|max:500',
        ]);

        return $validated['details'] ?? null;
    }

    private function logAction(string $action, string $cibleType, string $idCible, ?string $details): void
    {
        LogModeration::create([
            'admin_id'   => Auth::id(),
            'action'     => $action,
            'cible_type' => $cibleType,
            'id_cible'   => $idCible,
            'details'    => $details,
        ]);
    }
    // Liste les véhicules soft-deletés
    public function corbeille(): JsonResponse
    {
        $vehicules = Vehicules::onlyTrashed()
            ->with(['creator:id,fullname,role', 'description', 'photos'])
            ->orderBy('deleted_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $vehicules]);
    }

    // Restaure un véhicule soft-deleté
    public function restaurerVehicule($id): JsonResponse
    {
        $vehicule = Vehicules::onlyTrashed()->findOrFail($id);
        $vehicule->restore();
        $this->logAction('RESTORE_VEHICLE', 'vehicule', $id, null);
        event(new DataRefresh($vehicule->created_by, 'vehicule'));
        return response()->json(['success' => true, 'message' => 'Véhicule restauré.']);
    }

    // Supprime définitivement (forceDelete)
    public function forcerSupprimerVehicule($id): JsonResponse
    {
        $vehicule = Vehicules::onlyTrashed()->findOrFail($id);
        $createdBy = $vehicule->created_by;
        $vehicule->forceDelete();
        $this->logAction('FORCE_DELETE_VEHICLE', 'vehicule', $id, null);
        event(new DataRefresh($createdBy, 'vehicule'));
        return response()->json(['success' => true, 'message' => 'Véhicule supprimé définitivement.']);
    }
}
