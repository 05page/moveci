<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFormationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type_permis'  => ['required', Rule::in(['A', 'A2', 'B', 'B1', 'C', 'D'])],
            'prix'         => 'required|numeric|min:0',
            'duree_heures' => 'required|integer|min:1',
            'titre'        => 'required|string|max:255',
            'texte'        => 'required|string',
            'langue'       => 'nullable|string|max:10',
            'lieu'          => 'nullable|string|max:255',
            'nombre_places' => 'nullable|integer|min:1',
            'deroulement'   => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'type_permis.required' => 'Le type de permis est obligatoire.',
            'type_permis.in'       => 'Le type de permis est invalide (A, A2, B, B1, C, D).',
            'prix.required'        => 'Le prix est obligatoire.',
            'prix.numeric'         => 'Le prix doit être un nombre.',
            'prix.min'             => 'Le prix ne peut pas être négatif.',
            'duree_heures.required'=> 'La durée est obligatoire.',
            'duree_heures.integer' => 'La durée doit être un nombre entier d\'heures.',
            'duree_heures.min'     => 'La durée doit être d\'au moins 1 heure.',
            'titre.required'       => 'Le titre de la formation est obligatoire.',
            'texte.required'       => 'La description de la formation est obligatoire.',
        ];
    }
}
