from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from common.storage_cleanup import (
    delete_replaced_file,
    delete_stored_file,
    remember_stored_file,
)

from .models import User


@receiver(pre_save, sender=User)
def remember_previous_avatar(sender, instance, update_fields=None, **kwargs):
    if update_fields is not None and 'avatar' not in update_fields:
        instance._previous_avatar = None
        return
    remember_stored_file(instance, 'avatar', '_previous_avatar')


@receiver(post_save, sender=User)
def delete_replaced_avatar(sender, instance, update_fields=None, **kwargs):
    if update_fields is not None and 'avatar' not in update_fields:
        return
    delete_replaced_file(instance, 'avatar', '_previous_avatar')


@receiver(post_delete, sender=User)
def delete_user_avatar(sender, instance, **kwargs):
    delete_stored_file(instance.avatar)
