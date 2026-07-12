from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_notification'),
    ]

    operations = [
        migrations.AddField(
            model_name='board',
            name='share_token',
            field=models.CharField(blank=True, max_length=64, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='board',
            name='share_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='board',
            name='share_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
