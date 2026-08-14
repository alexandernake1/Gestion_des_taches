import { createFileRoute } from '@tanstack/react-router'

import { LegalDocumentLayout, LegalSection } from '@/components/legal/LegalDocumentLayout'

export const Route = createFileRoute('/privacy')({ component: PrivacyPage })

const toc = [
  { id: 'responsable', label: 'Responsable du traitement' },
  { id: 'donnees', label: 'Données traitées' },
  { id: 'finalites', label: 'Finalités et bases légales' },
  { id: 'visibilite', label: 'Visibilité dans les espaces' },
  { id: 'destinataires', label: 'Destinataires et prestataires' },
  { id: 'conservation', label: 'Conservation' },
  { id: 'cookies', label: 'Cookies et stockage local' },
  { id: 'securite', label: 'Sécurité' },
  { id: 'droits', label: 'Vos droits' },
  { id: 'modifications', label: 'Modifications et contact' },
]

function PrivacyPage() {
  return (
    <LegalDocumentLayout
      title="Politique de confidentialité"
      description="Cette politique explique de façon claire quelles données Activity Control traite, pourquoi elles sont nécessaires et comment exercer vos droits."
      current="privacy"
      toc={toc}
    >
      <LegalSection id="responsable" title="1. Responsable du traitement">
        <p><strong>Activity Control</strong> est le nom du service. L’entité qui l’exploitera commercialement sera responsable des traitements liés aux comptes, à la sécurité et à la fourniture du SaaS.</p>
        <p>Pour une entreprise cliente, celle-ci reste responsable des contenus et données professionnelles qu’elle fait saisir par ses collaborateurs. Activity Control agit alors comme prestataire technique selon les instructions de l’entreprise.</p>
        <p>Contact relatif aux données personnelles : <a href="mailto:support@activity-tracker.com">support@activity-tracker.com</a>.</p>
      </LegalSection>

      <LegalSection id="donnees" title="2. Données que nous traitons">
        <ul>
          <li><strong>Compte :</strong> nom, prénom, adresse email, téléphone facultatif, avatar, rôle et paramètres.</li>
          <li><strong>Espace de travail :</strong> informations de l’entreprise ou de l’espace personnel, membres, équipes et droits d’accès.</li>
          <li><strong>Activité :</strong> tâches, projets, commentaires, pièces jointes, historiques, validations et notifications.</li>
          <li><strong>Abonnement :</strong> forfait choisi, état de l’abonnement, références et métadonnées de transaction. Les données bancaires complètes ne doivent pas être saisies dans les tâches ou commentaires.</li>
          <li><strong>Sécurité :</strong> journaux techniques, tentatives de connexion, preuves anti-robot, identifiants de session et actions administratives.</li>
          <li><strong>Support :</strong> messages et informations transmis lors d’une demande d’assistance.</li>
        </ul>
      </LegalSection>

      <LegalSection id="finalites" title="3. Finalités et bases légales">
        <ul>
          <li><strong>Fournir le service et gérer le compte :</strong> exécution des Conditions d’utilisation.</li>
          <li><strong>Organiser les tâches, projets et collaborations :</strong> exécution du service demandé par l’utilisateur ou l’entreprise cliente.</li>
          <li><strong>Gérer les forfaits, paiements et justificatifs :</strong> exécution du contrat et respect des obligations comptables applicables.</li>
          <li><strong>Prévenir la fraude, les robots et les accès non autorisés :</strong> intérêt légitime à sécuriser le service et ses utilisateurs.</li>
          <li><strong>Envoyer les notifications fonctionnelles :</strong> exécution du service. Les notifications facultatives peuvent être désactivées dans les paramètres.</li>
          <li><strong>Respecter une obligation légale ou répondre à une autorité habilitée :</strong> obligation légale.</li>
        </ul>
        <p>Activity Control n’utilise actuellement aucun traceur publicitaire et ne vend pas les données personnelles.</p>
      </LegalSection>

      <LegalSection id="visibilite" title="4. Visibilité dans les espaces de travail">
        <p>Dans un espace personnel, les contenus appartiennent au seul compte concerné, sous réserve des accès techniques strictement nécessaires à la maintenance et à la sécurité.</p>
        <p>Dans un espace d’entreprise, les responsables autorisés peuvent consulter et administrer les membres, tâches, projets, historiques et rapports selon leur rôle. L’utilisateur doit éviter d’y déposer des informations privées ou sensibles sans lien avec l’activité professionnelle.</p>
      </LegalSection>

      <LegalSection id="destinataires" title="5. Destinataires et prestataires">
        <p>Les données sont accessibles aux utilisateurs autorisés de l’espace, aux administrateurs habilités du service et aux prestataires strictement nécessaires à son fonctionnement.</p>
        <ul>
          <li><strong>Hébergement, base de données et email :</strong> prestataires configurés par l’exploitant.</li>
          <li><strong>Cloudflare Turnstile :</strong> protection des formulaires contre les robots et abus.</li>
          <li><strong>Google Identity Services :</strong> uniquement si l’utilisateur choisit « Continuer avec Google » lorsque cette option est activée.</li>
          <li><strong>Prestataire de paiement :</strong> lorsqu’un paiement réel sera activé.</li>
        </ul>
        <p>La liste définitive des prestataires, leurs localisations et les garanties encadrant d’éventuels transferts internationaux devront être publiée avant la mise en production commerciale.</p>
      </LegalSection>

      <LegalSection id="conservation" title="6. Durées de conservation">
        <p>Les données du compte et de l’espace sont conservées pendant l’utilisation du service. Après clôture, elles sont supprimées ou anonymisées à l’issue des délais techniques, contractuels et légaux applicables.</p>
        <p>Les justificatifs soumis à une obligation comptable sont conservés pendant la durée imposée par la réglementation applicable. Les journaux de sécurité sont conservés pour une durée limitée et proportionnée à la détection des incidents. Les sauvegardes sont purgées selon le cycle défini par l’hébergeur.</p>
      </LegalSection>

      <LegalSection id="cookies" title="7. Cookies et stockage local">
        <p>Le service utilise uniquement les éléments nécessaires à son fonctionnement actuel :</p>
        <ul>
          <li><strong>Cookies de session sécurisés :</strong> authentification et renouvellement de session. Ils sont protégés contre l’accès JavaScript.</li>
          <li><strong>« Se souvenir de moi » :</strong> si cette option est cochée, la session peut rester active pendant sept jours sur l’appareil.</li>
          <li><strong>Stockage local :</strong> préférences d’interface, notifications et contexte technique de l’espace.</li>
          <li><strong>Turnstile :</strong> informations techniques nécessaires à la lutte contre les requêtes automatisées.</li>
        </ul>
        <p>Si des traceurs de mesure d’audience ou publicitaires non essentiels sont ajoutés ultérieurement, ils feront l’objet d’une information et, lorsque nécessaire, d’un consentement séparé.</p>
      </LegalSection>

      <LegalSection id="securite" title="8. Sécurité des données">
        <p>Activity Control met en œuvre des mesures proportionnées aux risques : séparation des espaces clients, contrôle des rôles, mots de passe hachés, cookies d’authentification protégés, limitation des tentatives, protection anti-robot, journalisation administrative et sauvegardes.</p>
        <p>Aucun système n’étant totalement invulnérable, tout incident suspect peut être signalé à <a href="mailto:support@activity-tracker.com">support@activity-tracker.com</a>. En production, les échanges devront être chiffrés par HTTPS.</p>
      </LegalSection>

      <LegalSection id="droits" title="9. Vos droits">
        <p>Selon la réglementation applicable, vous pouvez demander l’accès à vos données, leur rectification, leur effacement, leur portabilité, la limitation du traitement ou vous opposer à certains traitements.</p>
        <p>La demande doit être envoyée à <a href="mailto:support@activity-tracker.com">support@activity-tracker.com</a>. Une vérification raisonnable de l’identité pourra être demandée. Vous pouvez également saisir l’autorité de protection des données compétente dans votre pays.</p>
      </LegalSection>

      <LegalSection id="modifications" title="10. Modifications et contact">
        <p>Cette politique peut évoluer avec les fonctionnalités, les prestataires ou les obligations applicables. Une modification importante sera signalée dans le service et une nouvelle acceptation pourra être demandée lorsque cela est nécessaire.</p>
        <p>Questions : <a href="mailto:support@activity-tracker.com">support@activity-tracker.com</a>.</p>
      </LegalSection>
    </LegalDocumentLayout>
  )
}
