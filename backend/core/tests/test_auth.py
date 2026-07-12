import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from core.models import User

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def create_user():
    def make_user(**kwargs):
        return User.objects.create_user(**kwargs)
    return make_user

@pytest.mark.django_db
class TestAuthentication:
    
    def test_register_and_verify_success(self, api_client):
        url = reverse('auth_register')
        payload = {
            'email': 'test@example.com',
            'password': 'password123',
            'display_name': 'Test User'
        }
        # 1. Register: should be pending
        res = api_client.post(url, payload, format='json')
        assert res.status_code == 200
        json_res = res.json()
        assert json_res['success'] is True
        assert 'message' in json_res['data']
        
        # Ensure user is NOT created yet
        assert not User.objects.filter(email='test@example.com').exists()
        
        # 2. Look up pending registration in DB
        from core.models import PendingRegistration
        pending = PendingRegistration.objects.get(email='test@example.com')
        assert pending.otp is not None
        assert pending.token is not None
        
        # Try to verify with wrong OTP
        verify_url = reverse('auth_verify_email')
        verify_res = api_client.post(verify_url, {'email': 'test@example.com', 'otp': '000000'}, format='json')
        assert verify_res.status_code == 400
        
        # Verify with correct OTP
        verify_res = api_client.post(verify_url, {'email': 'test@example.com', 'otp': pending.otp}, format='json')
        assert verify_res.status_code == 201
        
        verify_data = verify_res.json()['data']
        assert 'user' in verify_data
        assert verify_data['user']['email'] == payload['email']
        assert 'access_token' in verify_data
        assert 'refresh_token' in verify_data
        
        # Verify user is now created in DB
        assert User.objects.filter(email='test@example.com').exists()

    def test_register_blocked_disposable_email(self, api_client):
        url = reverse('auth_register')
        payload = {
            'email': 'baduser@mailinator.com',
            'password': 'password123',
            'display_name': 'Fake User'
        }
        res = api_client.post(url, payload, format='json')
        assert res.status_code == 400
        json_res = res.json()
        assert json_res['success'] is False
        assert 'email' in json_res['error']

    def test_register_duplicate_email(self, api_client, create_user):
        create_user(email='existing@example.com', username='existing', password='password123', display_name='Exist User')
        
        url = reverse('auth_register')
        payload = {
            'email': 'existing@example.com',
            'password': 'newpassword',
            'display_name': 'New User'
        }
        res = api_client.post(url, payload, format='json')
        assert res.status_code == 400
        
        json_res = res.json()
        assert json_res['success'] is False
        assert 'email' in json_res['error']

    def test_login_success(self, api_client, create_user):
        create_user(email='login@example.com', username='login', password='password123', display_name='Login User')
        
        url = reverse('auth_login')
        payload = {
            'email': 'login@example.com',
            'password': 'password123'
        }
        res = api_client.post(url, payload, format='json')
        assert res.status_code == 200
        
        json_res = res.json()
        assert json_res['success'] is True
        data = json_res['data']
        assert data['user']['email'] == payload['email']
        assert 'access_token' in data
        assert 'refresh_token' in data

    def test_login_wrong_password(self, api_client, create_user):
        create_user(email='login2@example.com', username='login2', password='password123', display_name='Login User 2')
        
        url = reverse('auth_login')
        payload = {
            'email': 'login2@example.com',
            'password': 'wrongpassword'
        }
        res = api_client.post(url, payload, format='json')
        assert res.status_code == 401
        
        json_res = res.json()
        assert json_res['success'] is False
        assert json_res['error'] == 'Invalid credentials'
        
    def test_token_refresh(self, api_client, create_user):
        user = create_user(email='refresh@example.com', username='refresh', password='password123', display_name='Refresh')
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        url = reverse('auth_token_refresh')
        payload = {
            'refresh': str(refresh)
        }
        res = api_client.post(url, payload, format='json')
        assert res.status_code == 200
        
        json_res = res.json()
        assert json_res['success'] is True
        assert 'access_token' in json_res['data']

    def test_me_get_and_patch(self, api_client, create_user):
        user = create_user(email='me@example.com', username='me', password='password123', display_name='Me User')
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        # Unauthenticated GT
        url = reverse('auth_me')
        res_unauth = api_client.get(url)
        assert res_unauth.status_code == 401
        
        # Authenticated GET
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        res_get = api_client.get(url)
        assert res_get.status_code == 200
        assert res_get.json()['data']['display_name'] == 'Me User'
        
        # Authenticated PATCH
        payload = {'display_name': 'Me Updated'}
        res_patch = api_client.patch(url, payload, format='json')
        assert res_patch.status_code == 200
        assert res_patch.json()['data']['display_name'] == 'Me Updated'
        
        # Ensure it actually saved
        user.refresh_from_db()
        assert user.display_name == 'Me Updated'
