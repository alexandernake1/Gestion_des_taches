from datetime import timedelta
import pytest
from django.core.management import call_command
from django.utils import timezone

from domain.companies.models import Company, PlatformAuditLog
from domain.tasks.models import Project, Task, TaskAttachment, TaskReport
from domain.teams.models import Team
from domain.users.models import Role, User, UserAuditLog
from domain.users.tasks import purge_audit_logs_task


@pytest.mark.django_db
class TestLot2DataSecurityAndRetention:
    """Validation suite for Lot 2: strict multi-tenant isolation and 365-day audit retention."""

    def test_cross_tenant_task_creation_injection_is_rejected(self, api_client, tenant_data):
        api_client.force_authenticate(tenant_data['manager_a'])

        # 1. Foreign project
        foreign_project = Project.objects.create(
            name='Projet B',
            company=tenant_data['company_b'],
            manager=tenant_data['manager_b'],
        )
        res_proj = api_client.post(
            '/api/tasks/',
            {
                'title': 'Tâche projet externe',
                'project': foreign_project.id,
            },
            format='json',
        )
        assert res_proj.status_code == 400
        assert 'project' in res_proj.data or 'detail' in res_proj.data

        # 2. Foreign team
        foreign_team = Team.objects.create(
            name='Équipe B',
            company=tenant_data['company_b'],
            leader=tenant_data['employee_b'],
        )
        res_team = api_client.post(
            '/api/tasks/',
            {
                'title': 'Tâche équipe externe',
                'team': foreign_team.id,
            },
            format='json',
        )
        assert res_team.status_code == 400
        assert 'team' in res_team.data or 'detail' in res_team.data

        # 3. Foreign assigned_to
        res_assign = api_client.post(
            '/api/tasks/',
            {
                'title': 'Tâche assigné externe',
                'assigned_to': tenant_data['employee_b'].id,
            },
            format='json',
        )
        assert res_assign.status_code == 400
        assert 'assigned_to' in res_assign.data or 'detail' in res_assign.data

        # 4. Foreign parent task
        foreign_task = Task.objects.create(
            title='Tâche B',
            company=tenant_data['company_b'],
            creator=tenant_data['manager_b'],
        )
        res_parent = api_client.post(
            '/api/tasks/',
            {
                'title': 'Sous-tâche cross-tenant',
                'parent': foreign_task.id,
            },
            format='json',
        )
        assert res_parent.status_code == 400
        assert 'parent' in res_parent.data or 'detail' in res_parent.data

        # 5. Foreign dependency
        res_dep = api_client.post(
            '/api/tasks/',
            {
                'title': 'Tâche avec dépendance externe',
                'dependencies': [foreign_task.id],
            },
            format='json',
        )
        assert res_dep.status_code == 400
        assert 'dependencies' in res_dep.data or 'detail' in res_dep.data

    def test_cross_tenant_project_team_injection_is_rejected(self, api_client, tenant_data):
        api_client.force_authenticate(tenant_data['manager_a'])
        foreign_team = Team.objects.create(
            name='Équipe transverse illicite',
            company=tenant_data['company_b'],
            leader=tenant_data['employee_b'],
        )

        response = api_client.post(
            '/api/projects/',
            {
                'name': 'Projet infiltré',
                'teams': [foreign_team.id],
            },
            format='json',
        )
        assert response.status_code == 400
        assert 'teams' in response.data or 'detail' in response.data

    def test_cross_tenant_attachment_and_report_access_is_blocked(self, api_client, tenant_data):
        foreign_task = Task.objects.create(
            title='Tâche sensible B',
            company=tenant_data['company_b'],
            creator=tenant_data['manager_b'],
        )

        api_client.force_authenticate(tenant_data['manager_a'])

        # Attachment list on foreign task -> 404
        res_att_list = api_client.get(f'/api/tasks/{foreign_task.id}/attachments/')
        assert res_att_list.status_code == 404

        # Report list on foreign task -> 404
        res_rep_list = api_client.get(f'/api/tasks/{foreign_task.id}/reports/')
        assert res_rep_list.status_code == 404

        # Comment on foreign task -> 404
        res_comment = api_client.post(
            f'/api/tasks/{foreign_task.id}/comments/',
            {'content': 'Tentative espionnage'},
            format='json',
        )
        assert res_comment.status_code == 404

    def test_user_audit_log_structure_isolation(self, api_client, tenant_data):
        log_a = UserAuditLog.objects.create(
            company=tenant_data['company_a'],
            actor=tenant_data['owner_a'],
            target=tenant_data['employee_a'],
            action='account_created',
            details={'note': 'Structure A log'},
        )
        log_b = UserAuditLog.objects.create(
            company=tenant_data['company_b'],
            actor=tenant_data['owner_b'],
            target=tenant_data['employee_b'],
            action='account_created',
            details={'note': 'Structure B log'},
        )

        # Authenticated as Administrator of Structure A
        api_client.force_authenticate(tenant_data['owner_a'])
        response_a = api_client.get('/api/auth/users/audit-log/')
        assert response_a.status_code == 200
        log_ids_a = [item['id'] for item in response_a.data.get('results', response_a.data)]
        assert log_a.id in log_ids_a
        assert log_b.id not in log_ids_a

        # Authenticated as Administrator of Structure B
        api_client.force_authenticate(tenant_data['owner_b'])
        response_b = api_client.get('/api/auth/users/audit-log/')
        assert response_b.status_code == 200
        log_ids_b = [item['id'] for item in response_b.data.get('results', response_b.data)]
        assert log_b.id in log_ids_b
        assert log_a.id not in log_ids_b

    def test_purge_audit_logs_retention_and_dry_run(self, tenant_data):
        now = timezone.now()
        old_date = now - timedelta(days=400)
        recent_date = now - timedelta(days=30)

        # Create old UserAuditLog and PlatformAuditLog
        old_user_log = UserAuditLog.objects.create(
            company=tenant_data['company_a'],
            actor=tenant_data['owner_a'],
            target=tenant_data['employee_a'],
            action='account_created',
        )
        UserAuditLog.objects.filter(id=old_user_log.id).update(created_at=old_date)

        old_platform_log = PlatformAuditLog.objects.create(
            company=tenant_data['company_a'],
            actor=tenant_data['owner_a'],
            category='company',
            action='company_created',
        )
        PlatformAuditLog.objects.filter(id=old_platform_log.id).update(created_at=old_date)

        # Create recent UserAuditLog and PlatformAuditLog
        recent_user_log = UserAuditLog.objects.create(
            company=tenant_data['company_a'],
            actor=tenant_data['owner_a'],
            target=tenant_data['employee_a'],
            action='account_updated',
        )
        UserAuditLog.objects.filter(id=recent_user_log.id).update(created_at=recent_date)

        recent_platform_log = PlatformAuditLog.objects.create(
            company=tenant_data['company_a'],
            actor=tenant_data['owner_a'],
            category='company',
            action='plan_upgraded',
        )
        PlatformAuditLog.objects.filter(id=recent_platform_log.id).update(created_at=recent_date)

        # 1. Test dry-run: nothing is deleted
        call_command('purge_audit_logs', days=365, dry_run=True)
        assert UserAuditLog.objects.filter(id=old_user_log.id).exists()
        assert PlatformAuditLog.objects.filter(id=old_platform_log.id).exists()
        assert UserAuditLog.objects.filter(id=recent_user_log.id).exists()
        assert PlatformAuditLog.objects.filter(id=recent_platform_log.id).exists()

        # 2. Test actual purge: old deleted, recent kept
        call_command('purge_audit_logs', days=365)
        assert not UserAuditLog.objects.filter(id=old_user_log.id).exists()
        assert not PlatformAuditLog.objects.filter(id=old_platform_log.id).exists()
        assert UserAuditLog.objects.filter(id=recent_user_log.id).exists()
        assert PlatformAuditLog.objects.filter(id=recent_platform_log.id).exists()

    def test_purge_audit_logs_celery_task(self):
        result = purge_audit_logs_task(days=365)
        assert '365' in result
