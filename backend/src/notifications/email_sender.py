import asyncio
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from src.settings import settings


class EmailSender:
    def __init__(self, smtp_server: str, smtp_port: int, email: str, password: str):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.email = email
        self.password = password

    async def send_text_email(self, to_email: str, subject: str, body: str) -> bool:
        try:
            msg = MIMEMultipart()
            msg['From'] = self.email
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain', 'utf-8'))

            server = aiosmtplib.SMTP(
                hostname=self.smtp_server,
                port=self.smtp_port,
            )

            try:
                await server.connect()
                await server.login(self.email, self.password)
                await server.send_message(msg)
            finally:
                await server.quit()

            print(f"✅ Email успешно отправлен на {to_email}")
            return True

        except Exception as e:
            print(f"❌ Ошибка отправки email: {e}")
            return False


email_sender = EmailSender(
    smtp_server="smtp.gmail.com",
    smtp_port=587,
    email=settings.email_login,
    password=settings.email_password,
)