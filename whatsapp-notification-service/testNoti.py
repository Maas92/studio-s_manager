"""
Test script to send a test booking workflow
Run this to verify your Temporal setup works
"""

import asyncio
from datetime import datetime, timedelta

import httpx


async def test_booking_workflow():
    """Test sending a booking confirmation"""

    # Configure your test data
    test_booking = {
        "booking_id": "23417ce2-faa2-4151-9a36-ac1437efca7f",  # Use a test ID
        "client_id": "960cfd87-3c54-49fd-9f3d-2d283f7539ef",  # Use a test ID
        "appointment_datetime": (datetime.now() + timedelta(hours=48)).isoformat(),
        "client_phone": "+2765784780",  # YOUR TEST PHONE NUMBER
        "client_name": "Test Client",
        "treatment_name": "Test Haircut",
        "staff_name": "Test Stylist",
    }

    print("🚀 Starting test booking workflow...")
    print(f"📱 Will send to: {test_booking['client_phone']}")
    print(f"📅 Appointment: {test_booking['appointment_datetime']}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Start the workflow
            response = await client.post(
                "http://localhost:8000/workflows/booking/start", json=test_booking
            )

            response.raise_for_status()
            data = response.json()

            print(f"\n✅ Workflow started successfully!")
            print(f"Workflow ID: {data['workflow_id']}")
            print(f"Status: {data['status']}")

            # Wait a few seconds for the message to be sent
            print("\n⏳ Waiting 5 seconds for message to be sent...")
            await asyncio.sleep(5)

            # Check workflow status
            status_response = await client.get(
                f"http://localhost:8000/workflows/{data['workflow_id']}/status"
            )
            status_data = status_response.json()

            print(f"\n📊 Workflow Status:")
            print(f"Status: {status_data['status']}")
            print(f"Started: {status_data['start_time']}")

            print(
                f"\n✨ Check your phone ({test_booking['client_phone']}) for the confirmation message!"
            )
            print(f"\n🔍 View workflow in Temporal UI: http://localhost:8080")

            return data["workflow_id"]

        except httpx.HTTPError as e:
            print(f"\n❌ Error: {e}")
            if hasattr(e, "response") and e.response:
                print(f"Response: {e.response.text}")
            return None


async def test_cancellation(workflow_id: str, booking_id: int):
    """Test cancelling a workflow"""

    print(f"\n🚫 Testing cancellation...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                "http://localhost:8000/workflows/booking/cancel",
                json={
                    "booking_id": booking_id,
                    "cancellation_reason": "Test cancellation",
                },
            )

            response.raise_for_status()
            data = response.json()

            print(f"✅ Cancellation successful!")
            print(f"Cancelled workflow: {data['booking_workflow_id']}")
            print(f"Check your phone for cancellation message!")

        except httpx.HTTPError as e:
            print(f"❌ Error: {e}")


async def check_health():
    """Check if the API is healthy"""

    print("🏥 Checking API health...")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("http://localhost:8000/health")
            data = response.json()

            if data.get("temporal_connected"):
                print("✅ API is healthy and connected to Temporal\n")
                return True
            else:
                print("❌ API is not connected to Temporal\n")
                return False

        except Exception as e:
            print(f"❌ Cannot connect to API: {e}\n")
            print("Make sure the service is running: docker-compose up -d\n")
            return False


async def main():
    """Main test function"""

    print("=" * 60)
    print("🧪 Temporal WhatsApp Notification Test")
    print("=" * 60)

    # Check health first
    if not await check_health():
        return

    # Send test booking
    workflow_id = await test_booking_workflow()

    if workflow_id:
        # Ask if user wants to test cancellation
        print("\n" + "=" * 60)
        response = input("\n🤔 Do you want to test cancellation? (y/n): ")

        if response.lower() == "y":
            await asyncio.sleep(2)
            await test_cancellation(workflow_id, 9999)

    print("\n" + "=" * 60)
    print("✨ Test complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
