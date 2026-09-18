from django.db import transaction


def remember_stored_file(instance, field_name, attribute_name):
    """Remember the persisted file name before a model update."""

    if not instance.pk:
        setattr(instance, attribute_name, None)
        return
    previous = (
        type(instance)._default_manager
        .filter(pk=instance.pk)
        .only(field_name)
        .first()
    )
    stored_file = getattr(previous, field_name, None) if previous else None
    setattr(instance, attribute_name, stored_file if stored_file and stored_file.name else None)


def delete_stored_file(stored_file):
    """Delete a file only after the surrounding database transaction commits."""

    if not stored_file or not stored_file.name:
        return
    storage = stored_file.storage
    name = stored_file.name
    transaction.on_commit(lambda: storage.delete(name))


def delete_replaced_file(instance, field_name, attribute_name):
    previous = getattr(instance, attribute_name, None)
    current = getattr(instance, field_name, None)
    if previous and previous.name != getattr(current, 'name', None):
        delete_stored_file(previous)
