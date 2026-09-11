<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFormationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type_permis'  => ['sometimes', Rule::in(['A', 'A2', 'B', 'B1', 'C', 'D'])],
            'prix'         => 'sometimes|numeric|min:0',
            'duree_heures' => 'sometimes|integer|min:1',
            'titre'        => 'sometimes|string|max:255',
            'texte'        => 'sometimes|string',
            'lieu'          => 'sometimes|nullable|string|max:255',
            'nombre_places' => 'sometimes|nullable|integer|min:1',
            'deroulement'   => 'sometimes|nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'type_permis.in'       => 'Le type de permis est invalide (A, A2, B, B1, C, D).',
            'prix.numeric'         => 'Le prix doit être un nombre.',
            'prix.min'             => 'Le prix ne peut pas être négatif.',
            'duree_heures.integer' => 'La durée doit être un nombre entier d\'heures.',
            'duree_heures.min'     => 'La durée doit être d\'au moins 1 heure.',
        ];
    }
}
