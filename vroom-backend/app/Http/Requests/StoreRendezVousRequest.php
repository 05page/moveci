<?php

namespace App\Http\Requests;

use App\Models\RendezVous;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRendezVousRequest extends FormRequest
{
    /**
     * Tout utilisateur authentifié peut tenter de créer un RDV.
     * La vérification du rôle (ex. client uniquement) se fait dans le controller.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'vehicule_id' => 'required|uuid|exists:vehicules,id',
            'date_heure'  => 'required|date|after_or_equal:today',
            'type'        => ['required', Rule::in([
                RendezVous::TYPE_VISITE,
                RendezVous::TYPE_ESSAI_ROUTIER,
                RendezVous::TYPE_PREMIERE_RENCONTRE,
            ])],
            'motif' => 'nullable|string|max:500',
            'lieu'  => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'vehicule_id.required' => 'Le véhicule est obligatoire.',
            'vehicule_id.exists'   => 'Ce véhicule n\'existe pas.',
            'date_heure.required'  => 'La date et l\'heure sont obligatoires.',
            'date_heure.after_or_equal' => 'La date du rendez-vous doit être aujourd\'hui ou dans le futur.',
            'type.required'        => 'Le type de rendez-vous est obligatoire.',
            'type.in'              => 'Le type de rendez-vous est invalide.',
        ];
    }
}
