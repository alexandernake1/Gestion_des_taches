from django.db.models.signals import post_delete
from django.dispatch import receiver

from common.storage_cleanup import delete_stored_file

from .models import TaskAttachment


@receiver(post_delete, sender=TaskAttachment)
def delete_task_attachment_file(sender, instance, **kwargs):
    delete_stored_file(instance.file)
