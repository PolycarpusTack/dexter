"""
Resource monitoring utilities for system metrics.

This module provides functions for monitoring system resources
such as CPU, memory, disk, and network usage in a cross-platform manner.
"""
import os
import time
import platform
import logging
from typing import Dict, Any, Tuple

# Set up logging
logger = logging.getLogger(__name__)

# Type hints
ResourceMetrics = Dict[str, Any]

# Constants
DEFAULT_CPU_PERCENT = 50.0
DEFAULT_MEMORY_BYTES = 4 * 1024 * 1024 * 1024  # 4 GB
DEFAULT_TOTAL_MEMORY = 8 * 1024 * 1024 * 1024  # 8 GB
DEFAULT_DISK_BYTES = 50 * 1024 * 1024 * 1024  # 50 GB
DEFAULT_TOTAL_DISK = 100 * 1024 * 1024 * 1024  # 100 GB
DEFAULT_NET_RATE = 1024 * 10  # 10 KB/s
DEFAULT_NET_BYTES = 1024  # 1 KB

# Global state
last_net_time: float = time.time()
last_net_in_bytes: int = 0
last_net_out_bytes: int = 0


def get_cpu_usage() -> float:
    """
    Get CPU usage percentage in a cross-platform manner.

    Returns:
        float: CPU usage percentage (0-100)
    """
    try:
        if hasattr(os, "getloadavg"):
            # Unix-like systems (Linux, macOS)
            load = os.getloadavg()[0]
            # Convert load average to an approximate percentage
            # On a machine with N cores, a load of N represents 100% utilization
            # We'll use a simple approximation here
            cpu_count = os.cpu_count() or 1
            cpu_percent = min(100.0, (load / cpu_count) * 100)
            return cpu_percent
        else:
            # Windows or other platforms
            logger.debug("getloadavg not available, using default CPU value")
            return DEFAULT_CPU_PERCENT
    except (AttributeError, OSError) as e:
        logger.warning(f"Error getting CPU usage: {e}")
        return DEFAULT_CPU_PERCENT


def get_memory_info() -> Dict[str, int]:
    """
    Get memory usage in a cross-platform manner.

    Returns:
        Dict with keys:
            - used: Memory used in bytes
            - total: Total memory in bytes
            - percent: Percentage used (0-100)
    """
    try:
        # Try platform-specific memory detection
        if platform.system() == "Linux":
            return _get_linux_memory()
        elif platform.system() == "Darwin":  # macOS
            return _get_macos_memory()
        elif platform.system() == "Windows":
            return _get_windows_memory()
        else:
            logger.debug(f"Unknown platform for memory: {platform.system()}")
            return {
                "used": DEFAULT_MEMORY_BYTES,
                "total": DEFAULT_TOTAL_MEMORY,
                "percent": (DEFAULT_MEMORY_BYTES / DEFAULT_TOTAL_MEMORY) * 100,
            }
    except Exception as e:
        logger.warning(f"Error getting memory info: {e}")
        return {
            "used": DEFAULT_MEMORY_BYTES,
            "total": DEFAULT_TOTAL_MEMORY,
            "percent": (DEFAULT_MEMORY_BYTES / DEFAULT_TOTAL_MEMORY) * 100,
        }


def _get_linux_memory() -> Dict[str, int]:
    """Get memory info on Linux systems."""
    try:
        with open("/proc/meminfo", "r") as f:
            meminfo = {}
            for line in f:
                key, value = line.split(":", 1)
                value = value.strip()
                if value.endswith("kB"):
                    value = int(value.rstrip("kB")) * 1024
                meminfo[key.strip()] = value

        total = int(meminfo.get("MemTotal", DEFAULT_TOTAL_MEMORY))
        free = int(meminfo.get("MemFree", 0))
        buffers = int(meminfo.get("Buffers", 0))
        cached = int(meminfo.get("Cached", 0))

        used = total - free - buffers - cached
        percent = (used / total) * 100 if total > 0 else 0

        return {"used": used, "total": total, "percent": percent}
    except Exception as e:
        logger.warning(f"Error reading Linux memory info: {e}")
        raise


def _get_macos_memory() -> Dict[str, int]:
    """Get memory info on macOS systems."""
    # For a real implementation, use subprocess to call
    # vm_stat and sysctl commands
    # This is a simplified version
    return {"used": DEFAULT_MEMORY_BYTES, "total": DEFAULT_TOTAL_MEMORY, "percent": 60.0}


def _get_windows_memory() -> Dict[str, int]:
    """Get memory info on Windows systems."""
    # For a real implementation, use ctypes to call Windows API
    # This is a simplified version
    return {"used": DEFAULT_MEMORY_BYTES, "total": DEFAULT_TOTAL_MEMORY, "percent": 60.0}


def get_disk_info(path: str = None) -> Dict[str, int]:
    """
    Get disk usage for the specified path (or default system disk).

    Args:
        path: Path to check disk usage for (default: root or C: on Windows)

    Returns:
        Dict with keys:
            - used: Disk space used in bytes
            - total: Total disk space in bytes
            - percent: Percentage used (0-100)
    """
    # Determine path based on platform if not specified
    if path is None:
        path = "/" if platform.system() != "Windows" else "C:\\"

    try:
        # Try platform-agnostic approach
        if hasattr(os, "statvfs"):  # Unix-like systems
            try:
                statvfs = os.statvfs(path)
                total = statvfs.f_blocks * statvfs.f_frsize
                free = statvfs.f_bfree * statvfs.f_frsize
                used = total - free
                percent = (used / total) * 100 if total > 0 else 0

                return {"used": used, "total": total, "percent": percent}
            except OSError:
                logger.warning(f"Error accessing path: {path}")

        # For platforms without statvfs or if it failed
        logger.debug("Using default disk values")
        return {
            "used": DEFAULT_DISK_BYTES,
            "total": DEFAULT_TOTAL_DISK,
            "percent": 70.0,  # Default percentage
        }
    except Exception as e:
        logger.warning(f"Error getting disk info: {e}")
        return {"used": DEFAULT_DISK_BYTES, "total": DEFAULT_TOTAL_DISK, "percent": 70.0}


def get_network_io() -> Dict[str, float]:
    """
    Get network I/O statistics.

    Returns:
        Dict with keys:
            - in_bytes: Bytes received since last call
            - out_bytes: Bytes sent since last call
            - in_rate: Receive rate in bytes/second
            - out_rate: Send rate in bytes/second
    """
    global last_net_time, last_net_in_bytes, last_net_out_bytes

    try:
        # Get current network stats
        current_time = time.time()
        current_in, current_out = _get_network_counters()

        # Calculate bytes transferred since last call
        in_bytes = max(0, current_in - last_net_in_bytes)
        out_bytes = max(0, current_out - last_net_out_bytes)

        # Calculate time elapsed
        time_diff = current_time - last_net_time

        # Calculate rates (bytes per second)
        in_rate = in_bytes / time_diff if time_diff > 0 else 0
        out_rate = out_bytes / time_diff if time_diff > 0 else 0

        # Update last values for next call
        last_net_in_bytes = current_in
        last_net_out_bytes = current_out

        return {
            "in_bytes": in_bytes,
            "out_bytes": out_bytes,
            "in_rate": in_rate,
            "out_rate": out_rate,
        }
    except Exception as e:
        logger.warning(f"Error getting network IO: {e}")
        return {
            "in_bytes": DEFAULT_NET_BYTES,
            "out_bytes": DEFAULT_NET_BYTES,
            "in_rate": DEFAULT_NET_RATE,
            "out_rate": DEFAULT_NET_RATE / 2,
        }


def _get_network_counters() -> Tuple[int, int]:
    """
    Get network byte counters (platform-specific).

    Returns:
        Tuple of (bytes_received, bytes_sent)
    """
    try:
        if platform.system() == "Linux":
            return _get_linux_network()
        elif platform.system() == "Darwin":  # macOS
            return _get_macos_network()
        elif platform.system() == "Windows":
            return _get_windows_network()
        else:
            # For unknown platforms, use incremental mock values
            mock_in = last_net_in_bytes + DEFAULT_NET_BYTES
            mock_out = last_net_out_bytes + (DEFAULT_NET_BYTES // 2)
            return (mock_in, mock_out)
    except Exception as e:
        logger.warning(f"Error getting network counters: {e}")
        mock_in = last_net_in_bytes + DEFAULT_NET_BYTES
        mock_out = last_net_out_bytes + (DEFAULT_NET_BYTES // 2)
        return (mock_in, mock_out)


def _get_linux_network() -> Tuple[int, int]:
    """Get network counters on Linux systems."""
    try:
        with open("/proc/net/dev", "r") as f:
            lines = f.readlines()

        # Skip headers (first two lines)
        bytes_recv = 0
        bytes_sent = 0

        for line in lines[2:]:
            # Parse the line
            parts = line.strip().split(":", 1)
            if len(parts) != 2:
                continue

            interface = parts[0].strip()
            if interface == "lo":  # Skip loopback
                continue

            values = parts[1].strip().split()
            if len(values) < 10:
                continue

            # Received bytes is the first value, transmitted is the 9th
            bytes_recv += int(values[0])
            bytes_sent += int(values[8])

        return (bytes_recv, bytes_sent)
    except Exception as e:
        logger.warning(f"Error reading Linux network info: {e}")
        raise


def _get_macos_network() -> Tuple[int, int]:
    """Get network counters on macOS systems."""
    # For a real implementation, use subprocess to call
    # netstat command
    # This is a simplified version
    mock_in = last_net_in_bytes + DEFAULT_NET_BYTES
    mock_out = last_net_out_bytes + (DEFAULT_NET_BYTES // 2)
    return (mock_in, mock_out)


def _get_windows_network() -> Tuple[int, int]:
    """Get network counters on Windows systems."""
    # For a real implementation, use WMI or another Windows-specific method
    # This is a simplified version
    mock_in = last_net_in_bytes + DEFAULT_NET_BYTES
    mock_out = last_net_out_bytes + (DEFAULT_NET_BYTES // 2)
    return (mock_in, mock_out)


def get_resource_metrics() -> ResourceMetrics:
    """
    Get comprehensive resource metrics for the system.

    Returns:
        Dict containing all resource metrics
    """
    # Get CPU metrics
    cpu_percent = get_cpu_usage()

    # Get memory metrics
    memory_info = get_memory_info()

    # Get disk metrics
    disk_info = get_disk_info()

    # Get network metrics
    network_info = get_network_io()

    # Combine all metrics
    return {
        "cpu_percent": cpu_percent,
        "memory_used": memory_info["used"],
        "memory_total": memory_info["total"],
        "memory_percent": memory_info["percent"],
        "disk_used": disk_info["used"],
        "disk_total": disk_info["total"],
        "disk_percent": disk_info["percent"],
        "net_in_bytes": network_info["in_bytes"],
        "net_out_bytes": network_info["out_bytes"],
        "net_in_rate": network_info["in_rate"],
        "net_out_rate": network_info["out_rate"],
        "timestamp": time.time(),
    }
