import random
import secrets
import requests
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, PendingRegistration, PasswordResetRequest
from .serializers import UserSerializer, RegisterSerializer
from .utils import send_verification_email, send_password_reset_email

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            display_name = serializer.validated_data['display_name']
            password = serializer.validated_data['password']

            # Clean up older requests for the same email
            PendingRegistration.objects.filter(email=email).delete()

            # Generate OTP and Token
            otp = "".join(random.choices("0123456789", k=6))
            token = secrets.token_urlsafe(32)
            expires_at = timezone.now() + timedelta(minutes=15)

            # Create PendingRegistration
            PendingRegistration.objects.create(
                email=email,
                display_name=display_name,
                password_hash=make_password(password),
                otp=otp,
                token=token,
                expires_at=expires_at
            )

            # Send Email
            send_verification_email(email, otp, token)

            return Response({
                'message': 'Verification email sent. Please check your email to verify your account.',
                'email': email
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        token = request.data.get('token')

        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not otp and not token:
            return Response({'error': 'Either OTP or token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pending = PendingRegistration.objects.get(email=email)
        except PendingRegistration.DoesNotExist:
            return Response({'error': 'No verification request found for this email. Please register again.'}, status=status.HTTP_400_BAD_REQUEST)

        if pending.is_expired():
            pending.delete()
            return Response({'error': 'Verification request has expired. Please register again.'}, status=status.HTTP_400_BAD_REQUEST)

        is_verified = False
        if token and pending.token == token:
            is_verified = True
        elif otp and pending.otp == otp:
            is_verified = True

        if not is_verified:
            return Response({'error': 'Invalid verification code or link.'}, status=status.HTTP_400_BAD_REQUEST)

        # Unique username generation logic
        username = email.split('@')[0]
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        # Create user
        user = User.objects.create(
            username=username,
            email=email,
            password=pending.password_hash,
            display_name=pending.display_name
        )

        # Clean up
        pending.delete()

        # Generate tokens
        tokens = get_tokens_for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'access_token': tokens['access'],
            'refresh_token': tokens['refresh']
        }, status=status.HTTP_201_CREATED)

class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pending = PendingRegistration.objects.get(email=email)
        except PendingRegistration.DoesNotExist:
            return Response({'error': 'No registration session found for this email.'}, status=status.HTTP_400_BAD_REQUEST)

        otp = "".join(random.choices("0123456789", k=6))
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(minutes=15)

        pending.otp = otp
        pending.token = token
        pending.expires_at = expires_at
        pending.save()

        send_verification_email(email, otp, token)

        return Response({
            'message': 'Verification code resent. Please check your email.',
            'email': email
        }, status=status.HTTP_200_OK)

class SocialConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        google_client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
        github_client_id = getattr(settings, 'GITHUB_CLIENT_ID', '')
        google_enabled = bool(google_client_id)
        github_enabled = bool(github_client_id)
        mock_enabled = bool(getattr(settings, 'MOCK_SOCIAL_AUTH', True))
        
        return Response({
            'google_client_id': google_client_id,
            'github_client_id': github_client_id,
            'google_enabled': google_enabled,
            'github_enabled': github_enabled,
            'mock_enabled': mock_enabled
        }, status=status.HTTP_200_OK)


class SocialLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        provider = request.data.get('provider')
        code = request.data.get('code')
        redirect_uri = request.data.get('redirect_uri')

        if not provider or not code:
            return Response({'error': 'Provider and code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if provider not in ('google', 'github'):
            return Response({'error': f'Unsupported provider: {provider}'}, status=status.HTTP_400_BAD_REQUEST)

        is_mock = getattr(settings, 'MOCK_SOCIAL_AUTH', False)
        
        if is_mock:
            email = request.data.get('email') or f"mock-{provider}-user@example.com"
            name = request.data.get('name') or f"Mock {provider.capitalize()} User"
            avatar_url = request.data.get('avatar_url') or ""
        else:
            if provider == 'google' and (not getattr(settings, 'GOOGLE_CLIENT_ID', '') or not getattr(settings, 'GOOGLE_CLIENT_SECRET', '')):
                return Response({'error': 'Google OAuth credentials are not configured on the server.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            if provider == 'github' and (not getattr(settings, 'GITHUB_CLIENT_ID', '') or not getattr(settings, 'GITHUB_CLIENT_SECRET', '')):
                return Response({'error': 'GitHub OAuth credentials are not configured on the server.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            email = None
            name = ""
            avatar_url = ""

            try:
                if provider == 'google':
                    token_url = "https://oauth2.googleapis.com/token"
                    data = {
                        'code': code,
                        'client_id': settings.GOOGLE_CLIENT_ID,
                        'client_secret': settings.GOOGLE_CLIENT_SECRET,
                        'redirect_uri': redirect_uri,
                        'grant_type': 'authorization_code'
                    }
                    res = requests.post(token_url, data=data)
                    if res.status_code != 200:
                        return Response({'error': 'Failed to exchange authorization code with Google.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    access_token = res.json().get('access_token')
                    user_info_url = "https://www.googleapis.com/oauth2/v3/userinfo"
                    profile_res = requests.get(user_info_url, headers={'Authorization': f'Bearer {access_token}'})
                    if profile_res.status_code != 200:
                        return Response({'error': 'Failed to fetch user profile from Google.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    profile_data = profile_res.json()
                    email = profile_data.get('email')
                    name = profile_data.get('name') or email.split('@')[0]
                    avatar_url = profile_data.get('picture') or ""

                elif provider == 'github':
                    token_url = "https://github.com/login/oauth/access_token"
                    headers = {'Accept': 'application/json'}
                    data = {
                        'client_id': settings.GITHUB_CLIENT_ID,
                        'client_secret': settings.GITHUB_CLIENT_SECRET,
                        'code': code,
                        'redirect_uri': redirect_uri
                    }
                    res = requests.post(token_url, headers=headers, data=data)
                    if res.status_code != 200:
                        return Response({'error': 'Failed to exchange authorization code with GitHub.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    access_token = res.json().get('access_token')
                    profile_url = "https://api.github.com/user"
                    profile_res = requests.get(profile_url, headers={'Authorization': f'token {access_token}', 'Accept': 'application/json'})
                    if profile_res.status_code != 200:
                        return Response({'error': 'Failed to fetch user profile from GitHub.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    profile_data = profile_res.json()
                    email = profile_data.get('email')
                    name = profile_data.get('name') or profile_data.get('login') or ""
                    avatar_url = profile_data.get('avatar_url') or ""

                    if not email:
                        emails_url = "https://api.github.com/user/emails"
                        emails_res = requests.get(emails_url, headers={'Authorization': f'token {access_token}', 'Accept': 'application/json'})
                        if emails_res.status_code == 200:
                            emails_list = emails_res.json()
                            for email_item in emails_list:
                                if email_item.get('primary'):
                                    email = email_item.get('email')
                                    break
                            if not email and emails_list:
                                email = emails_list[0].get('email')
            except Exception as e:
                return Response({'error': f'Social login error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not email:
            return Response({'error': 'Email could not be retrieved from provider.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            username = email.split('@')[0]
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                password=secrets.token_urlsafe(24),
                display_name=name or username
            )
            user.avatar_url = avatar_url
            user.avatar_color = random.choice(['purple', 'blue', 'green', 'indigo', 'pink', 'orange'])
            user.save()

        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access_token': tokens['access'],
            'refresh_token': tokens['refresh']
        }, status=status.HTTP_200_OK)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response('Both email and password are required', status=status.HTTP_400_BAD_REQUEST)

        # Authenticate
        try:
            user = User.objects.get(email=email)
            if not user.check_password(password):
                user = None
        except User.DoesNotExist:
            user = None

        if user is None:
            return Response('Invalid credentials', status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
            return Response('Account is disabled', status=status.HTTP_401_UNAUTHORIZED)

        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access_token': tokens['access'],
            'refresh_token': tokens['refresh']
        }, status=status.HTTP_200_OK)

class CustomTokenRefreshView(TokenRefreshView):
    # This will use TokenRefreshView directly
    # Since we set CustomJSONRenderer, it should wrap its output implicitly.
    # However, simplejwt returns {'access': '...'}, we rename it to access_token to match prompt requirement ("returns {access_token}").
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            original_data = response.data
            response.data = {
                'access_token': original_data.get('access')
            }
            if 'refresh' in original_data:
                response.data['refresh_token'] = original_data['refresh']
        return response

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        # Allowed fields to update: display_name, avatar_url, avatar_color
        allowed_keys = {'display_name', 'avatar_url', 'avatar_color'}
        update_data = {k: v for k, v in request.data.items() if k in allowed_keys}
        
        serializer = UserSerializer(request.user, data=update_data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UploadAvatarView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if 'avatar' not in request.FILES:
            return Response({'error': 'No avatar file provided'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['avatar']
        if not file.content_type.startswith('image/'):
            return Response({'error': 'File must be an image'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.avatar = file
        request.user.save()

        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request):
        request.user.avatar = None
        request.user.save()
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not current_password or not new_password or not confirm_password:
            return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.check_password(current_password):
            return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'error': 'New passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save()
        return Response({'message': 'Password updated successfully.'}, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Always respond with success to prevent email enumeration
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({
                'message': 'If that email is registered, a reset code has been sent.'
            }, status=status.HTTP_200_OK)

        # Clean up any previous requests
        PasswordResetRequest.objects.filter(email=email).delete()

        otp = "".join(random.choices("0123456789", k=6))
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(minutes=15)

        PasswordResetRequest.objects.create(
            email=email,
            otp=otp,
            token=token,
            expires_at=expires_at
        )

        send_password_reset_email(email, otp, token)

        return Response({
            'message': 'If that email is registered, a reset code has been sent.',
            'email': email
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp = request.data.get('otp', '')
        token = request.data.get('token', '')
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not otp and not token:
            return Response({'error': 'OTP or reset token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not new_password:
            return Response({'error': 'New password is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if new_password != confirm_password:
            return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            reset_req = PasswordResetRequest.objects.get(email=email)
        except PasswordResetRequest.DoesNotExist:
            return Response({'error': 'No password reset request found. Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)

        if reset_req.is_expired():
            reset_req.delete()
            return Response({'error': 'Reset code has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        is_verified = (token and reset_req.token == token) or (otp and reset_req.otp == otp)
        if not is_verified:
            return Response({'error': 'Invalid reset code. Please check and try again.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        reset_req.delete()

        return Response({'message': 'Password reset successfully. You can now log in.'}, status=status.HTTP_200_OK)
