import asyncio
import httpx
from backend.app.core.config import settings

async def main():
    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_ADMIN_CHAT_ID

    print("\n--- Testing Telegram Configuration ---")
    print(f"Token: {token[:12]}... (length {len(token) if token else 0})")
    print(f"Chat ID: {chat_id}")

    if not token or not chat_id:
        print("ERROR: Token or Chat ID is missing!")
        return

    # 1. Test getMe
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            me_resp = await client.get(f"https://api.telegram.org/bot{token}/getMe")
            me_data = me_resp.json()
            if not me_data.get("ok"):
                print(f"ERROR: getMe failed -> {me_data}")
                return
            bot_user = me_data["result"]
            print(f"SUCCESS: Bot verified: @{bot_user.get('username')} ({bot_user.get('first_name')})")
        except Exception as e:
            print(f"ERROR connecting to Telegram API: {e}")
            return

        # 2. Test sendMessage
        test_message = (
            "🚀 <b>DocBook Telegram Notifications Activated!</b>\n\n"
            "This is a test notification confirming that your Telegram Bot is connected and ready to deliver:\n"
            "• 🔔 Real-time appointment bookings\n"
            "• 🚨 Instant cancellation alerts\n"
            "• 💊 Prescription uploads & medicine orders\n\n"
            "<i>DocBook Healthcare System</i>"
        )
        try:
            send_resp = await client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": test_message,
                    "parse_mode": "HTML",
                },
            )
            send_data = send_resp.json()
            if send_data.get("ok"):
                print("SUCCESS: Test notification sent to Telegram chat successfully! Check your Telegram group!")
            else:
                print(f"ERROR sending message: {send_data}")
        except Exception as e:
            print(f"ERROR sending message: {e}")

if __name__ == "__main__":
    asyncio.run(main())
