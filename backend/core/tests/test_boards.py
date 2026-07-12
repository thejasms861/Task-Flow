import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from core.models import User, Board, BoardMember, Column

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def create_user():
    def make_user(**kwargs):
        return User.objects.create_user(**kwargs)
    return make_user

@pytest.fixture
def users(create_user):
    return {
        'owner': create_user(email='owner@example.com', username='owner', password='p1', display_name='Owner'),
        'admin': create_user(email='admin@example.com', username='admin', password='p2', display_name='Admin'),
        'member': create_user(email='member@example.com', username='member', password='p3', display_name='Member'),
        'outsider': create_user(email='outsider@example.com', username='out', password='p4', display_name='Outsider'),
    }

@pytest.fixture
def board_setup(users):
    board = Board.objects.create(name='Test Board', owner=users['owner'])
    BoardMember.objects.create(board=board, user=users['owner'], role='admin')
    BoardMember.objects.create(board=board, user=users['admin'], role='admin')
    BoardMember.objects.create(board=board, user=users['member'], role='member')
    
    # default columns
    Column.objects.create(board=board, name='Todo', order=0)
    Column.objects.create(board=board, name='Done', order=1)
    
    return board

def auth_client(api_client, user):
    from rest_framework_simplejwt.tokens import RefreshToken
    token = RefreshToken.for_user(user).access_token
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client

@pytest.mark.django_db
class TestBoardAPI:

    def test_list_and_retrieve_permissions(self, api_client, users, board_setup):
        url_list = reverse('board-list')
        url_detail = reverse('board-detail', args=[board_setup.id])
        
        # Outsider gets empty list, 403 or 404 on logic
        client = auth_client(api_client, users['outsider'])
        assert len(client.get(url_list).json().get('data', [])) == 0 # due to wrapping
        assert client.get(url_detail).status_code == 403
        
        # Member sees it
        client = auth_client(api_client, users['member'])
        res = client.get(url_list)
        assert len(res.json()['data']) == 1
        assert client.get(url_detail).status_code == 200

    def test_create_board(self, api_client, users):
        client = auth_client(api_client, users['owner'])
        res = client.post(reverse('board-list'), {'name': 'New Board'})
        print(f"\nDEBUG CREATE BOARD: {res.status_code} - {res.json()}")
        assert res.status_code == 201
        data = res.json()['data']
        assert data['name'] == 'New Board'
        assert len(data['columns']) == 3
        assert data['columns'][0]['name'] == 'Todo'

    def test_update_board(self, api_client, users, board_setup):
        url = reverse('board-detail', args=[board_setup.id])
        payload = {'name': 'Updated API Board'}
        
        # Member cannot update
        assert auth_client(api_client, users['member']).patch(url, payload).status_code == 403
        
        # Admin can update
        res = auth_client(api_client, users['admin']).patch(url, payload)
        assert res.status_code == 200
        assert res.json()['data']['name'] == 'Updated API Board'

    def test_delete_board(self, api_client, users, board_setup):
        url = reverse('board-detail', args=[board_setup.id])
        
        # Admin cannot delete board (owner only)
        assert auth_client(api_client, users['admin']).delete(url).status_code == 403
        
        # Owner can delete
        assert auth_client(api_client, users['owner']).delete(url).status_code == 204
        board_setup.refresh_from_db()
        assert not board_setup.is_active

@pytest.mark.django_db
class TestColumnAPI:

    def test_create_column(self, api_client, users, board_setup):
        url = reverse('board_columns_list', args=[board_setup.id])
        
        # Member cannot create
        assert auth_client(api_client, users['member']).post(url, {'name': 'C', 'order': 3}).status_code == 403
        
        # Admin can create
        res = auth_client(api_client, users['admin']).post(url, {'name': 'C', 'order': 3})
        assert res.status_code == 201
        assert len(res.json()['data']['columns']) == 3

    def test_delete_column_without_tasks(self, api_client, users, board_setup):
        col = board_setup.columns.first()
        url = reverse('board_columns_detail', args=[board_setup.id, col.id])
        
        assert auth_client(api_client, users['admin']).delete(url).status_code == 200
        assert board_setup.columns.count() == 1

    def test_delete_column_with_tasks_fails(self, api_client, users, board_setup):
        col1 = board_setup.columns.first()
        from core.models import Task
        Task.objects.create(board=board_setup, column=col1, title='Task', order=0)
        
        url = reverse('board_columns_detail', args=[board_setup.id, col1.id])
        assert auth_client(api_client, users['admin']).delete(url).status_code == 400

    def test_reorder_columns(self, api_client, users, board_setup):
        url = reverse('board_columns_reorder', args=[board_setup.id])
        cols = list(board_setup.columns.all())
        ordered_ids = [str(cols[1].id), str(cols[0].id)]
        
        res = auth_client(api_client, users['admin']).post(url, {'ordered_ids': ordered_ids}, format='json')
        assert res.status_code == 200
        res_cols = res.json()['data']['columns']
        # The returned items are just nested, maybe ordered correctly by DRF, but DB is updated.
        cols[0].refresh_from_db()
        cols[1].refresh_from_db()
        assert cols[1].order == 0
        assert cols[0].order == 1
