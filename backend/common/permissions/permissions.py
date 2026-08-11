import logging

from rest_framework import permissions

from domain.companies.models import CompanySubscription
from domain.users.models import Role
from common.utils import get_requested_company


logger = logging.getLogger(__name__)


def get_object_company(obj):
    """Return the company owning an object, including nested task resources."""
    if hasattr(obj, 'company'):
        return obj.company
    if hasattr(obj, 'task') and obj.task:
        return obj.task.company
    return None


class IsSuperUser(permissions.BasePermission):
    """Permission check for platform super-administrator."""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_superuser
        )


class IsOwner(permissions.BasePermission):
    """Permission check for company owner."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return request.user.is_owner()


class IsAdministrator(permissions.BasePermission):
    """Permission check for company administrator (or owner)."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return request.user.is_administrator()


class IsManagerOrAdministrator(permissions.BasePermission):
    """Permission check for manager, administrator, or owner."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return request.user.is_manager()


class IsCompanyMember(permissions.BasePermission):
    """Permission check for company membership."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return request.user.company is not None
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        company = get_object_company(obj)
        return company is not None and company == request.user.company


class IsOwnerOrCompanyManager(permissions.BasePermission):
    """Permission check for owner or company manager."""
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.is_superuser:
            return True
        
        # Check if user is the creator/owner
        if hasattr(obj, 'creator') and obj.creator == request.user:
            return True
        
        if hasattr(obj, 'author') and obj.author == request.user:
            return True
        
        if hasattr(obj, 'uploaded_by') and obj.uploaded_by == request.user:
            return True
        
        # Check if user is a manager in the same company
        if request.user.is_manager():
            return get_object_company(obj) == request.user.company
        
        return False


class IsTaskCreatorOrAssigneeOrManager(permissions.BasePermission):
    """Permission check for task access."""
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.is_superuser:
            return True
        
        task = obj.task if hasattr(obj, 'task') else obj

        # Managers can manage every task in their company.
        if request.user.is_manager() and task.company == request.user.company:
            return True

        # The creator of a task always has full access to it.
        if task.creator == request.user:
            return True

        # A directly assigned user can read the task.
        # They can also update it (e.g., change status) but not delete it.
        if task.assigned_to == request.user:
            if request.method in permissions.SAFE_METHODS or request.method in ['PUT', 'PATCH']:
                return True

        # A member of the team assigned to the task can read it.
        # Only the team leader can update it (unless directly assigned).
        if task.team is not None:
            is_member = task.team.members.filter(pk=request.user.pk).exists()
            is_leader = task.team.leader == request.user
            
            if is_member or is_leader:
                if request.method in permissions.SAFE_METHODS:
                    return True
                if request.method in ('PUT', 'PATCH') and is_leader:
                    return True

        return False


class IsSameCompany(permissions.BasePermission):
    """Ensure user can only access data from their company."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return request.user.company is not None
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        company = get_object_company(obj)
        return company is not None and company == request.user.company


class IsCompanyOperational(permissions.BasePermission):
    """Allow reads but reject writes for inactive or blocked companies."""

    message = "L'espace de travail de votre entreprise n'autorise pas les modifications."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_superuser:
            return get_requested_company(request) is not None

        company = request.user.company
        if company is None or not company.is_active:
            self.message = "Votre entreprise a été désactivée."
            return False

        try:
            subscription = company.subscription
            from domain.companies.services import synchronize_subscription_status
            subscription = synchronize_subscription_status(subscription)
        except CompanySubscription.DoesNotExist:
            # Legacy companies can predate the subscription module. Keep them
            # operational until an explicit subscription record is attached.
            return True
        except Exception:
            logger.exception(
                "Unable to verify company subscription",
                extra={'company_id': company.pk},
            )
            self.message = (
                "Impossible de vérifier l'abonnement de votre entreprise. "
                "Veuillez réessayer dans quelques instants."
            )
            return False

        if subscription.status in {'suspended', 'cancelled'}:
            self.message = (
                "L'abonnement de votre entreprise n'autorise pas les modifications."
            )
            return False
        return True
