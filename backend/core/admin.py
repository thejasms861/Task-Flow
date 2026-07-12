from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Board, BoardMember, Column, Label, Task, SubTask, ActivityLog

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'display_name', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        ('Extra Info', {'fields': ('display_name', 'avatar_url')}),
    )

class BoardMemberInline(admin.TabularInline):
    model = BoardMember
    extra = 1

@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at')
    inlines = [BoardMemberInline]
    search_fields = ('name', 'owner__username')

@admin.register(Column)
class ColumnAdmin(admin.ModelAdmin):
    list_display = ('name', 'board', 'order', 'wip_limit')
    list_filter = ('board',)
    ordering = ('board', 'order')

@admin.register(Label)
class LabelAdmin(admin.ModelAdmin):
    list_display = ('name', 'board', 'color')
    list_filter = ('board',)

class SubTaskInline(admin.TabularInline):
    model = SubTask
    extra = 1

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'board', 'column', 'priority', 'order', 'created_by')
    list_filter = ('board', 'column', 'priority')
    search_fields = ('title', 'description')
    inlines = [SubTaskInline]
    filter_horizontal = ('assignees', 'labels')

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('verb', 'actor', 'board', 'task', 'created_at')
    list_filter = ('board', 'created_at')
    search_fields = ('verb', 'actor__username')

