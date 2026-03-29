import OnboardingWizard from "@/app/components/OnboardingWizard"

export default function VendeurLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {/* Wizard d'onboarding — s'affiche automatiquement si non terminé */}
            <OnboardingWizard />
            {children}
        </>
    )
}
