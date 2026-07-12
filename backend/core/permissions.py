from rest_framework import permissions
from .models import Board, Column

class IsBoardMember(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Determine board
        board = obj if isinstance(obj, Board) else getattr(obj, 'board', None)
        if not board and hasattr(obj, 'task'):
            board = getattr(obj.task, 'board', None)
            
        if not board:
            return False
            
        return request.user == board.owner or board.members.filter(id=request.user.id).exists()

class IsBoardAdminOrOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        board = obj if isinstance(obj, Board) else getattr(obj, 'board', None)
        if not board:
            return False
            
        if request.user == board.owner:
            return True
            
        membership = board.boardmember_set.filter(user=request.user).first()
        return membership and membership.role == 'admin'

class IsBoardOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        board = obj if isinstance(obj, Board) else getattr(obj, 'board', None)
        return board and board.owner == request.user

# Base permission applied globally via checking if write request
class BoardAccessPolicy(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        board = obj if isinstance(obj, Board) else getattr(obj, 'board', None)
        if not board:
            return False

        is_member = request.user == board.owner or board.members.filter(id=request.user.id).exists()
        if not is_member:
            return False

        # Read-only are open to members
        if request.method in permissions.SAFE_METHODS:
            return True

        if request.method == 'DELETE':
            # Soft Delete board requires owner. 
            # Sub-resources deletion (e.g. Columns) requires Admin/Owner
            if isinstance(obj, Board):
                return board.owner == request.user
            else:
                membership = board.boardmember_set.filter(user=request.user).first()
                return request.user == board.owner or (membership and membership.role == 'admin')

        # POST / PATCH / PUT requires admin or owner
        membership = board.boardmember_set.filter(user=request.user).first()
        return request.user == board.owner or (membership and membership.role == 'admin')
