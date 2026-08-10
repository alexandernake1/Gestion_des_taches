import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from domain.users.models import User

admin = User.objects.filter(email='admin@platform.test').first()
if admin:
    print(f"Superadmin company_id: {admin.company_id}")
    print(f"Superadmin is_superuser: {admin.is_superuser}")
else:
    print("Superadmin not found")

demo = User.objects.filter(email='demo@local.test').first()
if demo:
    print(f"Demo company_id: {demo.company_id}")
else:
    print("Demo not found")

