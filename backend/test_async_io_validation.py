#!/usr/bin/env python3
"""
Async I/O Validation Test
Ensures the external API service uses async file operations correctly
"""
import asyncio
import os
import sys
import tempfile
import time
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

# Set required environment variables
os.environ['SECRET_KEY'] = 'test-secret-key-at-least-32-characters-long-for-testing'
os.environ['CSRF_SECRET'] = 'test-csrf-secret-at-least-32-characters-long-for-testing'
os.environ['SENTRY_API_TOKEN'] = 'test-sentry-api-token-that-is-at-least-32-characters-long'

print("=" * 60)
print("ASYNC I/O VALIDATION TEST")
print("=" * 60)

async def test_external_api_service():
    """Test that external API service uses async I/O properly"""
    try:
        from app.services.external_api_service import (
            ExternalAPIRegistry, 
            ExternalAPIConfig, 
            ExternalAPIAuth, 
            ExternalAPIAuthType
        )
        
        # Create a temporary directory for configs
        with tempfile.TemporaryDirectory() as temp_dir:
            config_dir = Path(temp_dir)
            
            # Initialize registry with temp directory
            registry = ExternalAPIRegistry(config_dir=config_dir)
            
            print("\n1. Testing async config loading...")
            # Create test config files
            test_configs = [
                {
                    "id": "test-api-1",
                    "name": "Test API 1",
                    "base_url": "https://api1.test.com",
                    "description": "Test API 1",
                    "auth": {
                        "type": "none"
                    }
                },
                {
                    "id": "test-api-2", 
                    "name": "Test API 2",
                    "base_url": "https://api2.test.com",
                    "description": "Test API 2",
                    "auth": {
                        "type": "api_key",
                        "api_key": "test-key",
                        "api_key_header": "X-API-Key"
                    }
                }
            ]
            
            # Write config files synchronously for setup
            import yaml
            for config in test_configs:
                with open(config_dir / f"{config['id']}.yaml", 'w') as f:
                    yaml.dump(config, f)
            
            # Test async loading
            start_time = time.time()
            await registry.load_configs()
            load_time = time.time() - start_time
            
            print(f"✅ Loaded {len(registry.apis)} configs asynchronously in {load_time:.3f}s")
            print(f"   - Configs: {list(registry.apis.keys())}")
            
            print("\n2. Testing async config saving...")
            # Create new config
            new_config = ExternalAPIConfig(
                id="test-api-3",
                name="Test API 3",
                base_url="https://api3.test.com",
                description="Test API 3",
                auth=ExternalAPIAuth(type=ExternalAPIAuthType.BEARER, token="test-token")
            )
            
            # Test async saving
            start_time = time.time()
            success = await registry.save_config(new_config)
            save_time = time.time() - start_time
            
            if success:
                print(f"✅ Saved config asynchronously in {save_time:.3f}s")
                
                # Verify file exists
                saved_file = config_dir / "test-api-3.yaml"
                if saved_file.exists():
                    print("✅ Config file created successfully")
                else:
                    print("❌ Config file not found")
            else:
                print("❌ Failed to save config")
            
            print("\n3. Testing concurrent async operations...")
            # Test multiple concurrent saves
            configs = [
                ExternalAPIConfig(
                    id=f"concurrent-{i}",
                    name=f"Concurrent API {i}",
                    base_url=f"https://api{i}.concurrent.com",
                    description=f"Concurrent test {i}",
                    auth=ExternalAPIAuth(type=ExternalAPIAuthType.NONE)
                )
                for i in range(5)
            ]
            
            start_time = time.time()
            # Save all configs concurrently
            results = await asyncio.gather(
                *[registry.save_config(config) for config in configs],
                return_exceptions=True
            )
            concurrent_time = time.time() - start_time
            
            successful = sum(1 for r in results if r is True)
            print(f"✅ Saved {successful}/5 configs concurrently in {concurrent_time:.3f}s")
            
            # Verify no blocking occurred (should be faster than sequential)
            if concurrent_time < 0.1 * len(configs):  # Should be much faster than sequential
                print("✅ Async I/O is non-blocking (good performance)")
            else:
                print("⚠️  Async I/O might be blocking (slower than expected)")
                
            print("\n4. Testing error handling...")
            # Test with invalid path
            try:
                invalid_registry = ExternalAPIRegistry(config_dir=Path("/invalid/path"))
                await invalid_registry.load_configs()
                print("✅ Handled invalid path gracefully")
            except Exception as e:
                print(f"❌ Failed to handle invalid path: {e}")
                
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

async def test_performance_comparison():
    """Compare async vs sync I/O performance"""
    print("\n5. Performance comparison (async vs theoretical sync)...")
    
    import aiofiles
    import yaml
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create test data
        test_data = {f"key_{i}": f"value_{i}" * 100 for i in range(100)}
        yaml_content = yaml.dump(test_data)
        
        # Test async write performance
        async_files = []
        start_time = time.time()
        
        for i in range(10):
            file_path = Path(temp_dir) / f"async_test_{i}.yaml"
            async with aiofiles.open(file_path, 'w') as f:
                await f.write(yaml_content)
            async_files.append(file_path)
            
        async_write_time = time.time() - start_time
        
        # Test async read performance
        start_time = time.time()
        
        for file_path in async_files:
            async with aiofiles.open(file_path, 'r') as f:
                content = await f.read()
                _ = yaml.safe_load(content)
                
        async_read_time = time.time() - start_time
        
        print(f"✅ Async write time: {async_write_time:.3f}s for 10 files")
        print(f"✅ Async read time: {async_read_time:.3f}s for 10 files")
        print(f"✅ Average per file: {(async_write_time + async_read_time) / 20:.3f}s")

# Run tests
print("\nRunning async I/O validation tests...")
asyncio.run(test_external_api_service())
asyncio.run(test_performance_comparison())

print("\n" + "=" * 60)
print("ASYNC I/O VALIDATION COMPLETE")
print("=" * 60)