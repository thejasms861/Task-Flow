import secrets
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from .models import Label, ActivityLog, Notification
from .serializers import LabelSerializer, ActivityLogSerializer, TaskListSerializer
from .models import Board, BoardMember, Column, User, Task
from .serializers import BoardSerializer, ColumnSerializer, InviteMemberSerializer
from .permissions import IsBoardMember, IsBoardAdminOrOwner, IsBoardOwner


class BoardViewSet(viewsets.ModelViewSet):
    serializer_class = BoardSerializer
    
    def get_queryset(self):
        user = self.request.user
        if self.action == 'list':
            return Board.objects.filter(is_active=True, members=user).distinct()
        return Board.objects.filter(is_active=True)

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsBoardOwner()]
        elif self.action in ['update', 'partial_update', 'invite']:
            return [IsBoardAdminOrOwner()]
        # Includes list, retrieve, create
        return [IsBoardMember()] 

    def perform_create(self, serializer):
        board = serializer.save(owner=self.request.user)
        BoardMember.objects.create(board=board, user=self.request.user, role='admin')
        Column.objects.create(board=board, name='Todo', order=0, color='#8885a8')
        Column.objects.create(board=board, name='In Progress', order=1, color='#ffd166')
        Column.objects.create(board=board, name='Done', order=2, color='#43e8a0')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        board = serializer.save(owner=self.request.user)
        # Manually trigger perform_create logic
        BoardMember.objects.create(board=board, user=self.request.user, role='admin')
        Column.objects.create(board=board, name='Todo', order=0, color='#8885a8')
        Column.objects.create(board=board, name='In Progress', order=1, color='#ffd166')
        Column.objects.create(board=board, name='Done', order=2, color='#43e8a0')
        return Response(BoardSerializer(board).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(BoardSerializer(self.get_object()).data)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        board = self.get_object()
        serializer = InviteMemberSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            role = serializer.validated_data['role']
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response('User not found', status=status.HTTP_404_NOT_FOUND)
            
            member, created = BoardMember.objects.get_or_create(board=board, user=user, defaults={'role': role})
            if not created:
                member.role = role
                member.save()
            else:
                if user != self.request.user:
                    Notification.objects.create(
                        recipient=user,
                        actor=self.request.user,
                        verb='added you to the board',
                        board=board
                    )
            return Response(BoardSerializer(board).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class BoardMemberRemoveView(APIView):
    permission_classes = [IsBoardAdminOrOwner]

    def delete(self, request, board_id, user_id):
        board = get_object_or_404(Board, id=board_id, is_active=True)
        self.check_object_permissions(request, board)

        if str(board.owner.id) == str(user_id):
            return Response('Cannot remove owner', status=status.HTTP_400_BAD_REQUEST)
            
        member = get_object_or_404(BoardMember, board=board, user_id=user_id)
        member.delete()
        return Response(BoardSerializer(board).data, status=status.HTTP_200_OK)

class ColumnViewSet(viewsets.ModelViewSet):
    serializer_class = ColumnSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'reorder']:
            return [IsBoardAdminOrOwner()]
        return [IsBoardMember()]

    def get_board(self):
        board_id = self.kwargs.get('board_id')
        board = get_object_or_404(Board, id=board_id, is_active=True)
        self.check_object_permissions(self.request, board)
        return board

    def get_queryset(self):
        return Column.objects.filter(board=self.get_board())

    def perform_create(self, serializer):
        serializer.save(board=self.get_board())

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(BoardSerializer(self.get_board()).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(BoardSerializer(self.get_board()).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        board = self.get_board()
        
        fallback_col_id = request.query_params.get('fallback_column_id')
        tasks = Task.objects.filter(column=instance)
        
        if tasks.exists():
            if not fallback_col_id:
                return Response('Column has tasks. Provide fallback_column_id query parameter to reassign.', status=status.HTTP_400_BAD_REQUEST)
            try:
                fallback_column = board.columns.get(id=fallback_col_id)
                tasks.update(column=fallback_column)
            except Column.DoesNotExist:
                return Response('Fallback column not found', status=status.HTTP_404_NOT_FOUND)
                
        self.perform_destroy(instance)
        return Response(BoardSerializer(board).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def reorder(self, request, board_id=None):
        board = self.get_board()
        ordered_ids = request.data.get('ordered_ids', [])
        
        columns = {str(col.id): col for col in board.columns.all()}
        for index, cid in enumerate(ordered_ids):
            cid_str = str(cid)
            if cid_str in columns:
                col = columns[cid_str]
                col.order = index
                col.save()
        from .utils import send_board_event
        send_board_event(board.id, 'column.reordered', {'ordered_ids': ordered_ids}, request.headers.get('X-Socket-ID'))
        return Response(BoardSerializer(board).data)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100

class BoardActivityListView(APIView):
    permission_classes = [IsBoardMember]
    pagination_class = StandardResultsSetPagination

    def get(self, request, board_id):
        board = get_object_or_404(Board, id=board_id, is_active=True)
        self.check_object_permissions(request, board)
        
        queryset = ActivityLog.objects.filter(board=board).select_related('actor', 'task').order_by('-created_at')
        
        # Filter by verb groups
        verb_filter = request.query_params.get('filter')
        if verb_filter == 'created':
            queryset = queryset.filter(verb='created task')
        elif verb_filter == 'moved':
            queryset = queryset.filter(verb='moved task')
        elif verb_filter == 'priority':
            queryset = queryset.filter(verb='changed priority')
        
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = ActivityLogSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = ActivityLogSerializer(queryset, many=True)
        return Response(serializer.data)

class LabelViewSet(viewsets.ModelViewSet):
    serializer_class = LabelSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsBoardAdminOrOwner()]
        return [IsBoardMember()]

    def get_board(self):
        board_id = self.kwargs.get('board_id')
        board = get_object_or_404(Board, id=board_id, is_active=True)
        self.check_object_permissions(self.request, board)
        return board

    def get_queryset(self):
        return Label.objects.filter(board=self.get_board())

    def perform_create(self, serializer):
        serializer.save(board=self.get_board())


# ── Share endpoints ──────────────────────────────────────────────────────────

class ShareEnableView(APIView):
    """POST /api/boards/{board_id}/share/enable/  → generate token, enable sharing"""
    permission_classes = [IsBoardAdminOrOwner]

    def post(self, request, board_id):
        board = get_object_or_404(Board, id=board_id, is_active=True)
        self.check_object_permissions(request, board)

        token = secrets.token_urlsafe(48)[:64]
        board.share_token = token
        board.share_enabled = True
        board.share_expires_at = None
        board.save(update_fields=['share_token', 'share_enabled', 'share_expires_at'])

        share_url = f"http://localhost:5173/share/{token}"
        return Response({'share_url': share_url, 'board': BoardSerializer(board).data})


class ShareDisableView(APIView):
    """POST /api/boards/{board_id}/share/disable/  → revoke token, disable sharing"""
    permission_classes = [IsBoardAdminOrOwner]

    def post(self, request, board_id):
        board = get_object_or_404(Board, id=board_id, is_active=True)
        self.check_object_permissions(request, board)

        board.share_enabled = False
        board.share_token = None
        board.share_expires_at = None
        board.save(update_fields=['share_token', 'share_enabled', 'share_expires_at'])

        return Response({'board': BoardSerializer(board).data})


class PublicBoardView(APIView):
    """GET /api/share/{token}/  → public, no auth, returns board + tasks if enabled"""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, token):
        board = get_object_or_404(Board, share_token=token, is_active=True)

        if not board.share_enabled:
            return Response({'detail': 'This share link is disabled.'}, status=status.HTTP_404_NOT_FOUND)

        if board.share_expires_at and board.share_expires_at < timezone.now():
            return Response({'detail': 'This share link has expired.'}, status=status.HTTP_404_NOT_FOUND)

        tasks = Task.objects.filter(
            board=board, is_active=True
        ).prefetch_related('assignees', 'labels', 'subtasks').select_related('column')

        board_data = BoardSerializer(board).data
        tasks_data = TaskListSerializer(tasks, many=True).data

        return Response({'board': board_data, 'tasks': tasks_data})
