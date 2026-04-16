import html
import os
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/contact", tags=["contact"])


class ContactRequest(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    email: str = Field(max_length=320)
    interest_type: str = Field(default="Investor", max_length=40)
    message: str | None = Field(default=None, max_length=4000)


@router.post("")
def send_contact_message(payload: ContactRequest):
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", payload.email.strip()):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")

    resend_key = os.getenv("RESEND_API_KEY")
    if not resend_key:
        raise HTTPException(status_code=503, detail="Email sending is not configured yet.")

    recipient = os.getenv("CONTACT_EMAIL", "lynetteduplessis@meetfrank.ai")

    try:
        import resend

        resend.api_key = resend_key

        sender_name = html.escape(payload.name.strip()) if payload.name else "Not provided"
        sender_email = html.escape(payload.email.strip())
        interest_type = html.escape(payload.interest_type.strip() or "Investor")
        message = html.escape(payload.message.strip()) if payload.message else "Please keep me posted on launch plans and early access."

        resend.Emails.send({
            "from": "Sharez <onboarding@resend.dev>",
            "to": [recipient],
            "reply_to": payload.email.strip(),
            "subject": f"Sharez concept site inquiry - {interest_type}",
            "html": f"""
            <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px; color: #0A2540;">
                <h2 style="margin: 0 0 16px; font-size: 24px; line-height: 1.2;">New message from the Sharez concept site</h2>
                <p style="margin: 0 0 24px; color: #425466; font-size: 15px; line-height: 1.6;">
                    Someone reached out through the landing page.
                </p>
                <div style="border: 1px solid #E3E8EE; border-radius: 16px; padding: 20px; background: #FFFFFF;">
                    <p style="margin: 0 0 10px;"><strong>Name:</strong> {sender_name}</p>
                    <p style="margin: 0 0 10px;"><strong>Email:</strong> {sender_email}</p>
                    <p style="margin: 0 0 10px;"><strong>Interest:</strong> {interest_type}</p>
                    <p style="margin: 18px 0 8px;"><strong>Message:</strong></p>
                    <p style="margin: 0; white-space: pre-wrap; color: #425466; font-size: 15px; line-height: 1.6;">{message}</p>
                </div>
            </div>
            """,
        })
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to send email: {exc}") from exc

    return {"message": "Message sent successfully."}
