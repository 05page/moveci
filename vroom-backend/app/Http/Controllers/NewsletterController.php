<?php

namespace App\Http\Controllers;

use App\Models\Newsletter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NewsletterController extends Controller
{
    /**
     * Inscription à la newsletter. Route publique — accessible sans être connecté,
     * la landing page l'affiche aux visiteurs comme aux utilisateurs authentifiés.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email|max:255|unique:newsletters,email',
        ], [
            'email.unique' => 'Cet email est déjà inscrit à la newsletter.',
        ]);

        $inscription = Newsletter::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Inscription à la newsletter confirmée',
            'data'    => $inscription,
        ], 201);
    }
}
