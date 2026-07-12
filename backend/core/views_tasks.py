from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Max, F, Q
from django.utils import timezone
from .models import Board, Task, SubTask, ActivityLog, Column, Notification
from .serializers import TaskListSerializer, TaskDetailSerializer, TaskCreateUpdateSerializer, SubTaskSerializer
from .utils import send_board_event
from .permissions import IsBoardMember, IsBoardAdminOrOwner, IsBoardOwner

class BoardTaskViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsBoardMember]

    def get_board(self):
        board = get_object_or_404(Board, id=self.kwargs['board_id'], is_active=True)
        self.check_object_permissions(self.request, board)
        return board

    def get_queryset(self):
        board = self.get_board()
        qs = Task.objects.filter(board=board, is_active=True).prefetch_related('assignees', 'labels', 'subtasks')
        
        # filters
        assignee = self.request.query_params.get('assignee')
        priority = self.request.query_params.get('priority')
        label = self.request.query_params.get('label')
        
        if assignee:
            qs = qs.filter(assignees__id=assignee)
        if priority:
            qs = qs.filter(priority=priority)
        if label:
            qs = qs.filter(labels__id=label)
        
        sprint = self.request.query_params.get('sprint')
        if sprint == 'null':
            qs = qs.filter(sprint__isnull=True)
        elif sprint:
            qs = qs.filter(sprint__id=sprint)
            
        due = self.request.query_params.get('due')
        if due == 'overdue':
            qs = qs.filter(due_date__lt=timezone.now().date(), due_date__isnull=False)
        elif due == 'today':
            qs = qs.filter(due_date=timezone.now().date())
            
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return TaskCreateUpdateSerializer
        return TaskListSerializer

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def search(self, request, board_id=None):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response([])
            
        board = self.get_board()
        qs = Task.objects.filter(
            Q(title__icontains=q) | Q(description__icontains=q),
            board=board,
            is_active=True
        ).prefetch_related('assignees', 'labels', 'subtasks')[:20]
        
        serializer = TaskListSerializer(qs, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        board = self.get_board()
        column = serializer.validated_data['column']
        
        # max order logic
        max_order = Task.objects.filter(column=column).aggregate(Max('order'))['order__max']
        order = 0 if max_order is None else max_order + 1
        
        task = serializer.save(board=board, order=order, created_by=self.request.user)
        
        ActivityLog.objects.create(
            board=board,
            task=task,
            actor=self.request.user,
            verb='created task'
        )
        
        send_board_event(
            board.id, 
            'task.created', 
            TaskListSerializer(task).data, 
            self.request.headers.get('X-Socket-ID')
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        task = serializer.instance
        return Response(TaskListSerializer(task).data, status=status.HTTP_201_CREATED)


class TaskDetailViewSet(mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsBoardMember]
    queryset = Task.objects.filter(is_active=True)

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return TaskCreateUpdateSerializer
        return TaskDetailSerializer

    def get_object(self):
        obj = super().get_object()
        self.check_object_permissions(self.request, obj.board)
        return obj

    def perform_update(self, serializer):
        task = self.get_object()
        old_column = task.column
        old_priority = task.priority
        old_assignees = set(task.assignees.values_list('id', flat=True))
        
        updated_task = serializer.save()
        
        new_assignees = set(updated_task.assignees.values_list('id', flat=True))
        added_assignees = new_assignees - old_assignees
        for user_id in added_assignees:
            if str(user_id) != str(self.request.user.id):
                Notification.objects.create(
                    recipient_id=user_id,
                    actor=self.request.user,
                    verb='assigned you to',
                    task=updated_task,
                    board=updated_task.board
                )
        
        if updated_task.column != old_column:
            ActivityLog.objects.create(
                board=updated_task.board,
                task=updated_task,
                actor=self.request.user,
                verb='moved task',
                detail={
                    'from_column': str(old_column.id),
                    'from_column_name': old_column.name,
                    'to_column': str(updated_task.column.id),
                    'to_column_name': updated_task.column.name,
                }
            )
            if updated_task.column.name.lower() == 'done' and updated_task.created_by and updated_task.created_by != self.request.user:
                Notification.objects.create(
                    recipient=updated_task.created_by,
                    actor=self.request.user,
                    verb='moved to Done',
                    task=updated_task,
                    board=updated_task.board
                )
        if updated_task.priority != old_priority:
            ActivityLog.objects.create(
                board=updated_task.board,
                task=updated_task,
                actor=self.request.user,
                verb='changed priority'
            )
        
        # Determine event payload
        changed_fields = {}
        if updated_task.column != old_column:
            changed_fields['column'] = str(updated_task.column.id)
        if updated_task.priority != old_priority:
            changed_fields['priority'] = updated_task.priority
            
        send_board_event(
            updated_task.board.id, 
            'task.updated', 
            {'task_id': str(updated_task.id), 'changed_fields': changed_fields}, 
            self.request.headers.get('X-Socket-ID')
        )

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        task = self.get_object()
        return Response(TaskDetailSerializer(task).data)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
        send_board_event(
            instance.board.id, 
            'task.deleted', 
            {'task_id': str(instance.id)}, 
            self.request.headers.get('X-Socket-ID')
        )

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        task = self.get_object()
        column_id = request.data.get('column_id')
        new_order = request.data.get('order')
        
        if column_id is None or new_order is None:
            return Response('column_id and order are required', status=status.HTTP_400_BAD_REQUEST)
            
        new_col = get_object_or_404(Column, id=column_id, board=task.board)
        new_order = int(new_order)
        
        with transaction.atomic():
            old_col = task.column
            old_order = task.order
            
            if old_col == new_col:
                if old_order < new_order:
                    # moving down
                    Task.objects.filter(column=new_col, order__gt=old_order, order__lte=new_order).update(order=F('order') - 1)
                elif old_order > new_order:
                    # moving up
                    Task.objects.filter(column=new_col, order__gte=new_order, order__lt=old_order).update(order=F('order') + 1)
            else:
                # Displace items in new column
                Task.objects.filter(column=new_col, order__gte=new_order).update(order=F('order') + 1)
                # Cleanup old column
                Task.objects.filter(column=old_col, order__gt=old_order).update(order=F('order') - 1)
                
            task.column = new_col
            task.order = new_order
            task.save()
            
            if old_col != new_col:
                ActivityLog.objects.create(
                    board=task.board,
                    task=task,
                    actor=self.request.user,
                    verb='moved task',
                    detail={
                        'from_column': str(old_col.id),
                        'from_column_name': old_col.name,
                        'to_column': str(new_col.id),
                        'to_column_name': new_col.name,
                    }
                )
                if new_col.name.lower() == 'done' and task.created_by and task.created_by != self.request.user:
                    Notification.objects.create(
                        recipient=task.created_by,
                        actor=self.request.user,
                        verb='moved to Done',
                        task=task,
                        board=task.board
                    )
                
        send_board_event(
            task.board.id, 
            'task.updated', 
            {'task_id': str(task.id)}, 
            self.request.headers.get('X-Socket-ID')
        )
        return Response(TaskListSerializer(task).data)

    @action(detail=True, methods=['post'], url_path='assign-sprint')
    def assign_sprint(self, request, pk=None):
        task = self.get_object()
        sprint_id = request.data.get('sprint_id')
        if sprint_id is None:
            task.sprint = None
        else:
            from .models import Sprint
            sprint = get_object_or_404(Sprint, id=sprint_id, board=task.board)
            task.sprint = sprint
        task.save()
        send_board_event(
            task.board.id,
            'task.updated',
            {'task_id': str(task.id), 'changed_fields': {'sprint': sprint_id}},
            self.request.headers.get('X-Socket-ID')
        )
        return Response(TaskListSerializer(task).data)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser], url_path='upload-guideline')
    def upload_guideline(self, request, pk=None):
        task = self.get_object()
        if 'file' not in request.FILES:
            return Response({'detail': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        if not file.name.lower().endswith('.pdf'):
            return Response({'detail': 'Only PDF files are allowed'}, status=status.HTTP_400_BAD_REQUEST)

        task.attachment = file
        task.save()

        # Update activity log
        ActivityLog.objects.create(
            board=task.board,
            task=task,
            actor=self.request.user,
            verb='attached a guideline PDF'
        )

        send_board_event(
            task.board.id,
            'task.updated',
            {'task_id': str(task.id), 'changed_fields': {'attachment': True}},
            self.request.headers.get('X-Socket-ID')
        )
        return Response(TaskDetailSerializer(task).data)



class SubTaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsBoardMember]
    serializer_class = SubTaskSerializer

    def get_task(self):
        task = get_object_or_404(Task, id=self.kwargs['task_id'], is_active=True)
        self.check_object_permissions(self.request, task.board)
        return task

    def get_queryset(self):
        return SubTask.objects.filter(task=self.get_task())

    def perform_create(self, serializer):
        task = self.get_task()
        max_order = SubTask.objects.filter(task=task).aggregate(Max('order'))['order__max']
        order = 0 if max_order is None else max_order + 1
        serializer.save(task=task, order=order)
        send_board_event(
            task.board.id, 
            'task.updated', 
            {'task_id': str(task.id)}, 
            self.request.headers.get('X-Socket-ID')
        )

    def perform_update(self, serializer):
        serializer.save()
        task = self.get_task()
        send_board_event(
            task.board.id, 
            'task.updated', 
            {'task_id': str(task.id)}, 
            self.request.headers.get('X-Socket-ID')
        )

    def perform_destroy(self, instance):
        board_id = instance.task.board.id
        task_id = str(instance.task.id)
        super().perform_destroy(instance)
        send_board_event(
            board_id, 
            'task.updated', 
            {'task_id': task_id}, 
            self.request.headers.get('X-Socket-ID')
        )
