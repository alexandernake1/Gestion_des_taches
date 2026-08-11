from types import SimpleNamespace

from django.utils import translation
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from common.exceptions import api_exception_handler
from common.permissions.permissions import IsCompanyOperational


def test_exception_handler_adds_stable_french_error_envelope():
    response = api_exception_handler(
        ValidationError({'email': ['Ce champ est obligatoire.']}),
        {},
    )

    assert response.status_code == 400
    assert response.data['code'] == 'validation_error'
    assert response.data['message'] == 'Ce champ est obligatoire.'
    assert response.data['fields'] == {'email': ['Ce champ est obligatoire.']}
    assert response.data['email'] == ['Ce champ est obligatoire.']


def test_drf_default_validation_messages_are_french():
    class PayloadSerializer(serializers.Serializer):
        email = serializers.EmailField()

    with translation.override('fr'):
        serializer = PayloadSerializer(data={})
        assert not serializer.is_valid()

    assert 'obligatoire' in str(serializer.errors['email'][0]).lower()


def test_subscription_check_fails_closed_on_unexpected_error():
    class BrokenCompany:
        pk = 42
        is_active = True

        @property
        def subscription(self):
            raise RuntimeError('database unavailable')

    user = SimpleNamespace(
        is_authenticated=True,
        is_superuser=False,
        company=BrokenCompany(),
    )
    request = SimpleNamespace(user=user, method='POST')

    permission = IsCompanyOperational()

    assert permission.has_permission(request, None) is False
    assert "Impossible de vérifier l'abonnement" in permission.message
