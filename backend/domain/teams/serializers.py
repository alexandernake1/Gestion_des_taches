from rest_framework import serializers
from .models import Team
from domain.users.models import User
from common.utils import get_requested_company


class TeamSerializer(serializers.ModelSerializer):
    """Serializer for Team model."""
    
    leader_name = serializers.CharField(source='leader.full_name', read_only=True)
    member_count = serializers.SerializerMethodField()
    member_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Team
        fields = [
            'id', 'name', 'description', 'company', 'leader', 'leader_name',
            'members', 'member_details', 'member_count', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'company']
    
    def get_member_count(self, obj) -> int:
        return obj.members.count()

    def get_member_details(self, obj) -> list[dict]:
        return [
            {
                'id': member.id,
                'email': member.email,
                'full_name': member.full_name,
                'role': member.role,
                'is_active': member.is_active,
            }
            for member in obj.members.all()
        ]


class TeamCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a team."""
    
    member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Team
        fields = ['name', 'description', 'leader', 'member_ids']

    def validate(self, attrs):
        company = get_requested_company(self.context['request'])
        leader = attrs.get('leader')
        member_ids = attrs.get('member_ids', [])
        if leader and (leader.company_id != company.id or not leader.is_active):
            raise serializers.ValidationError({
                'leader': 'The team leader must be an active member of your enterprise.'
            })
        valid_member_ids = set(
            User.objects.filter(company=company, id__in=member_ids, is_active=True)
            .values_list('id', flat=True)
        )
        if valid_member_ids != set(member_ids):
            raise serializers.ValidationError({
                'member_ids': 'All team members must be active members of your enterprise.'
            })
        if Team.objects.filter(
            company=company,
            name__iexact=attrs['name'].strip(),
        ).exists():
            raise serializers.ValidationError({
                'name': 'A team with this name already exists.'
            })
        attrs['name'] = attrs['name'].strip()
        return attrs
    
    def create(self, validated_data):
        member_ids = validated_data.pop('member_ids', [])
        team = Team.objects.create(**validated_data)
        if member_ids:
            team.members.set(member_ids)
        return team


class TeamUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a team."""
    
    member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Team
        fields = ['name', 'description', 'leader', 'is_active', 'member_ids']

    def validate(self, attrs):
        company = get_requested_company(self.context['request'])
        leader = attrs.get('leader', self.instance.leader)
        member_ids = attrs.get('member_ids')
        if leader and (leader.company_id != company.id or not leader.is_active):
            raise serializers.ValidationError({
                'leader': 'The team leader must be an active member of your enterprise.'
            })
        if member_ids is not None:
            valid_member_ids = set(
                User.objects.filter(company=company, id__in=member_ids, is_active=True)
                .values_list('id', flat=True)
            )
            if valid_member_ids != set(member_ids):
                raise serializers.ValidationError({
                    'member_ids': 'All team members must be active members of your enterprise.'
                })
        if 'name' in attrs:
            name = attrs['name'].strip()
            if Team.objects.filter(
                company=company,
                name__iexact=name,
            ).exclude(pk=self.instance.pk).exists():
                raise serializers.ValidationError({
                    'name': 'A team with this name already exists.'
                })
            attrs['name'] = name
        return attrs
    
    def update(self, instance, validated_data):
        member_ids = validated_data.pop('member_ids', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        if member_ids is not None:
            instance.members.set(member_ids)
        
        return instance


class TeamListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for team lists."""
    
    leader_name = serializers.CharField(source='leader.full_name', read_only=True)
    member_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Team
        fields = ['id', 'name', 'leader', 'leader_name', 'member_count', 'is_active']
    
    def get_member_count(self, obj) -> int:
        return obj.members.count()
