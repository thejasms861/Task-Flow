from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging
import threading
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

DISPOSABLE_EMAIL_DOMAINS = {
    'mailinator.com', 'yopmail.com', 'tempmail.com', 'trashmail.com',
    '10minutemail.com', 'guerrillamail.com', 'dispostable.com',
    'getairmail.com', 'sharklasers.com', 'temp-mail.org', 'fakeinbox.com',
    'mailnesia.com', 'maildrop.cc', 'mailcatch.com', 'disposable.com'
}

def is_disposable_email(email):
    try:
        if not email or '@' not in email:
            return True
        domain = email.split('@')[-1].strip().lower()
        for disp_domain in DISPOSABLE_EMAIL_DOMAINS:
            if domain == disp_domain or domain.endswith('.' + disp_domain):
                return True
        return False
    except Exception:
        return True

def _send_mail_thread(subject, message, from_email, recipient_list):
    """Internal helper: send email in a background thread to avoid blocking the request."""
    try:
        send_mail(
            subject,
            message,
            from_email,
            recipient_list,
            fail_silently=False,
        )
        logger.info(f"Email sent successfully to {recipient_list}")
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_list}: {e}")
        print(f"--- EMAIL TO {recipient_list} FAILED: {e} ---")
        print(message)

def send_verification_email(email, otp, token):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    verify_url = f"{frontend_url}/verify-email?email={email}&token={token}"
    
    subject = "[TaskFlow] Verify your email address"
    message = f"""Hi there,

Thank you for signing up for TaskFlow!

Please verify your email address to complete your registration.

Your 6-digit OTP code is: {otp}

Alternatively, you can verify your email by clicking the link below:
{verify_url}

This code and link will expire in 15 minutes.

If you did not request this, please ignore this email.
"""
    
    # Send in background thread so SMTP latency never blocks the HTTP response
    t = threading.Thread(
        target=_send_mail_thread,
        args=(subject, message, settings.DEFAULT_FROM_EMAIL, [email]),
        daemon=True
    )
    t.start()

def send_password_reset_email(email, otp, token):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    reset_url = f"{frontend_url}/reset-password?email={email}&token={token}"

    subject = "[TaskFlow] Reset your password"
    message = f"""Hi,

We received a request to reset your password for your TaskFlow account.

Your 6-digit reset code is: {otp}

Alternatively, click the link below to reset your password directly:
{reset_url}

This code and link will expire in 15 minutes.

If you did not request a password reset, please ignore this email.
Your password will remain unchanged.
"""

    # Send in background thread so SMTP latency never blocks the HTTP response
    t = threading.Thread(
        target=_send_mail_thread,
        args=(subject, message, settings.DEFAULT_FROM_EMAIL, [email]),
        daemon=True
    )
    t.start()


def send_board_event(board_id, event_type, payload, sender_socket_id=None):
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"board_{board_id}",
            {
                "type": "board_update", # specifies the method name on consumer
                "event_type": event_type,
                "payload": payload,
                "sender_socket_id": sender_socket_id
            }
        )
