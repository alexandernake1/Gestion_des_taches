import logging
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_user_invitation_email(user, temp_password: str) -> bool:
    """
    Sends an onboarding invitation email to a newly created user account.
    Includes login credentials and password change directive.
    """
    try:
        company_name = user.company.name if user.company else "Gestion des Tâches"
        login_url = f"{getattr(settings, 'APP_FRONTEND_URL', 'http://localhost:5173')}/login"
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Gestion des Tâches <noreply@gestiontaches.com>')
        subject = f"[Gestion des Tâches] Bienvenue chez {company_name} - Vos identifiants de connexion"

        plain_message = (
            f"Bonjour {user.first_name},\n\n"
            f"Un compte utilisateur vous a été créé au sein de l'organisation « {company_name} » sur la plateforme Gestion des Tâches.\n\n"
            f"Voici vos identifiants de connexion :\n"
            f"  - Adresse e-mail : {user.email}\n"
            f"  - Mot de passe temporaire : {temp_password}\n"
            f"  - Lien de connexion : {login_url}\n\n"
            f"CONSIGNE DE SÉCURITÉ OBLIGATOIRE :\n"
            f"Pour des raisons de sécurité, vous serez invité à modifier obligatoirement ce mot de passe temporaire dès votre première connexion.\n\n"
            f"Cordialement,\n"
            f"L'équipe {company_name}"
        )

        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
            .header {{ text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; }}
            .brand {{ font-size: 20px; font-weight: 800; color: #4f46e5; }}
            .badge {{ display: inline-block; background: #e0e7ff; color: #3730a3; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 9999px; margin-top: 6px; }}
            .credentials-box {{ background: #f1f5f9; border-left: 4px solid #4f46e5; padding: 16px 20px; border-radius: 8px; margin: 20px 0; font-family: monospace; font-size: 14px; line-height: 1.6; }}
            .alert-box {{ background: #fff7ed; border-left: 4px solid #f97316; padding: 16px 20px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #9a3412; }}
            .btn {{ display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; margin-top: 16px; text-align: center; }}
            .footer {{ margin-top: 32px; pt-16; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="brand">Gestion des Tâches</div>
              <div class="badge">{company_name}</div>
            </div>
            <h2>Bienvenue, {user.first_name} !</h2>
            <p>Un compte utilisateur vient de vous être créé pour accéder à la plateforme de gestion d'équipe de <strong>{company_name}</strong>.</p>

            <div class="credentials-box">
              <strong>Identifiants de connexion :</strong><br>
              • Email : <strong>{user.email}</strong><br>
              • Mot de passe temporaire : <span style="background:#e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">{temp_password}</span>
            </div>

            <div class="alert-box">
              🔒 <strong>Consigne de sécurité importante :</strong><br>
              Ce mot de passe est temporaire. Lors de votre première connexion, l'application vous demandera immédiatement de définir votre mot de passe personnel définitif.
            </div>

            <div style="text-align: center;">
              <a href="{login_url}" class="btn" target="_blank">Se connecter à mon compte</a>
            </div>

            <div class="footer">
              <p>Cet e-mail automatique a été envoyé par la plateforme Gestion des Tâches pour l'organisation {company_name}.</p>
            </div>
          </div>
        </body>
        </html>
        """

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Invitation email successfully sent to {user.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send invitation email to {user.email}: {e}")
        return False


def send_password_reset_email(user, temp_password: str) -> bool:
    """
    Sends a password reset email to a user account with their new temporary password.
    """
    try:
        company_name = user.company.name if user.company else "Gestion des Tâches"
        login_url = f"{getattr(settings, 'APP_FRONTEND_URL', 'http://localhost:5173')}/login"
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Gestion des Tâches <noreply@gestiontaches.com>')
        subject = f"[Gestion des Tâches] Réinitialisation de votre mot de passe"

        plain_message = (
            f"Bonjour {user.first_name},\n\n"
            f"Votre mot de passe a été réinitialisé par un responsable d'organisation ({company_name}).\n\n"
            f"Voici votre nouveau mot de passe temporaire :\n"
            f"  - Mot de passe temporaire : {temp_password}\n"
            f"  - Lien de connexion : {login_url}\n\n"
            f"Vous devez le modifier dès votre prochaine connexion.\n\n"
            f"Cordialement,\n"
            f"L'équipe {company_name}"
        )

        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
            .credentials-box {{ background: #f1f5f9; border-left: 4px solid #f97316; padding: 16px 20px; border-radius: 8px; margin: 20px 0; font-family: monospace; font-size: 14px; line-height: 1.6; }}
            .btn {{ display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; margin-top: 16px; text-align: center; }}
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Réinitialisation de mot de passe</h2>
            <p>Bonjour {user.first_name}, votre mot de passe pour le compte <strong>{user.email}</strong> a été réinitialisé.</p>
            <div class="credentials-box">
              Nouveau mot de passe temporaire : <strong>{temp_password}</strong>
            </div>
            <p>Vous serez invité à le modifier dès votre connexion.</p>
            <div style="text-align: center;">
              <a href="{login_url}" class="btn" target="_blank">Se connecter</a>
            </div>
          </div>
        </body>
        </html>
        """

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Password reset email successfully sent to {user.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {e}")
        return False
