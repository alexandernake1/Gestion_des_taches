from domain.companies.models import Company


def get_requested_company(request):
    """
    Get the company context for the current request.
    For normal users, this is always their assigned company.
    For superusers, they can pass an 'X-Company-ID' header to impersonate a company.
    If a superuser does not pass this header, returns None (meaning 'all companies' or 'no specific company').
    """
    user = request.user
    if not user or not user.is_authenticated:
        return None
        
    if user.is_superuser:
        company_id = request.headers.get('X-Company-ID')
        if company_id:
            try:
                return Company.objects.get(id=company_id)
            except (Company.DoesNotExist, ValueError):
                return None
        # Superuser not impersonating anyone
        return None
        
    return user.company


def get_company_or_error(request):
    """Return the active company context or raise a DRF validation error."""
    from rest_framework.exceptions import PermissionDenied

    company = get_requested_company(request)
    if company is None:
        raise PermissionDenied(
            "Select an enterprise before accessing this workspace."
        )
    return company
