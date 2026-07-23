import { describe, it, expect } from 'vitest'
import { LoginValidator } from '../loginValidator'
import { registerValidator } from '../registerValidator'

describe('LoginValidator', () => {
    it('accepte des identifiants valides', () => {
        const result = LoginValidator.safeParse({ email: 'test@example.com', password: 'motdepasse' })
        expect(result.success).toBe(true)
    })

    it('refuse un email invalide', () => {
        const result = LoginValidator.safeParse({ email: 'pas-un-email', password: 'motdepasse' })
        expect(result.success).toBe(false)
    })

    it('refuse un mot de passe trop court', () => {
        const result = LoginValidator.safeParse({ email: 'test@example.com', password: 'abc' })
        expect(result.success).toBe(false)
    })
})

describe('registerValidator', () => {
    const base = {
        fullname: 'Jean Testeur',
        role: 'client' as const,
        email: 'jean@example.com',
        adresse: 'Cocody, Abidjan',
        telephone: '0102030405',
        password: 'Abcdef1!',
        password_confirmation: 'Abcdef1!',
    }

    it('accepte une inscription valide', () => {
        const result = registerValidator.safeParse(base)
        expect(result.success).toBe(true)
    })

    it('refuse si les mots de passe ne correspondent pas', () => {
        const result = registerValidator.safeParse({ ...base, password_confirmation: 'Autre1!' })
        expect(result.success).toBe(false)
    })

    it('refuse un mot de passe sans caractère spécial', () => {
        const result = registerValidator.safeParse({ ...base, password: 'Abcdef12', password_confirmation: 'Abcdef12' })
        expect(result.success).toBe(false)
    })

    it('refuse un rôle invalide', () => {
        const result = registerValidator.safeParse({ ...base, role: 'super_admin' })
        expect(result.success).toBe(false)
    })

    it('refuse un numéro de téléphone qui ne suit pas le format attendu', () => {
        const result = registerValidator.safeParse({ ...base, telephone: '123' })
        expect(result.success).toBe(false)
    })
})
