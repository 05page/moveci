import Link from "next/link"

export const metadata = {
    title: "Conditions Générales d'Utilisation — Move CI",
    description: "Conditions générales d'utilisation de la plateforme Move CI, marketplace automobile en Côte d'Ivoire.",
}

export default function CguPage() {
    return (
        <main className="min-h-screen bg-white pt-14">
            {/* En-tête */}
            <div className="bg-zinc-950 py-12 px-6">
                <div className="max-w-3xl mx-auto">
                    <Link
                        href="/"
                        className="text-xs text-zinc-500 hover:text-amber-400 transition-colors mb-6 inline-block"
                    >
                        ← Retour à l&apos;accueil
                    </Link>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        Conditions Générales d&apos;Utilisation
                    </h1>
                    <p className="text-sm text-zinc-500">
                        Version 1.0 — En vigueur depuis le 21 mai 2026
                    </p>
                </div>
            </div>

            {/* Corps */}
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-10 text-zinc-700">

                {/* Art. 1 */}
                <section>
                    <h2 className="text-base font-bold text-zinc-900 mb-3">
                        Article 1 — Présentation de la plateforme
                    </h2>
                    <p className="text-sm leading-relaxed">
                        Move CI est une plateforme de mise en relation entre particuliers et professionnels
                        pour la vente, l&apos;achat et la location de véhicules en Côte d&apos;Ivoire.
                        Elle est exploitée depuis Abidjan, Côte d&apos;Ivoire.
                    </p>
                </section>

                {/* Art. 2 */}
                <section>
                    <h2 className="text-base font-bold text-zinc-900 mb-3">
                        Article 2 — Acceptation des CGU
                    </h2>
                    <p className="text-sm leading-relaxed">
                        L&apos;utilisation de Move CI implique l&apos;acceptation pleine et entière des présentes
                        Conditions Générales d&apos;Utilisation. Toute personne qui ne les accepte pas doit
                        s&apos;abstenir d&apos;utiliser la plateforme.
                    </p>
                </section>

                {/* Art. 3 */}
                <section>
                    <h2 className="text-base font-bold text-zinc-900 mb-3">
                        Article 3 — Accès et inscription
                    </h2>
                    <p className="text-sm leading-relaxed mb-3">
                        L&apos;accès à certaines fonctionnalités requiert la création d&apos;un compte.
                        En s&apos;inscrivant, l&apos;utilisateur s&apos;engage à :
                    </p>
                    <ul className="text-sm leading-relaxed space-y-1.5 list-disc list-inside text-zinc-600">
                        <li>Fournir des informations exactes, complètes et à jour</li>
                        <li>Maintenir la confidentialité de ses identifiants de connexion</li>
                        <li>Être âgé d&apos;au moins 18 ans</li>
                        <li>Ne pas créer plusieurs comptes pour un même usage</li>
                    </ul>
                </section>

                {/* Art. 4 */}
                <section>
                    <h2 className="text-base font-bold text-zinc-900 mb-3">
                        Article 4 — Rôles et types de comptes
                    </h2>
                    <p className="text-sm leading-relaxed mb-3">
                        Move CI distingue quatre types de comptes :
                    </p>
                    <ul className="text-sm leading-relaxed space-y-2 text-zinc-600">
                        <li>
                            <span className="font-medium text-zinc-800">Client</span> —
                            peut consulter les annonces, contacter les vendeurs et gérer ses favoris.
                        </li>
                        <li>
                            <span className="font-medium text-zinc-800">Vendeur</span> —
                            peut publier des annonces de vente ou de location de véhicules, sous réserve
                            de validation de chaque annonce par notre équipe.
                        </li>
                        <li>
                            <span className="font-medium text-zinc-800">Concessionnaire</span> —
                            partenaire professionnel soumis à une vérification de son RCCM avant activation.
                        </li>
                        <li>
                            <span className="font-medium text-zinc-800">Auto-école</span> —
                            partenaire professionnel soumis à la vérification de son numéro d&apos;agrément
                            avant activation.
                        </li>
                    </ul>
                </section>

                {/* Art. 5 */}
                <section>
                    <h2 className="text-base font-bold text-zinc-900 mb-3">
                        Article 5 — Publications et annonces
                    </h2>
                    <p className="text-sm leading-relaxed mb-3">
                        Chaque vendeur est seul responsable du contenu des annonces qu&apos;il publie.
                        Les annonces doivent :
                    </p>
                    <ul className="text-sm leading-relaxed space-y-1.5 list-disc list-inside text-zinc-600">
                        <li>Décrire fidèlement le véhicule (état, kilométrage, prix)</li>
                        <li>Comporter des photos réelles du véhicule concerné</li>
                        <li>Ne pas contrevenir aux lois ivoiriennes en vigueur</li>
                        <li>Ne pas concerner des véhicules volés, gagés ou sous saisie</li>
                    </ul>
                    <p className="text-sm leading-relaxed mt-3">
                        Move CI se réserve le droit de rejeter, modifier ou supprimer toute annonce
                        sans préavis, notamment après examen lors de la phase de modération.
                    </p>
                </section>

                {/* Art. 6 — clé pour Move CI */}
                <section className="bg-amber-50 border border-amber-200/60 rounded-xl p-5">
                    <h2 className="text-base font-bold text-zinc-900 mb-3">
                        Article 6 — Absence de paiement sur la plateforme
                    </h2>
                    <p className="text-sm leading-relaxed">
                        Move CI est une plateforme de <strong>mise en relation uniquement</strong>.
                        Aucune transaction financière ne transite par la plateforme. Les paiements et
                        accords commerciaux sont conclus <strong>directement entre les parties</strong>
                        (acheteur et vendeur), sous leur entière responsabilité. Move CI ne peut en aucun
                        cas être tenu responsable d&apos;un litige financier entre utilisateurs.
                    </p>
                </section>

                {/* Art. 7 */}
                <section>
                    <h2 className="text-base font-bold text-zinc-900 mb-3">
                        Article 7 — Signalements et modération
                    </h2>
                    <p className="text-sm leading-relaxed">
                        Tout utilisateur peut signaler un contenu ou un compte inapproprié via le système
                        de signalement intégré à la plateforme. Move CI s&apos;engage à traiter les signalements
                        dans un délai raisonnable et se réserve le droit de prendre toute mesure nécessaire
                        (suppression de contenu, suspension de compte) sans en informer préalablement
                        l&apos;utilisateur concerné.
                    </p>
                </section>

                {/* Art. 8 */}
                <section>
                    <h2 className="text-base font-bold text-zinc-900 mb-3">
                        Article 8 — Suspension et résiliation de compte
                    </h2>
                    <p className="text-sm leading-relaxed">
                        Move CI se réserve le droit de suspendre, restreindre ou fermer définitivement
                        tout compte, sans préavis, en cas de violation des présentes CGU, de comportement
                        frauduleux, d&apos;usurpation d&apos;identité ou de toute activité nuisant à la plateforme
                        ou à ses utilisateurs.
                    </p>
                </section>

                {/* Art. 9 */}
                <section>
                    <h2 className="text-base font-bold text-zinc-900 mb-3">
                        Article 9 — Données personnelles
                    </h2>
                    <p className="text-sm leading-relaxed mb-3">
                        Move CI collecte les données suivantes aux fins de fonctionnement de la plateforme :
                        nom complet, adresse e-mail, numéro de téléphone, adresse postale et photos de véhicules.
                    </p>
                    <p className="text-sm leading-relaxed">
                        Ces données sont utilisées exclusivement pour le bon fonctionnement du service et
                        ne sont jamais vendues à des tiers. Conformément aux textes en vigueur, l&apos;utilisateur
                        dispose d&apos;un droit d&apos;accès, de rectification et de suppression de ses données en
                        adressant une demande à{" "}
                        <a href="mailto:contact@moveci.tech" className="text-amber-600 hover:underline">
                            contact@moveci.tech
                        </a>.
                    </p>
                </section>

                {/* Art. 10 */}
                <section>
                    <h2 className="text-base font-bold text-zinc-900 mb-3">
                        Article 10 — Propriété intellectuelle
                    </h2>
                    <p className="text-sm leading-relaxed">
                        L&apos;ensemble des éléments constitutifs de Move CI (logo, design, interface, code source,
                        textes) est la propriété exclusive de ses éditeurs. Toute reproduction, représentation
                        ou exploitation non autorisée de ces éléments est strictement interdite.
                    </p>
                </section>

                {/* Art. 11 */}
                <section>
                    <h2 className="text-base font-bold text-zinc-900 mb-3">
                        Article 11 — Limitation de responsabilité
                    </h2>
                    <p className="text-sm leading-relaxed">
                        Move CI intervient en qualité d&apos;intermédiaire technique. La plateforme ne garantit
                        pas la véracité des annonces publiées par les vendeurs, ni l&apos;issue des transactions
                        conclues entre utilisateurs. Move CI ne saurait être tenu responsable de tout préjudice
                        direct ou indirect résultant de l&apos;utilisation de la plateforme ou d&apos;une transaction
                        entre utilisateurs.
                    </p>
                </section>

                {/* Art. 12 */}
                <section>
                    <h2 className="text-base font-bold text-zinc-900 mb-3">
                        Article 12 — Modifications des CGU
                    </h2>
                    <p className="text-sm leading-relaxed">
                        Move CI se réserve le droit de modifier les présentes CGU à tout moment. Les
                        utilisateurs seront informés de toute modification significative. La poursuite de
                        l&apos;utilisation de la plateforme après notification vaut acceptation des nouvelles
                        conditions.
                    </p>
                </section>

                {/* Art. 13 */}
                <section>
                    <h2 className="text-base font-bold text-zinc-900 mb-3">
                        Article 13 — Droit applicable et juridiction compétente
                    </h2>
                    <p className="text-sm leading-relaxed">
                        Les présentes CGU sont soumises au droit ivoirien. En cas de litige, les parties
                        s&apos;efforceront de trouver une solution amiable. À défaut d&apos;accord, les tribunaux
                        compétents d&apos;Abidjan seront seuls compétents pour en connaître.
                    </p>
                </section>

                {/* Contact */}
                <section className="border-t border-zinc-100 pt-8">
                    <p className="text-sm text-zinc-500">
                        Pour toute question relative aux présentes CGU :{" "}
                        <a href="mailto:contact@moveci.tech" className="text-amber-600 hover:underline">
                            contact@moveci.tech
                        </a>
                    </p>
                </section>
            </div>
        </main>
    )
}
