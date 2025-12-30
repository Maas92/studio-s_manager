"""
Provider-agnostic WhatsApp API interface
Easily swap between different WhatsApp providers
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Optional

import httpx
from config import settings

logger = logging.getLogger(__name__)


class WhatsAppProvider(ABC):
    """Abstract base class for WhatsApp providers"""

    @abstractmethod
    async def send_message(self, phone_number: str, message: str) -> Dict:
        """
        Send a WhatsApp message

        Returns:
            Dict with keys: success (bool), message_id (str), error (str)
        """
        pass

    @abstractmethod
    async def send_template_message(
        self, phone_number: str, template_name: str, parameters: Dict
    ) -> Dict:
        """
        Send a WhatsApp template message
        Templates are pre-approved by WhatsApp for business messaging
        """
        pass


class ChakraHQProvider(WhatsAppProvider):
    """ChakraHQ WhatsApp provider implementation"""

    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)

    def _format_phone(self, phone: str) -> str:
        """Format phone number to E.164 format"""
        # Remove all non-numeric characters
        phone = "".join(filter(str.isdigit, phone))

        # Add country code if not present (assuming South Africa +27)
        if not phone.startswith("27") and len(phone) == 10:
            phone = "27" + phone[1:]  # Remove leading 0

        return phone

    async def send_message(self, phone_number: str, message: str) -> Dict:
        """
        Send message via ChakraHQ API
        Refer to: https://apidocs.chakrahq.com/api-11312774
        """
        try:
            formatted_phone = self._format_phone(phone_number)

            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": formatted_phone,
                "type": "template",
                "template": {
                    "name": "reminder",
                    "language": {"policy": "deterministic", "code": "en"},
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                {
                                    "type": "text",
                                    "parameter_name": "customer_name",
                                    "text": str(message),
                                }
                                # for value in parameters.values()
                            ],
                        }
                    ],
                },
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            response = await self.client.post(
                f"{self.base_url}/messages", json=payload, headers=headers
            )

            response.raise_for_status()
            data = response.json()

            return {"success": True, "message_id": data.get("id", ""), "error": None}

        except httpx.HTTPStatusError as e:
            logger.error(
                f"ChakraHQ API error: {e.response.status_code} - {e.response.text}"
            )
            return {
                "success": False,
                "message_id": None,
                "error": f"HTTP {e.response.status_code}: {e.response.text}",
            }
        except Exception as e:
            logger.error(f"Error sending message via ChakraHQ: {e}")
            return {"success": False, "message_id": None, "error": str(e)}

    async def send_template_message(
        self, phone_number: str, template_name: str, parameters: Dict
    ) -> Dict:
        """Send template message via ChakraHQ"""
        try:
            formatted_phone = self._format_phone(phone_number)

            # Adjust based on ChakraHQ's template message format
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": formatted_phone,
                "type": "template",
                "template": {
                    "name": "reminder",
                    "language": {"policy": "deterministic", "code": "en"},
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                {
                                    "type": "text",
                                    "parameter_name": "customer_name",
                                    "text": str(value),
                                }
                                for value in parameters.values()
                            ],
                        }
                    ],
                },
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            response = await self.client.post(
                f"{self.base_url}/messages", json=payload, headers=headers
            )

            response.raise_for_status()
            data = response.json()

            return {"success": True, "message_id": data.get("id", ""), "error": None}

        except Exception as e:
            logger.error(f"Error sending template via ChakraHQ: {e}")
            return {"success": False, "message_id": None, "error": str(e)}


def get_whatsapp_provider() -> WhatsAppProvider:
    """Factory function to get the configured WhatsApp provider"""
    provider_name = settings.WHATSAPP_PROVIDER.lower()

    if provider_name == "chakra":
        return ChakraHQProvider(
            api_key=settings.CHAKRA_API_KEY or settings.WHATSAPP_API_KEY,
            base_url=settings.CHAKRA_BASE_URL,
        )
    elif provider_name == "twilio":
        # Return Twilio provider when implemented
        raise NotImplementedError("Twilio provider not yet implemented")
    else:
        raise ValueError(f"Unknown WhatsApp provider: {provider_name}")
