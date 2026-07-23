import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import middleware from '../middleware'

function makeRequest(path: string, cookies: Record<string, string> = {}) {
    const req = new NextRequest(new URL(path, 'http://localhost:3000'))
    Object.entries(cookies).forEach(([key, value]) => {
        req.cookies.set(key, value)
    })
    return req
}

describe('middleware', () => {
    it('redirige vers /auth si aucun token', () => {
        const res = middleware(makeRequest('/client/profile'))
        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toContain('/auth')
    })

    it('redirige un compte suspendu vers /compte-bloque', () => {
        const res = middleware(makeRequest('/client/profile', {
            auth_token: 'token',
            user_statut: 'suspendu',
            user_role: 'client',
        }))
        expect(res.headers.get('location')).toContain('/compte-bloque?raison=suspendu')
    })

    it('laisse passer un compte suspendu déjà sur /compte-bloque', () => {
        const res = middleware(makeRequest('/compte-bloque', {
            auth_token: 'token',
            user_statut: 'suspendu',
        }))
        expect(res.status).toBe(200)
    })

    it('redirige vers /onboarding si onboarding_pending et route différente', () => {
        const res = middleware(makeRequest('/client/profile', {
            auth_token: 'token',
            onboarding_pending: '1',
        }))
        expect(res.headers.get('location')).toContain('/onboarding')
    })

    it('laisse passer /onboarding quand onboarding_pending', () => {
        const res = middleware(makeRequest('/onboarding', {
            auth_token: 'token',
            onboarding_pending: '1',
        }))
        expect(res.status).toBe(200)
    })

    it('redirige un user déjà onboardé qui accède à /onboarding vers son dashboard', () => {
        const res = middleware(makeRequest('/onboarding', {
            auth_token: 'token',
            user_role: 'vendeur',
        }))
        expect(res.headers.get('location')).toContain('/vendeur/dashboard')
    })

    it('bloque un client qui tente d\'accéder à une route vendeur', () => {
        const res = middleware(makeRequest('/vendeur/dashboard', {
            auth_token: 'token',
            user_role: 'client',
        }))
        expect(res.headers.get('location')).toContain('/client/profile')
    })

    it('laisse passer un vendeur sur ses propres routes', () => {
        const res = middleware(makeRequest('/vendeur/dashboard', {
            auth_token: 'token',
            user_role: 'vendeur',
        }))
        expect(res.status).toBe(200)
    })

    it('laisse passer une route publique même sans rôle reconnu', () => {
        const res = middleware(makeRequest('/auth/callback', {
            auth_token: 'token',
            user_role: 'client',
        }))
        expect(res.status).toBe(200)
    })
})
