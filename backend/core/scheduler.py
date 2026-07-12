import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from django.utils import timezone
from core.models import Task, Notification
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from core.serializers import NotificationSerializer

def check_task_deadlines():
    now = timezone.now()
    two_hours_from_now = now + datetime.timedelta(hours=2)
    
    # Get all tasks that are not 'Done' and have both date and time
    tasks = Task.objects.exclude(column__name='Done').filter(due_date__isnull=False, due_time__isnull=False)
    channel_layer = get_channel_layer()

    for task in tasks:
        # Combine date and time to aware datetime
        due_datetime = timezone.make_aware(datetime.datetime.combine(task.due_date, task.due_time))
        
        # Overdue check
        if due_datetime < now and not task.overdue_sent:
            task.overdue_sent = True
            task.save(update_fields=['overdue_sent'])
            
            for assignee in task.assignees.all():
                notif = Notification.objects.create(
                    recipient=assignee,
                    verb=f"Overdue: '{task.title}' is past its deadline.",
                    task=task,
                    board=task.board
                )
                async_to_sync(channel_layer.group_send)(
                    f"user_{assignee.id}",
                    {
                        "type": "notify",
                        "payload": NotificationSerializer(notif).data
                    }
                )
        
        # Reminder check (<= 2 hours away, and not overdue)
        elif now <= due_datetime <= two_hours_from_now and not task.reminder_sent:
            task.reminder_sent = True
            task.save(update_fields=['reminder_sent'])
            
            for assignee in task.assignees.all():
                notif = Notification.objects.create(
                    recipient=assignee,
                    verb=f"Reminder: '{task.title}' is due in less than 2 hours.",
                    task=task,
                    board=task.board
                )
                async_to_sync(channel_layer.group_send)(
                    f"user_{assignee.id}",
                    {
                        "type": "notify",
                        "payload": NotificationSerializer(notif).data
                    }
                )

def start_scheduler():
    scheduler = BackgroundScheduler(timezone=timezone.get_current_timezone())
    # Run every minute
    scheduler.add_job(check_task_deadlines, 'interval', minutes=1)
    scheduler.start()
