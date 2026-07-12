from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_auth import (
    RegisterView, LoginView, CustomTokenRefreshView, MeView, ChangePasswordView,
    VerifyEmailView, ResendVerificationView, SocialConfigView, SocialLoginView,
    ForgotPasswordView, ResetPasswordView, UploadAvatarView
)
from .views_boards import (
    BoardViewSet, ColumnViewSet, BoardMemberRemoveView, BoardActivityListView, LabelViewSet,
    ShareEnableView, ShareDisableView, PublicBoardView,
)
from .views_tasks import BoardTaskViewSet, TaskDetailViewSet, SubTaskViewSet
from .views_sprints import SprintViewSet
from .views_notifications import NotificationViewSet

router = DefaultRouter()
router.register('boards', BoardViewSet, basename='board')

columns_list = ColumnViewSet.as_view({'get': 'list', 'post': 'create'})
columns_detail = ColumnViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy'})
columns_reorder = ColumnViewSet.as_view({'post': 'reorder'})

board_tasks_list = BoardTaskViewSet.as_view({'get': 'list', 'post': 'create'})
board_tasks_search = BoardTaskViewSet.as_view({'get': 'search'})

labels_list = LabelViewSet.as_view({'get': 'list', 'post': 'create'})
labels_detail = LabelViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'})

tasks_detail = TaskDetailViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy'})
tasks_move = TaskDetailViewSet.as_view({'post': 'move'})

subtasks_list = SubTaskViewSet.as_view({'get': 'list', 'post': 'create'})
subtasks_detail = SubTaskViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy'})

sprints_list = SprintViewSet.as_view({'get': 'list', 'post': 'create'})
sprints_detail = SprintViewSet.as_view({'patch': 'partial_update'})
sprints_start = SprintViewSet.as_view({'post': 'start'})
sprints_complete = SprintViewSet.as_view({'post': 'complete'})

notifications_list = NotificationViewSet.as_view({'get': 'list'})
notifications_read = NotificationViewSet.as_view({'patch': 'mark_read'})
notifications_read_all = NotificationViewSet.as_view({'post': 'mark_all_read'})
notifications_unread_count = NotificationViewSet.as_view({'get': 'unread_count'})

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', LoginView.as_view(), name='auth_login'),
    path('auth/verify-email/', VerifyEmailView.as_view(), name='auth_verify_email'),
    path('auth/resend-verification/', ResendVerificationView.as_view(), name='auth_resend_verification'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='auth_forgot_password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='auth_reset_password'),
    path('auth/social/config/', SocialConfigView.as_view(), name='auth_social_config'),
    path('auth/social/login/', SocialLoginView.as_view(), name='auth_social_login'),
    path('auth/token/refresh/', CustomTokenRefreshView.as_view(), name='auth_token_refresh'),
    path('auth/me/', MeView.as_view(), name='auth_me'),
    path('auth/me/avatar/', UploadAvatarView.as_view(), name='upload_avatar'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
    
    path('notifications/', notifications_list, name='notifications_list'),
    path('notifications/read-all/', notifications_read_all, name='notifications_read_all'),
    path('notifications/unread-count/', notifications_unread_count, name='notifications_unread_count'),
    path('notifications/<uuid:pk>/read/', notifications_read, name='notifications_read'),
    
    path('boards/<uuid:board_id>/members/<int:user_id>/', BoardMemberRemoveView.as_view(), name='board_member_remove'),
    path('boards/<uuid:board_id>/activities/', BoardActivityListView.as_view(), name='board_activities'),
    path('boards/<uuid:board_id>/labels/', labels_list, name='board_labels_list'),
    path('boards/<uuid:board_id>/labels/<int:pk>/', labels_detail, name='board_labels_detail'),
    
    path('boards/<uuid:board_id>/columns/', columns_list, name='board_columns_list'),
    path('boards/<uuid:board_id>/columns/reorder/', columns_reorder, name='board_columns_reorder'),
    path('boards/<uuid:board_id>/columns/<uuid:pk>/', columns_detail, name='board_columns_detail'),
    
    path('boards/<uuid:board_id>/sprints/', sprints_list, name='board_sprints_list'),
    path('boards/<uuid:board_id>/sprints/<uuid:pk>/', sprints_detail, name='board_sprints_detail'),
    path('boards/<uuid:board_id>/sprints/<uuid:pk>/start/', sprints_start, name='board_sprints_start'),
    path('boards/<uuid:board_id>/sprints/<uuid:pk>/complete/', sprints_complete, name='board_sprints_complete'),

    
    path('boards/<uuid:board_id>/tasks/', board_tasks_list, name='board_tasks_list'),
    path('boards/<uuid:board_id>/search/', board_tasks_search, name='board_tasks_search'),
    path('boards/<uuid:board_id>/share/enable/', ShareEnableView.as_view(), name='board_share_enable'),
    path('boards/<uuid:board_id>/share/disable/', ShareDisableView.as_view(), name='board_share_disable'),
    path('share/<str:token>/', PublicBoardView.as_view(), name='public_board'),
    path('tasks/<uuid:pk>/', tasks_detail, name='tasks_detail'),
    path('tasks/<uuid:pk>/move/', tasks_move, name='tasks_move'),
    path('tasks/<uuid:pk>/assign-sprint/', TaskDetailViewSet.as_view({'post': 'assign_sprint'}), name='tasks_assign_sprint'),
    path('tasks/<uuid:task_id>/subtasks/', subtasks_list, name='subtasks_list'),
    path('tasks/<uuid:task_id>/subtasks/<int:pk>/', subtasks_detail, name='subtasks_detail'),

    path('', include(router.urls)),
]
