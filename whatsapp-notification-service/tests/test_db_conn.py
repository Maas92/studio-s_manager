import asyncio

from database import get_db_session
from sqlalchemy import text


async def test_connection():
    try:
        async with get_db_session() as session:
            # List all tables
            result = await session.execute(
                text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
            )
            tables = result.fetchall()

            print("✅ Database connected!")
            print("\nTables found:")
            for table in tables:
                print(f"  - {table[0]}")

            # Check if bookings table exists
            if any("bookings" in str(t) for t in tables):
                print("\n✅ bookings table exists!")
            else:
                print("\n❌ bookings table NOT FOUND!")

    except Exception as e:
        print(f"❌ Database connection failed: {e}")


asyncio.run(test_connection())
asyncio.run(test_connection())
