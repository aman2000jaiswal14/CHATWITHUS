import asyncio
from playwright.async_api import async_playwright
import sys

async def run_e2e():
    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()
            
            print("Connecting to application...")
            # Assuming the app is running on localhost:8000
            try:
                await page.goto("http://localhost:8000/accounts/login/", timeout=10000)
            except Exception as e:
                print(f"❌ Failed to connect to http://localhost:8000. Is the server running? Error: {e}")
                await browser.close()
                return False
            
            print(f"Logging in as e2e_tester...")
            await page.fill('input[name="username"]', "e2e_tester")
            await page.fill('input[name="password"]', "password123")
            await page.click('button[type="submit"]')
            
            await page.wait_for_load_state("networkidle")
            print(f"Page title after login: {await page.title()}")
            
            # Simple check for 'root' element (Chat Widget)
            # Give it a small timeout to ensure JS loads
            try:
                await page.wait_for_selector("#root", timeout=5000)
                root_exists = True
            except:
                root_exists = False
                
            print(f"Chat widget root exists: {root_exists}")
            
            await browser.close()
            return root_exists
        except Exception as e:
            print(f"❌ E2E Test Error: {e}")
            return False

if __name__ == "__main__":
    success = asyncio.run(run_e2e())
    if not success:
        sys.exit(1)
    print("✅ E2E Test Passed!")
