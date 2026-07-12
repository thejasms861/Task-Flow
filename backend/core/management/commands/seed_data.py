"""
Management command to populate TaskFlow with realistic demo data.
Usage: python manage.py seed_data
"""
import uuid
import secrets
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import (
    User, Board, BoardMember, Column, Sprint, Label, Task, SubTask,
    ActivityLog, Notification,
)


class Command(BaseCommand):
    help = 'Seeds the database with demo data for all features'

    def handle(self, *args, **options):
        self.stdout.write('Clearing old demo data...')
        Task.objects.all().delete()
        Column.objects.all().delete()
        Sprint.objects.all().delete()
        Label.objects.all().delete()
        ActivityLog.objects.all().delete()
        Notification.objects.all().delete()
        BoardMember.objects.all().delete()
        Board.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

        # --- Users ---
        self.stdout.write('Creating users...')
        demo = User.objects.create_user(
            username='demo', email='demo@taskflow.io',
            password='demo1234', display_name='Demo User', avatar_color='purple',
        )
        alice = User.objects.create_user(
            username='alice', email='alice@taskflow.io',
            password='demo1234', display_name='Alice Chen', avatar_color='blue',
        )
        bob = User.objects.create_user(
            username='bob', email='bob@taskflow.io',
            password='demo1234', display_name='Bob Patel', avatar_color='green',
        )
        carol = User.objects.create_user(
            username='carol', email='carol@taskflow.io',
            password='demo1234', display_name='Carol Smith', avatar_color='orange',
        )
        users = [demo, alice, bob, carol]

        # ==================== BOARD 1: Web App ====================
        self.stdout.write('Creating Board 1 – Web App Redesign...')
        board1 = Board.objects.create(name='Web App Redesign', owner=demo,
            share_token=secrets.token_urlsafe(32), share_enabled=True,
            share_expires_at=timezone.now() + timedelta(days=30))

        for u, role in [(demo,'admin'),(alice,'member'),(bob,'member'),(carol,'viewer')]:
            BoardMember.objects.create(board=board1, user=u, role=role)

        cols1 = []
        for i, (n, c) in enumerate([('Backlog','#6c63ff'),('To Do','#f59e0b'),
                ('In Progress','#3b82f6'),('Review','#8b5cf6'),('Done','#10b981')]):
            cols1.append(Column.objects.create(board=board1, name=n, order=i, color=c,
                wip_limit=5 if n=='In Progress' else None))

        labels1 = []
        for n, c in [('Bug','#ef4444'),('Feature','#3b82f6'),('UI/UX','#8b5cf6'),
                ('Performance','#f59e0b'),('Documentation','#6b7280')]:
            labels1.append(Label.objects.create(board=board1, name=n, color=c))

        today = date.today()
        sprint1 = Sprint.objects.create(board=board1, name='Sprint 1 – Foundation',
            goal='Set up project structure and auth flow',
            start_date=today - timedelta(days=14), end_date=today - timedelta(days=1),
            status='completed')
        sprint2 = Sprint.objects.create(board=board1, name='Sprint 2 – Core Features',
            goal='Implement dashboard, kanban board, and task management',
            start_date=today, end_date=today + timedelta(days=13), status='active')
        sprint3 = Sprint.objects.create(board=board1, name='Sprint 3 – Polish',
            goal='Analytics, notifications, and final QA',
            start_date=today + timedelta(days=14), end_date=today + timedelta(days=27),
            status='planning')

        tasks_data = [
            # Backlog
            ('Research competitor dashboards','Analyze top 5 competitor UIs','P2',0,0,None,[0],[2,3],today+timedelta(20)),
            ('Write API documentation','Document all REST endpoints','P3',0,1,None,[4],[0],today+timedelta(25)),
            # To Do
            ('Design notification system','Create mockups for in-app notifications','P1',1,0,2,[2],[1],today+timedelta(5)),
            ('Add keyboard shortcuts','Implement accessibility shortcuts','P2',1,1,2,[0],[0,2],today+timedelta(8)),
            ('Set up error monitoring','Integrate Sentry for error tracking','P1',1,2,2,[3],[2],today+timedelta(6)),
            # In Progress
            ('Build analytics dashboard','Charts for task velocity and burndown','P0',2,0,1,[0,3],[0,1],today+timedelta(3)),
            ('Implement drag-and-drop','DnD for task cards between columns','P0',2,1,1,[0],[0,3],today+timedelta(2)),
            ('User avatar upload','Allow users to upload profile pictures','P2',2,2,1,[2],[1],today+timedelta(4)),
            # Review
            ('JWT token refresh','Auto-refresh expired access tokens','P1',3,0,1,[1],[0,1],today-timedelta(1)),
            ('Board sharing via link','Generate shareable read-only links','P1',3,1,1,[0],[0],today-timedelta(2)),
            # Done
            ('Project scaffolding','Set up Django + React + Vite','P0',4,0,0,[0],[0],today-timedelta(12)),
            ('User registration & login','Email/password auth with JWT','P0',4,1,0,[1],[0,1],today-timedelta(10)),
            ('Database schema design','Create all models and migrations','P1',4,2,0,[4],[0],today-timedelta(11)),
            ('Set up CI pipeline','GitHub Actions for linting and tests','P2',4,3,0,[3],[2],today-timedelta(8)),
        ]

        created_tasks1 = []
        for title, desc, pri, col_i, order, spr_i, lbl_is, assign_is, due in tasks_data:
            spr = [None, sprint1, sprint2, sprint3][spr_i] if spr_i is not None else None
            t = Task.objects.create(
                title=title, description=desc, priority=pri,
                column=cols1[col_i], board=board1, sprint=spr,
                order=order, due_date=due, created_by=demo)
            for li in lbl_is:
                t.labels.add(labels1[li])
            for ai in assign_is:
                t.assignees.add(users[ai])
            created_tasks1.append(t)

        # Subtasks for "Build analytics dashboard"
        for i, (st, done) in enumerate([
            ('Design chart components', True),
            ('Implement velocity chart', True),
            ('Implement burndown chart', False),
            ('Add date range filter', False),
            ('Write unit tests', False),
        ]):
            SubTask.objects.create(task=created_tasks1[5], title=st, is_done=done, order=i)

        # Subtasks for "Implement drag-and-drop"
        for i, (st, done) in enumerate([
            ('Set up dnd-kit', True),
            ('Column-to-column drag', True),
            ('Reorder within column', False),
            ('Persist order to backend', False),
        ]):
            SubTask.objects.create(task=created_tasks1[6], title=st, is_done=done, order=i)

        # ==================== BOARD 2: Mobile App ====================
        self.stdout.write('Creating Board 2 – Mobile App MVP...')
        board2 = Board.objects.create(name='Mobile App MVP', owner=alice)
        for u, role in [(alice,'admin'),(demo,'member'),(bob,'member')]:
            BoardMember.objects.create(board=board2, user=u, role=role)

        cols2 = []
        for i, (n, c) in enumerate([('Ideas','#f59e0b'),('Sprint Backlog','#6c63ff'),
                ('Developing','#3b82f6'),('Testing','#8b5cf6'),('Released','#10b981')]):
            cols2.append(Column.objects.create(board=board2, name=n, order=i, color=c))

        labels2 = []
        for n, c in [('iOS','#3b82f6'),('Android','#10b981'),('Backend','#f59e0b'),('Design','#ec4899')]:
            labels2.append(Label.objects.create(board=board2, name=n, color=c))

        m_sprint = Sprint.objects.create(board=board2, name='MVP Sprint 1',
            goal='Core screens and navigation',
            start_date=today - timedelta(days=3), end_date=today + timedelta(days=11),
            status='active')

        mobile_tasks = [
            ('Design onboarding flow','',   'P1',0,0,None,[3],[1],today+timedelta(7)),
            ('Push notification service','', 'P2',0,1,None,[2],[2],today+timedelta(14)),
            ('Home screen UI','',            'P0',1,0,m_sprint,[0,1],[0,1],today+timedelta(5)),
            ('Auth screens','',              'P0',2,0,m_sprint,[0,1],[1],today+timedelta(3)),
            ('REST API integration','',      'P1',2,1,m_sprint,[2],[0],today+timedelta(4)),
            ('Navigation setup','',          'P0',3,0,m_sprint,[0,1],[1],today+timedelta(1)),
            ('App icon & splash screen','',  'P2',4,0,m_sprint,[3],[1],today-timedelta(2)),
        ]
        for title, desc, pri, col_i, order, spr, lbl_is, assign_is, due in mobile_tasks:
            t = Task.objects.create(title=title, description=desc, priority=pri,
                column=cols2[col_i], board=board2, sprint=spr,
                order=order, due_date=due, created_by=alice)
            for li in lbl_is:
                t.labels.add(labels2[li])
            for ai in assign_is:
                t.assignees.add(users[ai])

        # ==================== BOARD 3: Marketing ====================
        self.stdout.write('Creating Board 3 – Marketing Campaign...')
        board3 = Board.objects.create(name='Marketing Campaign Q2', owner=carol)
        for u, role in [(carol,'admin'),(demo,'member'),(alice,'viewer')]:
            BoardMember.objects.create(board=board3, user=u, role=role)

        cols3 = []
        for i, (n, c) in enumerate([('Planned','#f59e0b'),('In Progress','#3b82f6'),
                ('Completed','#10b981')]):
            cols3.append(Column.objects.create(board=board3, name=n, order=i, color=c))

        mkt_tasks = [
            ('Social media calendar','Plan posts for June','P1',0,0,[3],today+timedelta(10)),
            ('Blog post: Product launch','Draft + review','P0',1,0,[0,3],today+timedelta(3)),
            ('Email newsletter design','Design HTML template','P2',1,1,[3],today+timedelta(5)),
            ('Landing page A/B test','Set up experiments','P1',0,1,[0],today+timedelta(12)),
            ('Press release','Draft announcement','P0',2,0,[3],today-timedelta(3)),
        ]
        for title, desc, pri, col_i, order, assign_is, due in mkt_tasks:
            t = Task.objects.create(title=title, description=desc, priority=pri,
                column=cols3[col_i], board=board3, order=order,
                due_date=due, created_by=carol)
            for ai in assign_is:
                t.assignees.add(users[ai])

        # ==================== Activity Logs ====================
        self.stdout.write('Creating activity logs...')
        activities = [
            (board1, created_tasks1[10], demo,  'created task',    {'title':'Project scaffolding'}, 12),
            (board1, created_tasks1[11], alice, 'created task',    {'title':'User registration & login'}, 10),
            (board1, created_tasks1[10], demo,  'moved task',      {'from':'To Do','to':'Done'}, 8),
            (board1, created_tasks1[11], alice, 'moved task',      {'from':'In Progress','to':'Done'}, 7),
            (board1, created_tasks1[5],  demo,  'created task',    {'title':'Build analytics dashboard'}, 5),
            (board1, created_tasks1[5],  demo,  'moved task',      {'from':'To Do','to':'In Progress'}, 3),
            (board1, created_tasks1[6],  demo,  'moved task',      {'from':'To Do','to':'In Progress'}, 2),
            (board1, created_tasks1[8],  alice, 'moved task',      {'from':'In Progress','to':'Review'}, 1),
            (board1, None,               demo,  'added member',    {'user':'carol@taskflow.io','role':'viewer'}, 6),
            (board1, created_tasks1[9],  demo,  'enabled sharing', {}, 4),
        ]
        for board, task, actor, verb, detail, days_ago in activities:
            a = ActivityLog.objects.create(board=board, task=task, actor=actor,
                verb=verb, detail=detail)
            ActivityLog.objects.filter(pk=a.pk).update(
                created_at=timezone.now() - timedelta(days=days_ago))

        # ==================== Notifications ====================
        self.stdout.write('Creating notifications...')
        notifs = [
            (demo,  alice, 'assigned you to "JWT token refresh"',        created_tasks1[8],  board1, False),
            (demo,  bob,   'commented on "Build analytics dashboard"',   created_tasks1[5],  board1, False),
            (demo,  carol, 'mentioned you in "Board sharing via link"',  created_tasks1[9],  board1, True),
            (alice, demo,  'moved "Project scaffolding" to Done',        created_tasks1[10], board1, True),
            (alice, demo,  'created sprint "Sprint 2 – Core Features"',  None,               board1, False),
            (bob,   demo,  'added you to board "Web App Redesign"',      None,               board1, True),
            (demo,  alice, 'assigned you to "Auth screens"',             None,               board2, False),
        ]
        for recip, actor, verb, task, board, is_read in notifs:
            Notification.objects.create(recipient=recip, actor=actor, verb=verb,
                task=task, board=board, is_read=is_read)

        self.stdout.write(self.style.SUCCESS(
            '\n[OK] Seed data created successfully!\n'
            '\n'
            '   Login credentials (all passwords: demo1234):\n'
            '   ----------------------------------------------\n'
            '   - demo@taskflow.io  - owns "Web App Redesign"\n'
            '   - alice@taskflow.io - owns "Mobile App MVP"\n'
            '   - bob@taskflow.io   - member on multiple boards\n'
            '   - carol@taskflow.io - owns "Marketing Campaign Q2"\n'
            '\n'
            '   Boards created: 3\n'
            '   Tasks created:  26\n'
            '   Sprints:        4\n'
        ))
