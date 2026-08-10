from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from domain.companies.models import Company


class EmailUserManager(UserManager):
    """Create users with email as the public identifier."""

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('The email address is required.')

        email = self.normalize_email(email)
        # AbstractUser still stores a unique username internally. Keeping it
        # aligned with the normalized email makes registrations deterministic.
        extra_fields.setdefault('username', email)
        return super()._create_user(
            username=extra_fields.pop('username'),
            email=email,
            password=password,
            **extra_fields,
        )

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', Role.OWNER)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self._create_user(email, password, **extra_fields)


class Role(models.TextChoices):
    OWNER = 'owner', 'Owner'
    MANAGER = 'manager', 'Manager'
    EMPLOYEE = 'employee', 'Employee'


class User(AbstractUser):
    """Custom user model for the activity tracking platform."""
    
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='members',
        null=True,
        blank=True
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.EMPLOYEE
    )
    is_active = models.BooleanField(default=True)
    must_change_password = models.BooleanField(default=False)
    weekly_capacity_hours = models.PositiveSmallIntegerField(default=40)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    objects = EmailUserManager()
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['company']),
            models.Index(fields=['role']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['company'],
                condition=models.Q(role=Role.OWNER, is_active=True),
                name='one_active_owner_per_company',
            ),
        ]
    
    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def is_owner(self):
        """True uniquement pour le propriétaire de l'entreprise."""
        return self.role == Role.OWNER

    def is_administrator(self):
        """True pour le propriétaire (et les super-admins via is_superuser).
        Utilisé par IsAdministrator pour les actions d'admin réservées au propriétaire.
        """
        return self.role == Role.OWNER

    def is_manager(self):
        """True pour les managers ET le propriétaire (ils supervisent les tâches/équipes)."""
        return self.role in [Role.OWNER, Role.MANAGER]


class UserAuditLog(models.Model):
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='administrative_actions',
    )
    target = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_history',
    )
    action = models.CharField(max_length=50)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_audit_logs'
        ordering = ['-created_at']
