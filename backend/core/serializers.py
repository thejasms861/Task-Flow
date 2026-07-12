from rest_framework import serializers
from .models import User
from .utils import is_disposable_email

class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'display_name', 'avatar_url', 'avatar_color']

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return obj.avatar_url

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    display_name = serializers.CharField(required=True, max_length=50)

    class Meta:
        model = User
        fields = ['email', 'password', 'display_name']

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        if is_disposable_email(email):
            raise serializers.ValidationError("Disposable or fake email addresses are not allowed.")
        return email

    def create(self, validated_data):
        email = validated_data['email']
        # Provide a default username based on email explicitly
        username = email.split('@')[0]
        # Ensure primitive uniqueness if necessary
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=validated_data['password'],
            display_name=validated_data['display_name']
        )
        return user

from .models import Board, BoardMember, Column, ActivityLog, SubTask, Label, Task, Sprint, Notification

class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.display_name', read_only=True)
    actor_avatar = serializers.URLField(source='actor.avatar_url', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'actor', 'actor_name', 'actor_avatar', 'verb', 'task', 'task_title', 'board', 'is_read', 'created_at']


class SprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sprint
        fields = ['id', 'board', 'name', 'goal', 'start_date', 'end_date', 'status', 'created_at']
        read_only_fields = ['board']


class ActivityLogSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)
    actor_name = serializers.CharField(source='actor.display_name', read_only=True)
    task_title = serializers.SerializerMethodField()
    detail = serializers.SerializerMethodField()   # resolved – never raw UUIDs
    detail_display = serializers.SerializerMethodField()

    def _resolve_column_name(self, col_id: str) -> str:
        """Return the Column name for a given id string, or the id itself as fallback."""
        if not col_id:
            return col_id
        try:
            from .models import Column
            return Column.objects.get(id=col_id).name
        except Exception:
            return str(col_id)

    def get_task_title(self, obj):
        return obj.task.title if obj.task else None

    def get_detail(self, obj):
        """Return a copy of detail with from/to column UUIDs resolved to names."""
        detail = dict(obj.detail or {})

        if 'from_column' in detail and not detail.get('from_column_name'):
            detail['from_column_name'] = self._resolve_column_name(detail['from_column'])

        if 'to_column' in detail and not detail.get('to_column_name'):
            detail['to_column_name'] = self._resolve_column_name(detail['to_column'])

        return detail

    def get_detail_display(self, obj):
        """Convenience single-string summary for move actions."""
        detail = obj.detail or {}
        if 'to_column' in detail:
            return detail.get('to_column_name') or self._resolve_column_name(detail['to_column'])
        return None

    class Meta:
        model = ActivityLog
        fields = ['id', 'actor', 'actor_name', 'verb', 'task_title', 'task', 'detail', 'detail_display', 'created_at']

class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = ['id', 'title', 'is_done', 'order']
        read_only_fields = ['order']

class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ['id', 'name', 'color']

class TaskListSerializer(serializers.ModelSerializer):
    assignees = UserSerializer(many=True, read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    subtask_count = serializers.SerializerMethodField()
    subtask_done_count = serializers.SerializerMethodField()
    column_name = serializers.CharField(source='column.name', read_only=True)

    class Meta:
        model = Task
        fields = ['id', 'title', 'column', 'column_name', 'sprint', 'priority', 'assignees', 'labels', 'due_date', 'due_time', 'order', 'subtask_count', 'subtask_done_count', 'attachment']

    def get_subtask_count(self, obj):
        return getattr(obj, 'subtask_count', obj.subtasks.count())

    def get_subtask_done_count(self, obj):
        return getattr(obj, 'subtask_done_count', obj.subtasks.filter(is_done=True).count())

class TaskDetailSerializer(serializers.ModelSerializer):
    assignees = UserSerializer(many=True, read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    subtasks = SubTaskSerializer(many=True, read_only=True)
    activities = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'column', 'board', 'sprint', 'priority', 'assignees', 'labels', 'order', 'due_date', 'due_time', 'subtasks', 'activities', 'created_by', 'is_active', 'attachment', 'created_at', 'updated_at']

    def get_activities(self, obj):
        logs = ActivityLog.objects.filter(task=obj).order_by('-created_at')[:10]
        return ActivityLogSerializer(logs, many=True).data

class TaskCreateUpdateSerializer(serializers.ModelSerializer):
    assignees = serializers.PrimaryKeyRelatedField(many=True, queryset=User.objects.all(), required=False)
    labels = serializers.PrimaryKeyRelatedField(many=True, queryset=Label.objects.all(), required=False)
    
    class Meta:
        model = Task
        fields = ['title', 'column', 'sprint', 'priority', 'description', 'due_date', 'due_time', 'assignees', 'labels', 'attachment']

class ColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = Column
        fields = ['id', 'name', 'order', 'wip_limit', 'color']

class BoardMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = BoardMember
        fields = ['user', 'role']

class BoardSerializer(serializers.ModelSerializer):
    columns = ColumnSerializer(many=True, read_only=True)
    members = serializers.SerializerMethodField()
    owner = UserSerializer(read_only=True)
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Board
        fields = [
            'id', 'name', 'owner', 'members', 'columns', 'task_count',
            'share_token', 'share_enabled', 'share_expires_at',
            'created_at', 'updated_at',
        ]

    def get_members(self, obj):
        memberships = BoardMember.objects.filter(board=obj).select_related('user')
        return BoardMemberSerializer(memberships, many=True).data

    def get_task_count(self, obj):
        return Task.objects.filter(board=obj, is_active=True).count()

class InviteMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=BoardMember.ROLE_CHOICES, default='member')
