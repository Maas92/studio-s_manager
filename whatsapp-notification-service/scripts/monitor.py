"""
Simple monitoring script
Run continuously to monitor system health
"""

import asyncio
from datetime import datetime

import httpx


async def check_health():
    """Check system health"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("http://localhost:8000/health")
            data = response.json()

            if data["temporal_connected"]:
                print(f"✓ {datetime.now()}: System healthy")
            else:
                print(f"✗ {datetime.now()}: Temporal disconnected!")
        except Exception as e:
            print(f"✗ {datetime.now()}: Health check failed: {e}")


async def main():
    """Run health checks every 5 minutes"""
    while True:
        await check_health()
        await asyncio.sleep(300)


if __name__ == "__main__":
    asyncio.run(main())
