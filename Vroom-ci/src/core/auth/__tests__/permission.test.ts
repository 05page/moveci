import { describe, it, expect } from 'vitest'
import { getDashBoard, hasRouteAccess, isPublicRoute } from '../permission'

describe('hasRouteAccess', () => {
    it('autorise un client sur /client', () => {
        expect(hasRouteAccess('client', '/client/profile')).toBe(true)
    })

    it('refuse un client sur /vendeur', () => {
        expect(hasRouteAccess('client', '/vendeur/dashboard')).toBe(false)
    })

    it('autorise un vendeur sur /vendeur', () => {
        expect(hasRouteAccess('vendeur', '/vendeur/dashboard')).toBe(true)
    })

    it('autorise un concessionnaire et un auto_ecole sur /partenaire', () => {
        expect(hasRouteAccess('concessionnaire', '/partenaire/dashboard')).toBe(true)
        expect(hasRouteAccess('auto_ecole', '/partenaire/dashboard')).toBe(true)
    })

    it('bloque un auto_ecole sur /partenaire/mongarage (route concessionnaire uniquement)', () => {
        expect(hasRouteAccess('auto_ecole', '/partenaire/mongarage')).toBe(false)
    })

    it('bloque un concessionnaire sur /partenaire/formations (route auto_ecole uniquement)', () => {
        expect(hasRouteAccess('concessionnaire', '/partenaire/formations')).toBe(false)
    })

    it('autorise un admin sur /admin', () => {
        expect(hasRouteAccess('admin', '/admin/dashboard')).toBe(true)
    })

    it('refuse un admin sur une route client', () => {
        expect(hasRouteAccess('admin', '/client/profile')).toBe(false)
    })
})

describe('isPublicRoute', () => {
    it('reconnaît /auth et /auth/callback comme publiques', () => {
        expect(isPublicRoute('/auth')).toBe(true)
        expect(isPublicRoute('/auth/callback')).toBe(true)
    })

    it('ne considère pas /client comme publique', () => {
        expect(isPublicRoute('/client/profile')).toBe(false)
    })
})

describe('getDashBoard', () => {
    it('retourne le bon dashboard pour chaque rôle', () => {
        expect(getDashBoard('client')).toBe('/client/profile')
        expect(getDashBoard('vendeur')).toBe('/vendeur/dashboard')
        expect(getDashBoard('concessionnaire')).toBe('/partenaire/dashboard')
        expect(getDashBoard('auto_ecole')).toBe('/partenaire/dashboard')
        expect(getDashBoard('admin')).toBe('/admin/dashboard')
    })
})
