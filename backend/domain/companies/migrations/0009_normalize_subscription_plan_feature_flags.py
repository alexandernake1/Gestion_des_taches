from django.db import migrations


FEATURE_ALIASES = {
    'has_calendar_view': ('calendar_view',),
    'has_kanban_view': ('kanban_view',),
    'has_timeline_view': ('timeline_view',),
    'has_reports': ('reports',),
    'has_exports': ('advanced_export', 'exports'),
}


def normalize_feature_flags(apps, schema_editor):
    SubscriptionPlan = apps.get_model('companies', 'SubscriptionPlan')
    for plan in SubscriptionPlan.objects.all().iterator():
        flags = dict(plan.feature_flags or {})
        changed = False
        for canonical_key, legacy_keys in FEATURE_ALIASES.items():
            has_legacy_key = any(key in flags for key in legacy_keys)
            if canonical_key not in flags and has_legacy_key:
                flags[canonical_key] = any(flags.get(key) is True for key in legacy_keys)
                changed = True
            for legacy_key in legacy_keys:
                if legacy_key in flags:
                    del flags[legacy_key]
                    changed = True
        if changed:
            plan.feature_flags = flags
            plan.save(update_fields=['feature_flags'])


class Migration(migrations.Migration):
    dependencies = [
        ('companies', '0008_add_teams_override_to_subscription'),
    ]

    operations = [
        migrations.RunPython(normalize_feature_flags, migrations.RunPython.noop),
    ]
