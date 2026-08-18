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
                'leader': "Le responsable de l'équipe doit être un membre actif de votre structure."
            })
        valid_member_ids = set(
            User.objects.filter(company=company, id__in=member_ids, is_active=True)
            .values_list('id', flat=True)
        )
        if set(member_ids) and valid_member_ids != set(member_ids):
            raise serializers.ValidationError({
                'member_ids': "Tous les membres de l'équipe doivent être des membres actifs de votre structure."
            })

        effective_members = set(valid_member_ids)
        if leader:
            effective_members.add(leader.id)

        if len(effective_members) < 2:
            raise serializers.ValidationError({
                'member_ids': "Une équipe doit compter au moins deux personnes actives et distinctes, responsable compris."
            })

        name = attrs.get('name', '').strip()
        if not name:
            raise serializers.ValidationError({'name': "Le nom de l'équipe ne peut pas être vide."})
        if Team.objects.filter(
            company=company,
            name__iexact=name,
        ).exists():
            raise serializers.ValidationError({
                'name': "Une équipe avec ce nom existe déjà."
            })
        attrs['name'] = name
        return attrs
    
    def create(self, validated_data):
        member_ids = validated_data.pop('member_ids', [])
        leader = validated_data.get('leader')
        team = Team.objects.create(**validated_data)
        all_members = set(member_ids)
        if leader:
            all_members.add(leader.id)
        if all_members:
            team.members.set(all_members)
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
        is_active = attrs.get('is_active', self.instance.is_active)

        if leader and (leader.company_id != company.id or not leader.is_active):
            raise serializers.ValidationError({
                'leader': "Le responsable de l'équipe doit être un membre actif de votre structure."
            })

        if member_ids is not None:
            valid_member_ids = set(
                User.objects.filter(company=company, id__in=member_ids, is_active=True)
                .values_list('id', flat=True)
            )
            if set(member_ids) and valid_member_ids != set(member_ids):
                raise serializers.ValidationError({
                    'member_ids': "Tous les membres de l'équipe doivent être des membres actifs de votre structure."
                })

            if is_active:
                effective_members = set(valid_member_ids)
                if leader:
                    effective_members.add(leader.id if isinstance(leader, User) else leader)
                if len(effective_members) < 2:
                    raise serializers.ValidationError({
                        'member_ids': "Une équipe active doit compter au moins deux personnes actives et distinctes, responsable compris."
                    })
        elif 'leader' in attrs and is_active:
            existing_members = set(self.instance.members.filter(is_active=True).values_list('id', flat=True))
            if leader:
                existing_members.add(leader.id if isinstance(leader, User) else leader)
            if len(existing_members) < 2:
                raise serializers.ValidationError({
                    'leader': "Une équipe active doit compter au moins deux personnes actives et distinctes, responsable compris."
                })

        if 'name' in attrs:
            name = attrs['name'].strip()
            if not name:
                raise serializers.ValidationError({'name': "Le nom de l'équipe ne peut pas être vide."})
            if Team.objects.filter(
                company=company,
                name__iexact=name,
            ).exclude(pk=self.instance.pk).exists():
                raise serializers.ValidationError({
                    'name': "Une équipe avec ce nom existe déjà."
                })
            attrs['name'] = name
        return attrs
    
    def update(self, instance, validated_data):
        member_ids = validated_data.pop('member_ids', None)
        leader = validated_data.get('leader', instance.leader)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        if member_ids is not None:
            all_members = set(member_ids)
            if leader:
                all_members.add(leader.id if isinstance(leader, User) else leader)
            instance.members.set(all_members)
        
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
