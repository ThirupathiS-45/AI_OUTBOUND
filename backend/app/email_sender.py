import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
from app.utils import generate_email_llama2

load_dotenv()

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")


def send_sales_email(
    customer_name: str,
    customer_email: str,
    lead_score: float,
    quote_value: float,
    item_count: int,
    subject: str
):
    """
    Generate AI-powered email content and send it via SMTP
    """
    
    # Validate SMTP credentials
    if not EMAIL_USER or not EMAIL_PASSWORD:
        return {
            "success": False,
            "message": "Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD in .env file.",
            "email_body": ""
        }
    
    # Generate email body using LLM
    email_body = generate_email_llama2(
        customer_name=customer_name,
        lead_score=lead_score,
        quote_value=quote_value,
        item_count=item_count
    )
    
    # Create email message
    message = MIMEMultipart()
    message["From"] = EMAIL_USER
    message["To"] = customer_email
    message["Subject"] = subject
    
    # Add body to email
    message.attach(MIMEText(email_body, "plain"))
    
    try:
        # Create SMTP session
        # Use SSL for port 465, TLS for port 587
        if EMAIL_PORT == 465:
            with smtplib.SMTP_SSL(EMAIL_HOST, EMAIL_PORT, timeout=10) as server:
                server.login(EMAIL_USER, EMAIL_PASSWORD)
                server.send_message(message)
        else:
            with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=10) as server:
                server.starttls()  # Enable security
                server.login(EMAIL_USER, EMAIL_PASSWORD)
                server.send_message(message)
            
        return {
            "success": True,
            "message": f"Email sent successfully to {customer_email}",
            "email_body": email_body
        }
    
    except smtplib.SMTPAuthenticationError:
        return {
            "success": False,
            "message": "Authentication failed. Check your email credentials.",
            "email_body": email_body
        }
    except smtplib.SMTPException as e:
        return {
            "success": False,
            "message": f"SMTP error occurred: {str(e)}",
            "email_body": email_body
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to send email: {str(e)}",
            "email_body": email_body
        }
