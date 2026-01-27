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
Currently implements ChakraHQ with template messages
"""
from typing import Any, Dict, List, Optional

import httpx
import structlog

logger = structlog.get_logger()


class WhatsAppProvider:
    """WhatsApp message provider abstraction for ChakraHQ"""

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
        template_name: str = "reminder",
        parameters: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Send WhatsApp template message via ChakraHQ

        Args:
            to: Phone number in E.164 format (+27821234567)
            message: Message text (used as first parameter if parameters not provided)
            template_name: ChakraHQ template name (default: "reminder")
            parameters: Template parameters dict

        Returns:
            {
                "success": bool,
                "message_id": str (if successful),
                "error": str (if failed)
            }
        """

        # Format phone number (remove + for ChakraHQ)
        formatted_phone = to.replace("+", "")

        # If no parameters provided, use message as single parameter
        if parameters is None:
            parameters = {"customer_name": message}

        # Build ChakraHQ template payload
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"policy": "deterministic", "code": "en"},
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {
                                "type": "text",
                                "parameter_name": key,
                                "text": str(value),
                            }
                            for key, value in parameters.items()
                        ],
                    }
                ],
            },
        }

        try:
            logger.info(
                "Sending WhatsApp message via ChakraHQ",
                to=formatted_phone,
                template=template_name,
                parameters_count=len(parameters),
            )

            response = await self.client.post(
                f"{self.api_url}/messages",
                json=payload,
            )

            # Check for HTTP errors
            if response.status_code >= 400:
                error_detail = self._parse_error_response(response)
                logger.error(
                    "ChakraHQ API returned error",
                    status_code=response.status_code,
                    error=error_detail,
                    to=formatted_phone,
                )
                return {
                    "success": False,
                    "error": error_detail,
                }

            response.raise_for_status()
            data = response.json()

            # Extract message ID from response
            message_id = (
                data.get("id")
                or data.get("message_id")
                or data.get("messages", [{}])[0].get("id")
            )

            logger.info(
                "WhatsApp message sent successfully",
                to=formatted_phone,
                message_id=message_id,
                template=template_name,
            )

            return {
                "success": True,
                "message_id": message_id,
            }

        except httpx.HTTPStatusError as e:
            error_detail = self._parse_error_response(e.response)
            logger.error(
                "ChakraHQ HTTP error",
                status_code=e.response.status_code,
                error=error_detail,
                to=formatted_phone,
                url=str(e.request.url),
            )
            return {
                "success": False,
                "error": error_detail,
            }

        except httpx.TimeoutException as e:
            error_msg = f"ChakraHQ API timeout after 30 seconds"
            logger.error(
                "ChakraHQ timeout",
                to=formatted_phone,
                error=str(e),
            )
            return {
                "success": False,
                "error": error_msg,
            }

        except httpx.NetworkError as e:
            error_msg = f"Network error connecting to ChakraHQ: {str(e)}"
            logger.error(
                "ChakraHQ network error",
                to=formatted_phone,
                error=str(e),
            )
            return {
                "success": False,
                "error": error_msg,
            }

        except Exception as e:
            error_msg = f"Unexpected error sending WhatsApp message: {str(e)}"
            logger.error(
                "Unexpected WhatsApp error",
                to=formatted_phone,
                error=str(e),
                error_type=type(e).__name__,
            )
            return {
                "success": False,
                "error": error_msg,
            }

    def _parse_error_response(self, response: httpx.Response) -> str:
        """Parse ChakraHQ error response into meaningful message"""

        status_code = response.status_code

        # Common HTTP status codes
        status_messages = {
            400: "Bad Request - Invalid message format or parameters",
            401: "Unauthorized - Invalid API key",
            403: "Forbidden - API key doesn't have permission",
            404: "Not Found - Invalid endpoint or template doesn't exist",
            429: "Rate Limited - Too many requests",
            500: "ChakraHQ Server Error",
            503: "ChakraHQ Service Unavailable",
        }

        base_message = status_messages.get(status_code, f"HTTP {status_code} Error")

        # Try to extract detailed error from response body
        try:
            error_data = response.json()

            # ChakraHQ might return errors in different formats
            if isinstance(error_data, dict):
                # Try common error field names
                error_detail = (
                    error_data.get("error")
                    or error_data.get("message")
                    or error_data.get("error_message")
                    or error_data.get("detail")
                )

                if error_detail:
                    if isinstance(error_detail, dict):
                        error_detail = error_detail.get("message", str(error_detail))
                    return f"{base_message}: {error_detail}"

                # If error is nested in errors array
                if "errors" in error_data and error_data["errors"]:
                    first_error = error_data["errors"][0]
                    if isinstance(first_error, dict):
                        error_detail = first_error.get("message", str(first_error))
                    else:
                        error_detail = str(first_error)
                    return f"{base_message}: {error_detail}"

            # Return full JSON if we can't parse it
            return f"{base_message}: {response.text[:200]}"

        except Exception:
            # If response isn't JSON, return text
            return f"{base_message}: {response.text[:200]}"

    async def send_text_message(
        self,
        to: str,
        message: str,
    ) -> Dict[str, Any]:
        """
        Send plain text message (if ChakraHQ supports it)
        Falls back to template message with message as parameter
        """
        return await self.send_message(
            to=to,
            message=message,
            template_name="reminder",
            parameters={"message_body": message},
        )

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
