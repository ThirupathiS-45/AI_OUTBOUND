import os
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from app.utils import generate_email_llama2

load_dotenv()

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
EMAIL_USER = os.getenv("EMAIL_USER", "techinfoproject22@gmail.com")


def send_sales_email(
    customer_name: str,
    customer_email: str,
    lead_score: float,
    quote_value: float,
    item_count: int,
    subject: str
):
    """
    Generate AI-powered email content and send via SendGrid API
    """
    
    # Validate SendGrid API key
    if not SENDGRID_API_KEY:
        return {
            "success": False,
            "message": "SendGrid API key not configured. Please set SENDGRID_API_KEY in environment.",
            "email_body": ""
        }
    
    # Generate email body using LLM
    email_body = generate_email_llama2(
        customer_name=customer_name,
        lead_score=lead_score,
        quote_value=quote_value,
        item_count=item_count
    )
    
    try:
        # Create email via SendGrid API
        message = Mail(
            from_email=EMAIL_USER,
            to_emails=customer_email,
            subject=subject,
            plain_text_content=email_body
        )
        
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        if response.status_code in [200, 201, 202]:
            return {
                "success": True,
                "message": f"Email sent successfully to {customer_email}",
                "email_body": email_body
            }
        else:
            return {
                "success": False,
                "message": f"SendGrid error: {response.status_code}",
                "email_body": email_body
            }
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to send email: {str(e)}",
            "email_body": email_body
        }
