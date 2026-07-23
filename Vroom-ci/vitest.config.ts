import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        globals: true,
        // Ancré à la racine du projet (pas de `**` en tête) : sans ça, Vitest
        // exécute aussi les tests internes de dépendances dans node_modules
        // (zod, @testing-library/jest-dom...) — jusqu'à 203 fichiers / 1946
        // tests au lieu des 3 fichiers de ce projet. L'exclusion node_modules
        // par défaut ne suffit pas ici (structure symlinkée pnpm).
        include: [
            'src/**/__tests__/**/*.test.{ts,tsx}',
            'app/**/__tests__/**/*.test.{ts,tsx}',
            '__tests__/**/*.test.{ts,tsx}',
        ],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
})
