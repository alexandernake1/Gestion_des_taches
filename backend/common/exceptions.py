from collections.abc import Mapping, Sequence

from rest_framework.exceptions import ErrorDetail
from rest_framework.views import exception_handler as drf_exception_handler


DEFAULT_ERROR_MESSAGE = "Une erreur est survenue. Veuillez réessayer."


def _message_list(value):
    if isinstance(value, (str, ErrorDetail)):
        return [str(value)]
    if isinstance(value, Mapping):
        messages = []
        for nested in value.values():
            messages.extend(_message_list(nested))
        return messages
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
        messages = []
        for nested in value:
            messages.extend(_message_list(nested))
        return messages
    return []


def _field_errors(data):
    if not isinstance(data, Mapping):
        return {}

    fields = {}
    for field, value in data.items():
        if field in {'detail', 'message', 'code', 'fields'}:
            continue
        messages = _message_list(value)
        if messages:
            fields[str(field)] = messages
    return fields


def _error_code(exc):
    try:
        codes = exc.get_codes()
    except AttributeError:
        return 'api_error'

    if isinstance(codes, str):
        return codes
    return 'validation_error'


def api_exception_handler(exc, context):
    """Add a stable, backward-compatible error envelope to DRF responses."""

    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    original = response.data
    messages = _message_list(original)
    message = messages[0] if messages else DEFAULT_ERROR_MESSAGE
    fields = _field_errors(original)

    if isinstance(original, Mapping):
        payload = dict(original)
    else:
        payload = {'detail': original}

    payload.update({
        'code': _error_code(exc),
        'message': message,
        'fields': fields,
    })
    response.data = payload
    return response
