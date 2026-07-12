import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from core.models import User, Board, BoardMember, Column, Task

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_data():
    owner = User.objects.create_user(email='owner@test.com', username='owner', password='p1')
    outsider = User.objects.create_user(email='outsider@test.com', username='out', password='p1')
    
    board = Board.objects.create(name='Task Board', owner=owner)
    BoardMember.objects.create(board=board, user=owner, role='admin')
    
    col1 = Column.objects.create(board=board, name='Todo', order=0)
    col2 = Column.objects.create(board=board, name='Done', order=1)
    
    return {
        'owner': owner,
        'outsider': outsider,
        'board': board,
        'col1': col1,
        'col2': col2
    }

def get_auth_client(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client

@pytest.mark.django_db
class TestTasksAPI:

    def test_permission_check(self, setup_data):
        client = get_auth_client(setup_data['outsider'])
        url = reverse('board_tasks_list', args=[setup_data['board'].id])
        res = client.get(url)
        assert res.status_code == 403

    def test_create_task(self, setup_data):
        client = get_auth_client(setup_data['owner'])
        url = reverse('board_tasks_list', args=[setup_data['board'].id])
        
        payload = {
            'title': 'New Task',
            'column': setup_data['col1'].id,
            'priority': 'P0'
        }
        res = client.post(url, payload)
        print(f"\nDEBUG RESPONSE: {res.status_code} - {res.json()}")
        assert res.status_code == 201
        assert res.json()['data']['title'] == 'New Task'
        assert res.json()['data']['order'] == 0
        
        # Verify Activity Log
        from core.models import ActivityLog
        assert ActivityLog.objects.filter(verb='created task').count() == 1

    def test_move_across_columns(self, setup_data):
        # Create tasks
        task1 = Task.objects.create(board=setup_data['board'], column=setup_data['col1'], title='T1', order=0, created_by=setup_data['owner'])
        task2 = Task.objects.create(board=setup_data['board'], column=setup_data['col2'], title='T2', order=0, created_by=setup_data['owner'])
        
        client = get_auth_client(setup_data['owner'])
        url = reverse('tasks_move', args=[task1.id])
        
        # Move task1 to col2 at order 0
        res = client.post(url, {
            'column_id': setup_data['col2'].id,
            'order': 0
        })
        assert res.status_code == 200
        
        task1.refresh_from_db()
        task2.refresh_from_db()
        
        assert task1.column == setup_data['col2']
        assert task1.order == 0
        assert task2.order == 1 # displaced
        
        # Verify activity log
        from core.models import ActivityLog
        assert ActivityLog.objects.filter(verb='moved task').count() == 1
