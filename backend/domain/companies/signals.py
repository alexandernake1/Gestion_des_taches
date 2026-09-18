from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from common.storage_cleanup import (
    delete_replaced_file,
    delete_stored_file,
    remember_stored_file,
)

from .models import Company


@receiver(pre_save, sender=Company)
def remember_previous_logo(sender, instance, update_fields=None, **kwargs):
    if update_fields is not None and 'logo' not in update_fields:
        instance._previous_logo = None
        return
    remember_stored_file(instance, 'logo', '_previous_logo')


@receiver(post_save, sender=Company)
def delete_replaced_logo(sender, instance, update_fields=None, **kwargs):
    if update_fields is not None and 'logo' not in update_fields:
        return
    delete_replaced_file(instance, 'logo', '_previous_logo')


@receiver(post_delete, sender=Company)
def delete_company_logo(sender, instance, **kwargs):
    delete_stored_file(instance.logo)
