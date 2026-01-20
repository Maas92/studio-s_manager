# payload = {
#     "messaging_product": "whatsapp",
#     "recipient_type": "individual",
#     "to": formatted_phone,
#     "type": "template",
#     "template": {
#         "name": "reminder",
#         "language": {"policy": "deterministic", "code": "en"},
#         "components": [
#             {
#                 "type": "body",
#                 "parameters": [
#                     {
#                         "type": "text",
#                         "parameter_name": "customer_name",
#                         "text": str(message),
#                     }
#                     # for value in parameters.values()
#                 ],
#             }
#         ],
#     },
# }

# # Adjust based on ChakraHQ's template message format
# payload = {
#     "messaging_product": "whatsapp",
#     "recipient_type": "individual",
#     "to": formatted_phone,
#     "type": "template",
#     "template": {
#         "name": "reminder",
#         "language": {"policy": "deterministic", "code": "en"},
#         "components": [
#             {
#                 "type": "body",
#                 "parameters": [
#                     {
#                         "type": "text",
#                         "parameter_name": "customer_name",
#                         "text": str(value),
#                     }
#                     for value in parameters.values()
#                 ],
#             }
#         ],
#     },
# }

"""
Provider-agnostic WhatsApp interface
Currently implements ChakraHQ, but can be swapped for Twilio, etc.
"""
from typing import Any, Dict, Optional

import httpx
import structlog

logger = structlog.get_logger()


class WhatsAppProvider:
    """WhatsApp message provider abstraction"""

    def __init__(self, api_key: str, api_url: str):
        self.api_key = api_key
        self.api_url = api_url
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    async def send_message(
        self,
        to: str,
        message: str,
        template_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send WhatsApp message

        Args:
            to: Phone number in E.164 format (+27821234567)
            message: Message text
            template_id: Optional template ID

        Returns:
            {
                "success": bool,
                "message_id": str (if successful),
                "error": str (if failed)
            }
        """
        try:
            payload = {
                "to": to,
                "message": message,
            }

            if template_id:
                payload["template_id"] = template_id

            response = await self.client.post(
                f"{self.api_url}/messages/send",
                json=payload,
            )

            response.raise_for_status()
            data = response.json()

            logger.info(
                "WhatsApp message sent",
                to=to,
                message_id=data.get("id"),
            )

            return {
                "success": True,
                "message_id": data.get("id"),
            }

        except httpx.HTTPStatusError as e:
            logger.error(
                "WhatsApp API error",
                to=to,
                status_code=e.response.status_code,
                error=str(e),
            )
            return {
                "success": False,
                "error": f"HTTP {e.response.status_code}: {e.response.text}",
            }

        except Exception as e:
            logger.error(
                "WhatsApp send failed",
                to=to,
                error=str(e),
            )
            return {
                "success": False,
                "error": str(e),
            }

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
