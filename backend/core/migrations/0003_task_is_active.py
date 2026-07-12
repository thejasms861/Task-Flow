from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_board_is_active'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
    ]
