from django.db import models
from django.db.models.functions import Lower
from domain.companies.models import Company
from domain.users.models import User


class Team(models.Model):
    """Team model for organizing users within a company."""
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='teams'
    )
    leader = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='led_teams',
        null=True,
        blank=True
    )
    members = models.ManyToManyField(
        User,
        related_name='teams',
        blank=True
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'teams'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company']),
            models.Index(fields=['leader']),
            models.Index(fields=['is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                Lower('name'),
                'company',
                name='unique_team_name_per_company_ci',
            ),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.company.name})"
