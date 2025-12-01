"""
Simple integration test to verify the API is working
"""
import asyncio
import httpx
import json

async def test_api():
    """Test basic API functionality"""
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient() as client:
        # Test root endpoint
        print("Testing root endpoint...")
        response = await client.get(f"{base_url}/")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        print()
        
        # Test health endpoint
        print("Testing health endpoint...")
        response = await client.get(f"{base_url}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        print()
        
        # Test auth login endpoint
        print("Testing auth login endpoint...")
        response = await client.post(f"{base_url}/api/v1/auth/login")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Test token refresh
            print("\nTesting token refresh...")
            refresh_response = await client.post(
                f"{base_url}/api/v1/auth/refresh",
                json={"refresh_token": data.get("refresh_token")}
            )
            print(f"Status: {refresh_response.status_code}")
            if refresh_response.status_code == 200:
                print(f"Response: {json.dumps(refresh_response.json(), indent=2)}")
        print()

if __name__ == "__main__":
    asyncio.run(test_api())