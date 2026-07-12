from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Board, Sprint, ActivityLog
from .serializers import SprintSerializer
from .permissions import IsBoardMember
from .utils import send_board_event

class SprintViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsBoardMember]
    serializer_class = SprintSerializer

    def get_board(self):
        board = get_object_or_404(Board, id=self.kwargs['board_id'], is_active=True)
        self.check_object_permissions(self.request, board)
        return board

    def get_queryset(self):
        board = self.get_board()
        return Sprint.objects.filter(board=board)

    def perform_create(self, serializer):
        board = self.get_board()
        sprint = serializer.save(board=board)
        ActivityLog.objects.create(
            board=board,
            actor=self.request.user,
            verb='created sprint',
            detail={'sprint_name': sprint.name}
        )
        send_board_event(
            board.id,
            'sprint.created',
            SprintSerializer(sprint).data,
            self.request.headers.get('X-Socket-ID')
        )

    def perform_update(self, serializer):
        sprint = serializer.save()
        send_board_event(
            sprint.board.id,
            'sprint.updated',
            SprintSerializer(sprint).data,
            self.request.headers.get('X-Socket-ID')
        )

    @action(detail=True, methods=['post'])
    def start(self, request, board_id=None, pk=None):
        sprint = self.get_object()
        if sprint.status != 'planning':
            return Response({'error': 'Only planning sprints can be started.'}, status=status.HTTP_400_BAD_REQUEST)
        
        sprint.status = 'active'
        sprint.save()
        
        ActivityLog.objects.create(
            board=sprint.board,
            actor=self.request.user,
            verb='started sprint',
            detail={'sprint_name': sprint.name}
        )
        send_board_event(
            sprint.board.id,
            'sprint.updated',
            SprintSerializer(sprint).data,
            self.request.headers.get('X-Socket-ID')
        )
        return Response(SprintSerializer(sprint).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, board_id=None, pk=None):
        sprint = self.get_object()
        if sprint.status != 'active':
            return Response({'error': 'Only active sprints can be completed.'}, status=status.HTTP_400_BAD_REQUEST)
            
        sprint.status = 'completed'
        sprint.save()
        
        ActivityLog.objects.create(
            board=sprint.board,
            actor=self.request.user,
            verb='completed sprint',
            detail={'sprint_name': sprint.name}
        )
        send_board_event(
            sprint.board.id,
            'sprint.updated',
            SprintSerializer(sprint).data,
            self.request.headers.get('X-Socket-ID')
        )
        return Response(SprintSerializer(sprint).data)
