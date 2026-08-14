import { createFileRoute } from '@tanstack/react-router'

import { LegalDocumentLayout, LegalSection } from '@/components/legal/LegalDocumentLayout'

export const Route = createFileRoute('/terms')({ component: TermsPage })

const toc = [
  { id: 'objet', label: 'Objet du service' },
  { id: 'editeur', label: 'Éditeur' },
  { id: 'acceptation', label: 'Acceptation' },
  { id: 'compte', label: 'Compte et sécurité' },
  { id: 'espaces', label: 'Espaces de travail' },
  { id: 'usage', label: 'Utilisation autorisée' },
  { id: 'contenus', label: 'Contenus et données' },
  { id: 'abonnements', label: 'Forfaits et paiements' },
  { id: 'disponibilite', label: 'Disponibilité' },
  { id: 'suspension', label: 'Suspension et clôture' },
  { id: 'responsabilite', label: 'Responsabilité' },
  { id: 'droit', label: 'Évolution et litiges' },
]

function TermsPage() {
  return (
    <LegalDocumentLayout
      title="Conditions générales d’utilisation"
      description="Ces conditions définissent les règles applicables à la création d’un compte et à l’utilisation d’Activity Control, en espace personnel comme en entreprise."
      current="terms"
      toc={toc}
    >
      <LegalSection id="objet" title="1. Objet du service">
        <p>Activity Control est une application SaaS de gestion d’activité permettant notamment de gérer des tâches, projets, échéances, validations, équipes, notifications, rapports et abonnements.</p>
        <p>Le service propose des espaces personnels et des espaces d’entreprise. Certaines fonctions dépendent du forfait et du type d’espace sélectionnés.</p>
      </LegalSection>

      <LegalSection id="editeur" title="2. Éditeur et contact">
        <p><strong>Activity Control</strong> est le nom commercial du service en préproduction. La raison sociale, la forme juridique, le siège, l’identifiant d’immatriculation et les coordonnées complètes de l’entité exploitante devront être publiés avant son ouverture commerciale.</p>
        <p>Contact : <a href="mailto:support@activity-tracker.com">support@activity-tracker.com</a>.</p>
      </LegalSection>

      <LegalSection id="acceptation" title="3. Acceptation des conditions">
        <p>La création d’un compte nécessite une action positive par laquelle l’utilisateur accepte la version en vigueur des présentes Conditions et reconnaît avoir pris connaissance de la Politique de confidentialité.</p>
        <p>La date et la version des documents acceptés peuvent être enregistrées afin d’assurer la traçabilité du consentement. Si l’utilisateur agit pour une entreprise, il déclare être autorisé à engager ou à utiliser le service pour celle-ci.</p>
      </LegalSection>

      <LegalSection id="compte" title="4. Compte et sécurité">
        <ul>
          <li>Les informations fournies doivent être exactes, actuelles et licites.</li>
          <li>Le compte est personnel : les identifiants ne doivent pas être partagés.</li>
          <li>L’utilisateur doit choisir un mot de passe robuste et signaler rapidement tout accès suspect.</li>
          <li>Les actions réalisées depuis un compte sont réputées provenir de son titulaire jusqu’au signalement d’une compromission.</li>
          <li>L’utilisation de Google, lorsqu’elle est activée, reste soumise aux règles du compte Google concerné.</li>
        </ul>
      </LegalSection>

      <LegalSection id="espaces" title="5. Espaces personnels et d’entreprise">
        <p>Un espace personnel est destiné à un usage individuel et ne comporte pas de mécanisme d’assignation à des collaborateurs.</p>
        <p>Dans un espace d’entreprise, le propriétaire et les responsables habilités administrent les membres, rôles et accès. L’entreprise est responsable des invitations, du retrait des accès et de l’information de ses collaborateurs.</p>
      </LegalSection>

      <LegalSection id="usage" title="6. Utilisation autorisée">
        <p>Il est interdit notamment :</p>
        <ul>
          <li>d’utiliser le service à des fins frauduleuses, illégales, trompeuses ou portant atteinte aux droits d’autrui ;</li>
          <li>de tenter de contourner les contrôles d’accès, limitations, protections anti-robot ou mécanismes de sécurité ;</li>
          <li>d’introduire un logiciel malveillant, de perturber le service ou d’effectuer des tests de sécurité sans autorisation écrite ;</li>
          <li>de déposer des contenus illicites, discriminatoires, confidentiels sans autorisation ou sans rapport avec l’usage prévu ;</li>
          <li>de revendre, copier ou exploiter le service en dehors des droits expressément accordés.</li>
        </ul>
      </LegalSection>

      <LegalSection id="contenus" title="7. Contenus et données de l’utilisateur">
        <p>L’utilisateur ou l’entreprise conserve ses droits sur les contenus qu’il saisit. Il accorde à Activity Control les autorisations techniques strictement nécessaires pour les héberger, sauvegarder, afficher et traiter afin de fournir le service.</p>
        <p>Le client garantit disposer des droits et autorisations nécessaires sur les données importées, notamment celles de ses salariés, prestataires ou clients. Il est responsable de ses propres obligations d’information et de conformité.</p>
      </LegalSection>

      <LegalSection id="abonnements" title="8. Forfaits et paiements">
        <p>Les fonctionnalités, limites, prix et périodicités applicables sont ceux présentés avant la souscription. Le passage à un autre forfait peut modifier les capacités disponibles.</p>
        <p>Les modalités définitives de facturation, renouvellement, résiliation, taxes et remboursement devront être précisées avant l’activation de paiements réels. Les transactions affichées dans l’environnement local ou de démonstration sont simulées et ne constituent pas des débits bancaires.</p>
      </LegalSection>

      <LegalSection id="disponibilite" title="9. Disponibilité et maintenance">
        <p>Activity Control vise une disponibilité raisonnable, sans garantir un fonctionnement continu et sans erreur. Des interruptions peuvent intervenir pour maintenance, mise à jour, sécurité, incident d’un prestataire ou cas de force majeure.</p>
        <p>L’utilisateur reste responsable de vérifier les échéances critiques et de conserver une copie externe des informations dont l’indisponibilité pourrait avoir des conséquences importantes.</p>
      </LegalSection>

      <LegalSection id="suspension" title="10. Suspension et clôture">
        <p>Un compte ou un espace peut être limité ou suspendu en cas de risque de sécurité, impayé, violation des présentes Conditions, usage abusif ou obligation légale. Lorsque la situation le permet, l’utilisateur est informé et peut régulariser.</p>
        <p>Les modalités de clôture, d’export et de suppression suivent la Politique de confidentialité et les obligations de conservation applicables.</p>
      </LegalSection>

      <LegalSection id="responsabilite" title="11. Responsabilité">
        <p>Activity Control fournit un outil d’organisation et ne remplace pas le jugement, les contrôles internes ou les obligations professionnelles de l’utilisateur. Les tableaux, alertes et statistiques doivent être vérifiés avant toute décision importante.</p>
        <p>Dans les limites autorisées par la loi applicable, l’exploitant ne répond pas des dommages résultant d’informations inexactes saisies par l’utilisateur, d’un usage non conforme, du partage d’identifiants ou d’un service tiers hors de son contrôle.</p>
      </LegalSection>

      <LegalSection id="droit" title="12. Évolution, droit applicable et litiges">
        <p>Les présentes Conditions peuvent être mises à jour pour refléter l’évolution du service ou du cadre applicable. Une modification importante sera portée à la connaissance des utilisateurs et pourra nécessiter une nouvelle acceptation.</p>
        <p>Le droit applicable, les coordonnées de médiation éventuelles et la juridiction compétente seront précisés avec l’identité juridique de l’exploitant avant l’ouverture commerciale. Les règles impératives protégeant l’utilisateur restent applicables.</p>
      </LegalSection>
    </LegalDocumentLayout>
  )
}
