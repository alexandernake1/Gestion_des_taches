import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from domain.companies.models import Company, WorkspaceType
from domain.teams.models import Team
from domain.users.models import Role

User = get_user_model()


@pytest.mark.django_db
class TestLot1Corrections:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.client = APIClient()
        self.company = Company.objects.create(
            name="Société Test",
            slug="societe-test",
            workspace_type=WorkspaceType.COMPANY,
        )
        self.other_company = Company.objects.create(
            name="Autre Entreprise",
            slug="autre-entreprise",
            workspace_type=WorkspaceType.COMPANY,
        )
        self.owner = User.objects.create_user(
            email="owner@test.com",
            password="Password123!",
            first_name="Admin",
            last_name="Owner",
            role=Role.OWNER,
            company=self.company,
        )
        self.manager = User.objects.create_user(
            email="manager@test.com",
            password="Password123!",
            first_name="Marc",
            last_name="Manager",
            role=Role.MANAGER,
            company=self.company,
        )
        self.employee1 = User.objects.create_user(
            email="employee1@test.com",
            password="Password123!",
            first_name="Alice",
            last_name="Employee",
            role=Role.EMPLOYEE,
            company=self.company,
        )
        self.employee2 = User.objects.create_user(
            email="employee2@test.com",
            password="Password123!",
            first_name="Bob",
            last_name="Employee",
            role=Role.EMPLOYEE,
            company=self.company,
        )
        self.foreign_user = User.objects.create_user(
            email="foreign@other.com",
            password="Password123!",
            first_name="Foreign",
            last_name="User",
            role=Role.MANAGER,
            company=self.other_company,
        )

    # F-07 : last_login update on authentication
    def test_last_login_updated_on_successful_login(self):
        assert self.owner.last_login is None
        response = self.client.post(
            "/api/auth/login/",
            {"email": "owner@test.com", "password": "Password123!"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        self.owner.refresh_from_db()
        assert self.owner.last_login is not None
        assert response.data["user"]["last_login"] is not None

    # F-09 : Automatic slug generation with collision resolution
    def test_automatic_company_slug_generation_and_collision_resolution(self):
        from domain.users.serializers import generate_unique_company_slug

        slug1 = generate_unique_company_slug("Entreprise Innovante")
        assert slug1 == "entreprise-innovante"

        Company.objects.create(
            name="Entreprise Innovante",
            slug="entreprise-innovante",
            workspace_type=WorkspaceType.COMPANY,
        )

        slug2 = generate_unique_company_slug("Entreprise Innovante")
        assert slug2 == "entreprise-innovante-2"

        Company.objects.create(
            name="Entreprise Innovante 2",
            slug="entreprise-innovante-2",
            workspace_type=WorkspaceType.COMPANY,
        )

        slug3 = generate_unique_company_slug("Entreprise Innovante")
        assert slug3 == "entreprise-innovante-3"

    # F-03 : Team >= 2 persons validation
    def test_team_creation_requires_at_least_two_persons(self):
        self.client.force_authenticate(user=self.owner)

        # 1 person (leader only, no members) -> REJECTED
        response = self.client.post(
            "/api/teams/",
            {
                "name": "Équipe Solo",
                "leader": self.manager.id,
                "member_ids": [],
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "au moins deux personnes" in str(response.data).lower()

        # 2 persons (leader + 1 member) -> ACCEPTED
        response = self.client.post(
            "/api/teams/",
            {
                "name": "Équipe Duo",
                "leader": self.manager.id,
                "member_ids": [self.employee1.id],
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        team = Team.objects.get(id=response.data["id"])
        assert team.leader_id == self.manager.id
        # Leader is also present in members
        assert self.manager in team.members.all()
        assert self.employee1 in team.members.all()
        assert team.members.count() == 2

    def test_team_remove_member_protection_for_active_teams(self):
        self.client.force_authenticate(user=self.owner)
        team = Team.objects.create(
            name="Équipe Minimale",
            company=self.company,
            leader=self.manager,
            is_active=True,
        )
        team.members.set([self.manager, self.employee1])

        # Trying to remove employee1 would leave only 1 person in active team
        response = self.client.post(
            f"/api/teams/{team.id}/members/{self.employee1.id}/remove/",
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "au moins deux personnes" in str(response.data).lower()

        # Adding another member makes team 3 persons
        team.members.add(self.employee2)
        response = self.client.post(
            f"/api/teams/{team.id}/members/{self.employee1.id}/remove/",
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert team.members.count() == 2

    # F-04 : Role & Workspace labels in backend choices
    def test_role_and_workspace_choices_labels(self):
        role_choices_dict = dict(Role.choices)
        assert role_choices_dict[Role.OWNER] == "Administrateur de la structure"
        assert role_choices_dict[Role.MANAGER] == "Manager"
        assert role_choices_dict[Role.EMPLOYEE] == "Collaborateur"

        workspace_choices_dict = dict(WorkspaceType.choices)
        assert workspace_choices_dict[WorkspaceType.COMPANY] == "Structure"

    def test_team_validation_messages_are_in_french(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            "/api/teams/",
            {
                "name": "Équipe Invalide",
                "leader": self.foreign_user.id,
                "member_ids": [self.employee1.id],
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "doit être un membre actif de votre structure" in str(response.data).lower()
