import random
from datetime import date, timedelta

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from domain.companies.models import Company
from domain.notifications.models import Notification, NotificationType
from domain.tasks.models import (
    Priority,
    Status,
    Task,
    TaskAttachment,
    TaskComment,
    TaskHistory,
    TaskReport,
)
from domain.teams.models import Team
from domain.users.models import Role, User


class Command(BaseCommand):
    help = "Create a realistic, comprehensive demo company dataset."

    PASSWORD = "Demo1234!"

    FIRST_NAMES = [
        "Aïcha", "Mariam", "Fatoumata", "Clarisse", "Aminata", "Rasmata",
        "Nadia", "Estelle", "Safiatou", "Diane", "Nafissatou", "Prisca",
        "Idrissa", "Moussa", "Oumar", "Salif", "Abdoulaye", "Issouf",
        "Aristide", "Serge", "Hervé", "Yacouba", "Souleymane", "Boubacar",
        "Wilfried", "Karim", "Adama", "Franck", "Patrick", "Ismaël",
        "Awa", "Habibou", "Inès", "Josiane", "Kadiatou", "Alimata",
        "Dieudonné", "Romaric", "Gérard", "Seydou", "Lassina", "Aziz",
    ]
    LAST_NAMES = [
        "Ouédraogo", "Sawadogo", "Kaboré", "Compaoré", "Traoré", "Zongo",
        "Ilboudo", "Somé", "Sanou", "Nikiéma", "Bazié", "Diallo", "Konaté",
        "Yaméogo", "Tapsoba", "Sankara", "Kinda", "Coulibaly", "Bambara",
        "Bonkoungou", "Tiendrébéogo", "Nana", "Barro", "Kafando",
    ]
    TEAM_SPECS = [
        ("Direction & Stratégie", "Pilotage de la performance et coordination des objectifs annuels."),
        ("Produit & Innovation", "Conception des offres numériques et amélioration continue des produits."),
        ("Ingénierie", "Développement, infrastructure, qualité et sécurité des solutions."),
        ("Commercial", "Développement du portefeuille clients et suivi des opportunités."),
        ("Marketing & Communication", "Notoriété, acquisition, contenus et communication institutionnelle."),
        ("Finance & Administration", "Budget, trésorerie, achats, conformité et administration générale."),
        ("Ressources humaines", "Recrutement, formation, engagement et gestion des talents."),
        ("Support client", "Accompagnement, satisfaction et résolution des demandes clients."),
    ]
    TASK_TEMPLATES = {
        "Direction & Stratégie": [
            "Finaliser le tableau de bord du comité de direction",
            "Préparer la revue trimestrielle des objectifs",
            "Mettre à jour le plan stratégique 2026–2028",
            "Analyser les indicateurs de rentabilité par activité",
            "Préparer la réunion avec les partenaires institutionnels",
            "Suivre les décisions du dernier comité de direction",
            "Évaluer les risques opérationnels du trimestre",
            "Structurer le plan d’expansion régionale",
            "Préparer la note de synthèse pour les actionnaires",
            "Réviser la matrice des responsabilités",
            "Organiser l’atelier annuel de planification",
            "Consolider les résultats mensuels des départements",
            "Mettre à jour le registre des risques stratégiques",
            "Préparer le budget d’investissement prioritaire",
            "Évaluer les nouvelles opportunités de partenariat",
        ],
        "Produit & Innovation": [
            "Valider les maquettes du portail client",
            "Prioriser le backlog du prochain trimestre",
            "Conduire les entretiens utilisateurs terrain",
            "Rédiger les spécifications du module de reporting",
            "Analyser les retours sur la nouvelle offre PME",
            "Préparer le test pilote du paiement mobile",
            "Cartographier le parcours d’onboarding client",
            "Définir les indicateurs d’adoption produit",
            "Organiser l’atelier de découverte du nouveau service",
            "Mettre à jour la documentation fonctionnelle",
            "Étudier l’intégration de notifications WhatsApp",
            "Tester le prototype de suivi des interventions",
            "Préparer la feuille de route produit semestrielle",
            "Évaluer les demandes d’évolution prioritaires",
            "Formaliser le processus de validation produit",
        ],
        "Ingénierie": [
            "Optimiser le temps de chargement du tableau de bord",
            "Mettre en place les tests d’intégration de l’API",
            "Corriger les anomalies du module de facturation",
            "Renforcer la journalisation des événements critiques",
            "Automatiser la sauvegarde quotidienne de la base",
            "Documenter l’architecture technique",
            "Mettre à jour les dépendances du frontend",
            "Revoir les permissions multi-tenant",
            "Configurer les alertes de disponibilité",
            "Déployer la version de recette",
            "Créer le plan de reprise après incident",
            "Améliorer la couverture des tests backend",
            "Réduire les requêtes lentes du tableau de bord",
            "Préparer la revue de sécurité applicative",
            "Standardiser les environnements de développement",
            "Mettre en place le suivi des erreurs frontend",
            "Refactoriser le service de notifications",
            "Vérifier la compatibilité mobile des formulaires",
        ],
        "Commercial": [
            "Préparer la proposition commerciale pour Faso Distribution",
            "Relancer les prospects du salon Digital Burkina",
            "Mettre à jour le pipeline des opportunités",
            "Planifier les démonstrations clients de la semaine",
            "Négocier le renouvellement du contrat Wend-Panga",
            "Qualifier les nouveaux prospects du secteur bancaire",
            "Préparer le rapport hebdomadaire des ventes",
            "Élaborer l’offre dédiée aux ONG",
            "Mettre à jour la grille tarifaire entreprise",
            "Organiser la visite client à Bobo-Dioulasso",
            "Analyser les motifs de perte des opportunités",
            "Formaliser le processus de passation au support",
            "Construire les prévisions de ventes mensuelles",
            "Préparer le dossier d’appel d’offres public",
            "Réactiver les comptes clients inactifs",
            "Identifier les opportunités de vente additionnelle",
        ],
        "Marketing & Communication": [
            "Planifier la campagne de lancement de l’offre PME",
            "Rédiger l’étude de cas client Coris Services",
            "Préparer le calendrier éditorial du mois",
            "Analyser les performances des campagnes sociales",
            "Mettre à jour la présentation institutionnelle",
            "Coordonner la production de la vidéo témoignage",
            "Préparer la newsletter clients",
            "Organiser le webinaire sur la transformation digitale",
            "Actualiser les contenus du site web",
            "Concevoir les supports du prochain salon professionnel",
            "Suivre le budget publicitaire mensuel",
            "Préparer le kit de communication partenaires",
            "Mesurer la satisfaction après événement",
            "Harmoniser les modèles de présentation internes",
            "Créer une campagne de réactivation clients",
        ],
        "Finance & Administration": [
            "Clôturer les comptes du mois",
            "Préparer le plan de trésorerie à douze semaines",
            "Contrôler les factures fournisseurs en attente",
            "Mettre à jour le suivi budgétaire des départements",
            "Préparer les déclarations fiscales mensuelles",
            "Renouveler les contrats des prestataires",
            "Inventorier le matériel informatique",
            "Réconcilier les paiements clients",
            "Préparer le dossier pour l’audit comptable",
            "Actualiser la procédure de validation des achats",
            "Analyser les dépenses de fonctionnement",
            "Suivre le recouvrement des factures échues",
            "Négocier les conditions avec les fournisseurs clés",
            "Mettre à jour le registre des immobilisations",
            "Préparer les états financiers provisoires",
        ],
        "Ressources humaines": [
            "Finaliser le recrutement du développeur backend",
            "Préparer le parcours d’intégration des nouveaux arrivants",
            "Organiser les entretiens de performance semestriels",
            "Mettre à jour le plan de formation",
            "Analyser les résultats du baromètre d’engagement",
            "Préparer la paie et les variables du mois",
            "Actualiser les fiches de poste",
            "Planifier la formation à la cybersécurité",
            "Suivre les congés du trimestre",
            "Organiser l’activité de cohésion d’équipe",
            "Mettre à jour le règlement intérieur",
            "Préparer le reporting social mensuel",
            "Structurer le programme de mentorat",
            "Identifier les besoins de recrutement 2027",
            "Réviser le processus d’évaluation annuelle",
        ],
        "Support client": [
            "Résoudre les tickets critiques du compte Wend-Panga",
            "Analyser les demandes récurrentes de la semaine",
            "Mettre à jour la base de connaissances",
            "Préparer la revue mensuelle de satisfaction",
            "Rappeler les clients ayant attribué une note faible",
            "Documenter la procédure de résolution niveau 2",
            "Réduire le délai moyen de première réponse",
            "Former l’équipe sur le nouveau module de facturation",
            "Préparer le rapport des incidents majeurs",
            "Suivre les engagements de service des grands comptes",
            "Classer les demandes d’évolution produit",
            "Créer les réponses types pour les demandes fréquentes",
            "Auditer la qualité de vingt tickets clôturés",
            "Planifier les points de suivi des clients prioritaires",
            "Analyser les causes des réouvertures de tickets",
            "Mettre à jour le planning des permanences",
        ],
    }

    @transaction.atomic
    def handle(self, *args, **options):
        random.seed(20260727)
        company, _ = Company.objects.update_or_create(
            slug="sahel-digital-solutions",
            defaults={
                "name": "Sahel Digital Solutions",
                "description": (
                    "Entreprise burkinabè de services numériques spécialisée "
                    "dans les solutions de gestion et l’accompagnement des PME."
                ),
                "website": "https://saheldigital.example",
                "timezone": "Africa/Ouagadougou",
                "language": "fr",
                "is_active": True,
            },
        )

        if Task.objects.filter(company=company).count() >= 100:
            self.stdout.write(self.style.WARNING(
                "The Sahel Digital Solutions demo dataset already exists."
            ))
            self._attach_demo_account(company)
            return

        users = self._create_users(company)
        teams = self._create_teams(company, users)
        tasks = self._create_tasks(company, teams)
        self._create_activity(tasks, users)
        self._create_attachments(tasks, users)
        self._create_notifications(tasks, users)
        self._attach_demo_account(company)

        self.stdout.write(self.style.SUCCESS(
            "Demo data created: "
            f"{len(users)} users, {len(teams)} teams, {len(tasks)} tasks, "
            f"{TaskComment.objects.filter(task__company=company).count()} comments, "
            f"{TaskHistory.objects.filter(task__company=company).count()} history entries, "
            f"{TaskReport.objects.filter(task__company=company).count()} reports, "
            f"{TaskAttachment.objects.filter(task__company=company).count()} attachments, "
            f"{Notification.objects.filter(recipient__company=company).count()} notifications."
        ))

    def _create_users(self, company):
        users = []
        used_names = set()
        for index in range(42):
            first_name = self.FIRST_NAMES[index]
            last_name = self.LAST_NAMES[index % len(self.LAST_NAMES)]
            base = (
                first_name.lower()
                .replace("ï", "i").replace("é", "e").replace("è", "e")
                .replace("ê", "e").replace("ï", "i")
            )
            last_base = (
                last_name.lower()
                .replace("é", "e").replace("è", "e").replace("ê", "e")
            )
            username = f"{base}.{last_base}".replace(" ", "").replace("’", "")
            if username in used_names:
                username = f"{username}{index + 1}"
            used_names.add(username)
            role = Role.MANAGER if index < 8 else Role.EMPLOYEE
            user, _ = User.objects.get_or_create(
                email=f"{username}@saheldigital.example",
                defaults={
                    "username": username,
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone": f"+226 7{random.randint(0, 9)} {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)}",
                    "company": company,
                    "role": role,
                },
            )
            user.company = company
            user.role = role
            user.is_active = index not in {39, 41}
            user.set_password(self.PASSWORD)
            user.save()
            users.append(user)
        return users

    def _create_teams(self, company, users):
        teams = []
        employees = users[8:]
        for index, (name, description) in enumerate(self.TEAM_SPECS):
            team, _ = Team.objects.update_or_create(
                company=company,
                name=name,
                defaults={
                    "description": description,
                    "leader": users[index],
                    "is_active": True,
                },
            )
            start = index * 4
            members = employees[start:start + 5]
            if len(members) < 5:
                members += employees[:5 - len(members)]
            team.members.set([users[index], *members])
            teams.append(team)
        return teams

    def _create_tasks(self, company, teams):
        today = date.today()
        statuses = (
            [Status.TODO] * 25
            + [Status.IN_PROGRESS] * 35
            + [Status.ON_HOLD] * 12
            + [Status.DEFERRED] * 10
            + [Status.COMPLETED] * 43
        )
        priorities = (
            [Priority.LOW] * 15
            + [Priority.NORMAL] * 60
            + [Priority.HIGH] * 35
            + [Priority.URGENT] * 15
        )
        random.shuffle(statuses)
        random.shuffle(priorities)
        tasks = []
        task_index = 0
        for team in teams:
            templates = self.TASK_TEMPLATES[team.name]
            for title in templates:
                status = statuses[task_index]
                start_date = today + timedelta(days=random.randint(-55, 8))
                due_date = start_date + timedelta(days=random.randint(5, 28))
                if status in {Status.TODO, Status.IN_PROGRESS, Status.ON_HOLD} and random.random() < 0.22:
                    due_date = today - timedelta(days=random.randint(1, 18))
                    if start_date > due_date:
                        start_date = due_date - timedelta(days=random.randint(2, 10))
                assignee = random.choice(list(team.members.all()))
                creator = team.leader
                completed_at = None
                if status == Status.COMPLETED:
                    completed_at = timezone.now() - timedelta(days=random.randint(0, 35))
                task = Task.objects.create(
                    title=title,
                    description=(
                        f"Cette activité relève de l’équipe {team.name}. "
                        "Le responsable doit coordonner les parties prenantes, "
                        "documenter les décisions et partager un point d’avancement."
                    ),
                    company=company,
                    creator=creator,
                    assigned_to=assignee,
                    team=team,
                    priority=priorities[task_index],
                    status=status,
                    start_date=start_date,
                    due_date=due_date,
                    completed_at=completed_at,
                    is_active=True,
                )
                tasks.append(task)
                task_index += 1
        return tasks

    def _create_activity(self, tasks, users):
        comments = [
            "Le cadrage est validé. Je démarre les actions prévues aujourd’hui.",
            "Point d’avancement partagé avec l’équipe, aucun blocage majeur.",
            "Une validation complémentaire est nécessaire avant de poursuivre.",
            "Les éléments demandés ont été ajoutés au dossier de travail.",
            "Le client a confirmé ses disponibilités pour la prochaine étape.",
            "J’ai identifié un risque sur le délai et proposé un plan alternatif.",
            "La première version est prête pour relecture.",
            "Merci de vérifier les chiffres avant la réunion de demain.",
            "Le retour du responsable a été intégré.",
            "La tâche avance conformément au planning convenu.",
            "Nous attendons encore la réponse du prestataire.",
            "La réunion de coordination a permis de lever le principal blocage.",
        ]
        history_entries = []
        comment_entries = []
        reports = []
        for task in tasks:
            history_entries.append(TaskHistory(
                task=task,
                changed_by=task.creator,
                field_name="created",
                new_value="Tâche créée",
            ))
            history_entries.append(TaskHistory(
                task=task,
                changed_by=task.assigned_to,
                field_name="status",
                old_value=Status.TODO,
                new_value=task.status,
            ))
            if task.priority in {Priority.HIGH, Priority.URGENT}:
                history_entries.append(TaskHistory(
                    task=task,
                    changed_by=task.creator,
                    field_name="priority",
                    old_value=Priority.NORMAL,
                    new_value=task.priority,
                ))
            for _ in range(random.randint(0, 4)):
                comment_entries.append(TaskComment(
                    task=task,
                    author=random.choice([task.creator, task.assigned_to]),
                    content=random.choice(comments),
                ))
            if task.status == Status.DEFERRED or (
                task.due_date < date.today()
                and task.status not in {Status.COMPLETED}
                and random.random() < 0.35
            ):
                report_status = random.choice(["pending", "approved", "rejected"])
                reviewer = task.team.leader if report_status != "pending" else None
                reports.append(TaskReport(
                    task=task,
                    requested_by=task.assigned_to,
                    reviewed_by=reviewer,
                    old_due_date=task.due_date,
                    new_due_date=task.due_date + timedelta(days=random.randint(3, 12)),
                    reason=random.choice([
                        "Dépendance externe reçue plus tard que prévu.",
                        "Validation client nécessaire avant la finalisation.",
                        "Charge prioritaire imprévue sur un incident critique.",
                        "Informations complémentaires attendues du partenaire.",
                    ]),
                    status=report_status,
                    review_comment=(
                        "Décision prise après revue de la charge et des priorités."
                        if reviewer else None
                    ),
                    reviewed_at=timezone.now() if reviewer else None,
                ))
        TaskHistory.objects.bulk_create(history_entries)
        TaskComment.objects.bulk_create(comment_entries)
        TaskReport.objects.bulk_create(reports)

    def _create_attachments(self, tasks, users):
        document_names = [
            "note_de_cadrage.txt", "compte_rendu_reunion.txt",
            "synthese_budgetaire.txt", "plan_action.txt",
            "retour_client.txt", "checklist_validation.txt",
            "analyse_risques.txt", "planning_previsionnel.txt",
            "specifications_fonctionnelles.txt", "rapport_avancement.txt",
            "procedure_support.txt", "brief_campagne.txt",
            "resultats_enquete.txt", "inventaire_actions.txt",
            "proposition_commerciale.txt", "proces_verbal.txt",
        ]
        for index, filename in enumerate(document_names):
            task = tasks[index * 6]
            content = (
                f"Document de démonstration associé à : {task.title}\n\n"
                "Ce fichier contient une synthèse réaliste destinée à illustrer "
                "la gestion documentaire de la plateforme."
            ).encode("utf-8")
            attachment = TaskAttachment(
                task=task,
                uploaded_by=task.assigned_to,
                filename=filename,
                file_size=len(content),
                mime_type="text/plain",
            )
            attachment.file.save(filename, ContentFile(content), save=False)
            attachment.save()

    def _create_notifications(self, tasks, users):
        notifications = []
        for user in users:
            user_tasks = [task for task in tasks if task.assigned_to_id == user.id]
            for task in random.sample(user_tasks, min(len(user_tasks), 3)):
                notifications.append(Notification(
                    recipient=user,
                    type=NotificationType.NEW_ASSIGNMENT,
                    title="Nouvelle activité assignée",
                    message=f"Vous êtes responsable de « {task.title} ».",
                    task=task,
                    is_read=random.random() < 0.55,
                ))
            if user_tasks:
                task = random.choice(user_tasks)
                notifications.append(Notification(
                    recipient=user,
                    type=NotificationType.COMMENT,
                    title="Nouveau commentaire",
                    message=f"Un nouveau commentaire a été ajouté à « {task.title} ».",
                    task=task,
                    is_read=random.random() < 0.4,
                ))
        Notification.objects.bulk_create(notifications)

    def _attach_demo_account(self, company):
        demo = User.objects.filter(email="demo@local.test").first()
        if not demo:
            demo = User.objects.create_user(
                email="demo@local.test",
                username="demo",
                first_name="Demo",
                last_name="Owner",
                company=company,
                role=Role.OWNER,
            )
        demo.company = company
        demo.role = Role.OWNER
        demo.is_active = True
        demo.set_password(self.PASSWORD)
        demo.save()

        from domain.companies.models import SubscriptionPlan, CompanySubscription
        plan = SubscriptionPlan.objects.filter(code='business').first()
        if plan and not hasattr(company, 'subscription'):
            CompanySubscription.objects.create(
                company=company,
                plan=plan,
                status='active',
            )

        self._ensure_platform_superadmin(company, demo)

    def _ensure_platform_superadmin(self, company, demo):
        superadmin, _ = User.objects.get_or_create(
            email="admin@platform.test",
            defaults={
                "first_name": "Super",
                "last_name": "Admin",
                "role": Role.OWNER,
                "is_superuser": True,
                "is_staff": True,
                "is_active": True,
            }
        )
        superadmin.set_password(self.PASSWORD)
        superadmin.is_superuser = True
        superadmin.is_staff = True
        superadmin.is_active = True
        superadmin.save()

        recent_tasks = list(
            Task.objects.filter(company=company)
            .select_related("assigned_to")
            .order_by("-created_at")[:35]
        )
        notification_types = [
            NotificationType.NEW_ASSIGNMENT,
            NotificationType.COMMENT,
            NotificationType.TASK_COMPLETED,
            NotificationType.REPORT_APPROVED,
        ]
        for index, task in enumerate(recent_tasks[:30]):
            Notification.objects.get_or_create(
                recipient=demo,
                task=task,
                title=f"Suivi de direction · {task.title}",
                defaults={
                    "type": notification_types[index % len(notification_types)],
                    "message": (
                        f"Une mise à jour importante est disponible pour "
                        f"« {task.title} » ({task.team.name})."
                    ),
                    "is_read": index > 11,
                },
            )

        existing_attachments = TaskAttachment.objects.filter(
            task__company=company
        ).count()
        attachments_to_add = max(0, 50 - existing_attachments)
        for index, task in enumerate(recent_tasks[:attachments_to_add]):
            filename = f"document_suivi_direction_{index + 1:02d}.txt"
            if TaskAttachment.objects.filter(task=task, filename=filename).exists():
                continue
            content = (
                f"Fiche de suivi de direction\n\nActivité : {task.title}\n"
                f"Équipe : {task.team.name}\nResponsable : "
                f"{task.assigned_to.full_name}\n\n"
                "Ce document de démonstration présente les décisions, risques "
                "et prochaines étapes liés à cette activité."
            ).encode("utf-8")
            attachment = TaskAttachment(
                task=task,
                uploaded_by=demo,
                filename=filename,
                file_size=len(content),
                mime_type="text/plain",
            )
            attachment.file.save(filename, ContentFile(content), save=False)
            attachment.save()
