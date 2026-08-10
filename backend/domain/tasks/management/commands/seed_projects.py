"""
Management command: seed_projects

Creates realistic demo projects with linked tasks for the current company.
Usage: python manage.py seed_projects --company-id <id>
       python manage.py seed_projects  (uses the first company found)
"""
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from domain.companies.models import Company
from domain.users.models import User
from domain.tasks.models import (
    Project, Task, ProjectStatus, ProjectHealth,
    Status, Priority
)


class Command(BaseCommand):
    help = 'Seed demo projects and linked tasks for a company'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company-id',
            type=int,
            help='ID of the company to seed data into (default: first company found)',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all existing projects for the company before seeding',
        )

    def handle(self, *args, **options):
        company_id = options.get('company_id')
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
            except Company.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'Company with id={company_id} not found.'))
                return
        else:
            company = Company.objects.filter(is_active=True).first()
            if not company:
                self.stderr.write(self.style.ERROR('No active company found. Please create one first.'))
                return

        self.stdout.write(f'Seeding demo data for company: {self.style.SUCCESS(company.name)} (id={company.id})')

        # Get company users
        users = list(User.objects.filter(company=company, is_active=True))
        if not users:
            self.stderr.write(self.style.ERROR('No active users in this company. Please create users first.'))
            return

        owner = next((u for u in users if u.role == 'owner'), users[0])
        managers = [u for u in users if u.role in ('owner', 'manager')]
        employees = [u for u in users if u.role == 'employee'] or users

        if options.get('clear'):
            deleted, _ = Project.objects.filter(company=company).delete()
            self.stdout.write(f'  Cleared {deleted} existing project(s).')

        today = date.today()

        def pick(lst, i):
            return lst[i % len(lst)]

        with transaction.atomic():
            # ── PROJECT 1: Refonte Site Web ─────────────────────────────────
            p1 = Project.objects.create(
                company=company,
                name='Refonte du Site Web Institutionnel',
                description=(
                    'Modernisation complète du site vitrine de l\'entreprise : '
                    'nouvelle charte graphique, expérience mobile améliorée, '
                    'référencement SEO renforcé et intégration du CRM.'
                ),
                status=ProjectStatus.IN_PROGRESS,
                health=ProjectHealth.ON_TRACK,
                start_date=today - timedelta(days=30),
                due_date=today + timedelta(days=45),
                manager=pick(managers, 0),
                budget_hours=200,
            )
            p1.members.set(users[:min(3, len(users))])

            tasks_p1 = [
                ('Audit UX de l\'existant', Status.COMPLETED, Priority.HIGH, today - timedelta(days=25), today - timedelta(days=15)),
                ('Maquettes Figma — page d\'accueil', Status.COMPLETED, Priority.HIGH, today - timedelta(days=20), today - timedelta(days=5)),
                ('Maquettes Figma — pages secondaires', Status.IN_PROGRESS, Priority.NORMAL, today - timedelta(days=10), today + timedelta(days=10)),
                ('Intégration HTML/CSS responsive', Status.TODO, Priority.NORMAL, today + timedelta(days=5), today + timedelta(days=25)),
                ('Développement backend — CMS', Status.TODO, Priority.NORMAL, today + timedelta(days=10), today + timedelta(days=35)),
                ('Tests d\'accessibilité WCAG', Status.TODO, Priority.LOW, today + timedelta(days=30), today + timedelta(days=40)),
                ('Mise en production', Status.TODO, Priority.URGENT, today + timedelta(days=42), today + timedelta(days=45)),
            ]

            for i, (title, st, prio, start, due) in enumerate(tasks_p1):
                Task.objects.create(
                    company=company,
                    project=p1,
                    title=title,
                    status=st,
                    priority=prio,
                    start_date=start,
                    due_date=due,
                    creator=owner,
                    assigned_to=pick(employees, i),
                    estimated_hours=[8, 12, 16, 24, 30, 6, 4][i],
                )

            self.stdout.write(f'  ✔ Projet 1 créé: "{p1.name}" — {len(tasks_p1)} tâches')

            # ── PROJECT 2: Lancement CRM ────────────────────────────────────
            p2 = Project.objects.create(
                company=company,
                name='Déploiement CRM & Pipeline Ventes',
                description=(
                    'Mise en place d\'un CRM centralisé pour le suivi des prospects, '
                    'des opportunités et des relances automatisées. Formation des équipes commerciales incluse.'
                ),
                status=ProjectStatus.IN_PROGRESS,
                health=ProjectHealth.AT_RISK,
                start_date=today - timedelta(days=60),
                due_date=today + timedelta(days=20),
                manager=pick(managers, 1) if len(managers) > 1 else pick(managers, 0),
                budget_hours=150,
            )
            p2.members.set(users[:min(4, len(users))])

            tasks_p2 = [
                ('Analyse des besoins métier', Status.COMPLETED, Priority.HIGH, today - timedelta(days=55), today - timedelta(days=45)),
                ('Choix de la solution CRM', Status.COMPLETED, Priority.HIGH, today - timedelta(days=45), today - timedelta(days=35)),
                ('Configuration initiale du CRM', Status.COMPLETED, Priority.HIGH, today - timedelta(days=35), today - timedelta(days=20)),
                ('Import et nettoyage des données prospects', Status.IN_PROGRESS, Priority.URGENT, today - timedelta(days=15), today + timedelta(days=5)),
                ('Automatisation des relances email', Status.IN_PROGRESS, Priority.HIGH, today - timedelta(days=10), today + timedelta(days=15)),
                ('Formation des commerciaux', Status.TODO, Priority.NORMAL, today + timedelta(days=10), today + timedelta(days=18)),
                ('Bilan et reporting mensuel', Status.TODO, Priority.LOW, today + timedelta(days=18), today + timedelta(days=20)),
            ]

            for i, (title, st, prio, start, due) in enumerate(tasks_p2):
                Task.objects.create(
                    company=company,
                    project=p2,
                    title=title,
                    status=st,
                    priority=prio,
                    start_date=start,
                    due_date=due,
                    creator=owner,
                    assigned_to=pick(employees, i + 1),
                    estimated_hours=[6, 4, 20, 25, 30, 12, 8][i],
                )

            self.stdout.write(f'  ✔ Projet 2 créé: "{p2.name}" — {len(tasks_p2)} tâches')

            # ── PROJECT 3: Formation Équipes ────────────────────────────────
            p3 = Project.objects.create(
                company=company,
                name='Programme de Formation & Montée en Compétences',
                description=(
                    'Plan de formation annuel pour l\'ensemble des collaborateurs : '
                    'soft skills, outils numériques, sécurité informatique et leadership managérial.'
                ),
                status=ProjectStatus.IN_PROGRESS,
                health=ProjectHealth.ON_TRACK,
                start_date=today - timedelta(days=15),
                due_date=today + timedelta(days=90),
                manager=pick(managers, 0),
                budget_hours=80,
            )
            p3.members.set(users[:min(5, len(users))])

            tasks_p3 = [
                ('Inventaire des besoins en formation', Status.COMPLETED, Priority.NORMAL, today - timedelta(days=15), today - timedelta(days=8)),
                ('Sélection des prestataires de formation', Status.IN_PROGRESS, Priority.NORMAL, today - timedelta(days=5), today + timedelta(days=10)),
                ('Planning des sessions Q3', Status.TODO, Priority.NORMAL, today + timedelta(days=5), today + timedelta(days=20)),
                ('Formation sécurité informatique', Status.TODO, Priority.HIGH, today + timedelta(days=15), today + timedelta(days=30)),
                ('Formation Leadership pour managers', Status.TODO, Priority.NORMAL, today + timedelta(days=30), today + timedelta(days=50)),
                ('Évaluation et bilan de formation', Status.TODO, Priority.LOW, today + timedelta(days=80), today + timedelta(days=90)),
            ]

            for i, (title, st, prio, start, due) in enumerate(tasks_p3):
                Task.objects.create(
                    company=company,
                    project=p3,
                    title=title,
                    status=st,
                    priority=prio,
                    start_date=start,
                    due_date=due,
                    creator=owner,
                    assigned_to=pick(employees, i + 2),
                    estimated_hours=[4, 8, 6, 16, 20, 8][i],
                )

            self.stdout.write(f'  ✔ Projet 3 créé: "{p3.name}" — {len(tasks_p3)} tâches')

            # ── PROJECT 4: Audit Financier ───────────────────────────────────
            p4 = Project.objects.create(
                company=company,
                name='Audit Financier & Conformité Réglementaire',
                description=(
                    'Audit complet des comptes de l\'exercice en cours, '
                    'mise en conformité avec les nouvelles exigences réglementaires '
                    'et préparation des états financiers pour les investisseurs.'
                ),
                status=ProjectStatus.ON_HOLD,
                health=ProjectHealth.OFF_TRACK,
                start_date=today - timedelta(days=45),
                due_date=today + timedelta(days=10),
                manager=pick(managers, 0),
                budget_hours=120,
            )
            p4.members.set(users[:min(3, len(users))])

            tasks_p4 = [
                ('Collecte des données comptables', Status.COMPLETED, Priority.HIGH, today - timedelta(days=45), today - timedelta(days=30)),
                ('Analyse des écarts budgétaires', Status.COMPLETED, Priority.HIGH, today - timedelta(days=30), today - timedelta(days=15)),
                ('Préparation des états financiers provisoires', Status.ON_HOLD, Priority.URGENT, today - timedelta(days=15), today - timedelta(days=5)),
                ('Révision externe par l\'auditeur', Status.TODO, Priority.URGENT, today - timedelta(days=2), today + timedelta(days=5)),
                ('Rapport final et transmission aux actionnaires', Status.TODO, Priority.HIGH, today + timedelta(days=6), today + timedelta(days=10)),
            ]

            for i, (title, st, prio, start, due) in enumerate(tasks_p4):
                Task.objects.create(
                    company=company,
                    project=p4,
                    title=title,
                    status=st,
                    priority=prio,
                    start_date=start,
                    due_date=due,
                    creator=owner,
                    assigned_to=pick(employees, i),
                    estimated_hours=[16, 20, 24, 12, 8][i],
                )

            self.stdout.write(f'  ✔ Projet 4 créé: "{p4.name}" — {len(tasks_p4)} tâches')

            # ── PROJECT 5: Recrutement Q3 ────────────────────────────────────
            p5 = Project.objects.create(
                company=company,
                name='Campagne de Recrutement Q3 — 5 Postes',
                description=(
                    'Recrutement de 5 nouveaux collaborateurs pour les pôles Tech, '
                    'Marketing et Finance avant la fin du troisième trimestre.'
                ),
                status=ProjectStatus.COMPLETED,
                health=ProjectHealth.ON_TRACK,
                start_date=today - timedelta(days=90),
                due_date=today - timedelta(days=5),
                manager=pick(managers, 0),
                budget_hours=60,
            )
            p5.members.set(users[:min(2, len(users))])

            tasks_p5 = [
                ('Définition des fiches de poste', Status.COMPLETED, Priority.HIGH, today - timedelta(days=90), today - timedelta(days=80)),
                ('Publication des offres', Status.COMPLETED, Priority.NORMAL, today - timedelta(days=80), today - timedelta(days=70)),
                ('Tri des candidatures', Status.COMPLETED, Priority.NORMAL, today - timedelta(days=70), today - timedelta(days=50)),
                ('Entretiens de sélection', Status.COMPLETED, Priority.HIGH, today - timedelta(days=50), today - timedelta(days=25)),
                ('Onboarding des nouveaux collaborateurs', Status.COMPLETED, Priority.NORMAL, today - timedelta(days=20), today - timedelta(days=5)),
            ]

            for i, (title, st, prio, start, due) in enumerate(tasks_p5):
                Task.objects.create(
                    company=company,
                    project=p5,
                    title=title,
                    status=st,
                    priority=prio,
                    start_date=start,
                    due_date=due,
                    creator=owner,
                    assigned_to=pick(employees, i),
                    estimated_hours=[6, 4, 10, 20, 16][i],
                )

            self.stdout.write(f'  ✔ Projet 5 créé: "{p5.name}" — {len(tasks_p5)} tâches')

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✅ Données de démonstration créées avec succès!'))
        self.stdout.write(f'   → 5 projets créés avec un total de {sum([len(tasks_p1), len(tasks_p2), len(tasks_p3), len(tasks_p4), len(tasks_p5)])} tâches liées.')
