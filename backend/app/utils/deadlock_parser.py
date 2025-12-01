# File: app/utils/deadlock_parser.py

"""
PostgreSQL Deadlock Parser - Parses deadlock information from PostgreSQL error messages.
Extracts detailed transaction and lock information to enable visualization and analysis.
"""

import re
import logging
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field, validator

from .base_parser import BaseParser

logger = logging.getLogger(__name__)


class LockInfo(BaseModel):
    """Information about a lock involved in a deadlock."""

    lock_type: str  # e.g., "relation", "tuple", "transactionid"
    relation: Optional[str] = None  # Table name if applicable
    database: Optional[str] = None
    lock_mode: str  # e.g., "ShareLock", "ExclusiveLock"
    granted: bool  # Whether the lock was granted or is waiting
    process_id: int  # Process ID holding or waiting for the lock


class Transaction(BaseModel):
    """Information about a transaction involved in a deadlock."""

    process_id: int
    query: Optional[str] = None
    tables_accessed: List[str] = Field(default_factory=list)
    locks_held: List[str] = Field(default_factory=list)
    locks_waiting: List[str] = Field(default_factory=list)
    application_name: Optional[str] = None
    username: Optional[str] = None

    @validator("tables_accessed", pre=True, each_item=False)
    def ensure_unique_tables(cls, v):
        """Ensures table names are unique."""
        if isinstance(v, list):
            return list(set(v))
        return v


class DeadlockCycle(BaseModel):
    """Represents a deadlock cycle between transactions."""

    processes: List[int]  # PIDs in cycle order
    relations: List[str] = Field(default_factory=list)  # Tables involved


class DeadlockInfo(BaseModel):
    """Complete representation of a PostgreSQL deadlock."""

    raw_message: str
    transactions: Dict[int, Transaction]  # Keyed by process ID
    locks: List[LockInfo]
    cycles: List[DeadlockCycle]  # Usually just one cycle
    visualization_data: Dict[str, Any]  # Data prepared for frontend visualization
    recommended_fix: Optional[str] = None


class DeadlockParser(BaseParser):
    """Parser for PostgreSQL deadlock information."""

    def parse(self, event_data: Dict[str, Any]) -> Optional[DeadlockInfo]:
        """
        Parse PostgreSQL deadlock information from Sentry event data.

        Args:
            event_data: The Sentry event containing the deadlock error

        Returns:
            DeadlockInfo object or None if no deadlock information can be parsed
        """
        # Extract deadlock message using base parser method
        message = self.extract_message(event_data)
        if not message:
            logger.info("No deadlock message found in event data")
            return None

        # Check if it's actually a deadlock
        if "deadlock detected" not in message.lower() and "40P01" not in message:
            logger.info("Message does not appear to be a PostgreSQL deadlock")
            return None

        logger.info("Parsing PostgreSQL deadlock message")

        try:
            # Extract raw information from the message
            raw_info = self._extract_raw_info(message)

            # Extract transactions
            transactions = self._extract_transactions(raw_info, message)

            # Extract locks
            locks = self._extract_locks(raw_info, message)

            # Build the transaction graph using base parser method
            edges = [(lock.process_id, lock.process_id) for lock in locks if not lock.granted]
            for process in raw_info.get("processes", []):
                edges.append((process["waiting_pid"], process["blocking_pid"]))

            graph = self.build_directed_graph(
                list({tx.process_id for tx in transactions}),
                edges
            )

            # Find deadlock cycles using base parser method
            cycles = self.find_cycles(graph)
            deadlock_cycles = [
                DeadlockCycle(
                    processes=cycle,
                    relations=list(set(
                        table
                        for tx in transactions
                        if tx.process_id in cycle
                        for table in tx.tables_accessed
                    ))
                )
                for cycle in cycles
            ]

            # Generate recommended fixes
            recommended_fix = self._generate_recommendation(transactions, locks, deadlock_cycles)

            # Prepare visualization data using base parser method
            node_labels = {tx.process_id: f"PID {tx.process_id}" for tx in transactions}
            node_metadata = {
                tx.process_id: {
                    "query": tx.query[:100] + "..." if tx.query and len(tx.query) > 100 else tx.query,
                    "tables": tx.tables_accessed,
                }
                for tx in transactions
            }
            visualization_data = self.prepare_graph_visualization_data(
                graph, node_labels, node_metadata
            )

            # Create complete deadlock info object
            return DeadlockInfo(
                raw_message=message,
                transactions={tx.process_id: tx for tx in transactions},
                locks=locks,
                cycles=deadlock_cycles,
                visualization_data=visualization_data,
                recommended_fix=recommended_fix,
            )
        except Exception as e:
            logger.exception(f"Error parsing deadlock: {str(e)}")
            return None

    def _extract_raw_info(self, message: str) -> Dict[str, Any]:
        """Extract basic information from a PostgreSQL deadlock message."""
        raw_info = {"processes": [], "relations": set(), "locks": []}

        # Extract process information using regex
        process_pattern = r"Process (\d+) waits for ([^;]+); blocked by process (\d+)"
        for match in re.finditer(process_pattern, message):
            waiting_pid, lock_desc, blocking_pid = match.groups()
            raw_info["processes"].append(
                {
                    "waiting_pid": int(waiting_pid),
                    "lock_desc": lock_desc.strip(),
                    "blocking_pid": int(blocking_pid),
                }
            )

        # Extract relation names
        relation_pattern = r"relation ([\w\.]+)"
        for match in re.finditer(relation_pattern, message):
            relation = match.group(1)
            # Handle schema.table format
            if "." in relation:
                schema, table = relation.split(".", 1)
                raw_info["relations"].add(table)
            else:
                raw_info["relations"].add(relation)

        # Extract lock information
        lock_pattern = r"((?:Share|Update|Exclusive)(?:Lock))(?:[^\(]+\(([^)]+)\))?"
        for match in re.finditer(lock_pattern, message):
            lock_mode, lock_detail = match.groups()
            raw_info["locks"].append(
                {"mode": lock_mode, "detail": lock_detail.strip() if lock_detail else None}
            )

        return raw_info

    def _extract_transactions(self, raw_info: Dict[str, Any], message: str) -> List[Transaction]:
        """Extract transaction information from the deadlock message."""
        transactions = []

        # First, collect all process IDs mentioned
        all_pids = set()
        for process in raw_info["processes"]:
            all_pids.add(process["waiting_pid"])
            all_pids.add(process["blocking_pid"])

        # Extract query information for each process
        for pid in all_pids:
            # Look for SQL queries in the message
            query_pattern = rf"Process {pid}:.*?statement: (.*?)(?=Process \d+:|$)"
            query_match = re.search(query_pattern, message, re.DOTALL)
            query = query_match.group(1).strip() if query_match else None

            # Extract tables from the query using base parser method
            tables_accessed = []
            if query:
                tables_accessed = self.extract_tables_from_sql(query)

            # Create transaction object
            transaction = Transaction(
                process_id=pid,
                query=query,
                tables_accessed=tables_accessed,
                locks_held=[],
                locks_waiting=[],
            )
            transactions.append(transaction)

        return transactions

    def _extract_locks(self, raw_info: Dict[str, Any], message: str) -> List[LockInfo]:
        """Extract lock information from the deadlock message."""
        locks = []

        for process_info in raw_info["processes"]:
            waiting_pid = process_info["waiting_pid"]
            blocking_pid = process_info["blocking_pid"]
            lock_desc = process_info["lock_desc"]

            # Parse lock type and mode
            lock_type = "relation"
            lock_mode = "ShareLock"

            # Extract more specific lock information if available
            if "ShareLock" in lock_desc:
                lock_mode = "ShareLock"
            elif "ExclusiveLock" in lock_desc:
                lock_mode = "ExclusiveLock"
            elif "RowExclusiveLock" in lock_desc:
                lock_mode = "RowExclusiveLock"

            # Extract relation name
            relation = None
            for rel in raw_info["relations"]:
                if rel in lock_desc:
                    relation = rel
                    break

            # Create lock info for waiting lock
            locks.append(
                LockInfo(
                    lock_type=lock_type,
                    relation=relation,
                    lock_mode=lock_mode,
                    granted=False,
                    process_id=waiting_pid,
                )
            )

            # Create lock info for granted lock (held by blocking process)
            locks.append(
                LockInfo(
                    lock_type=lock_type,
                    relation=relation,
                    lock_mode=lock_mode,
                    granted=True,
                    process_id=blocking_pid,
                )
            )

        return locks

    def _generate_recommendation(
        self, transactions: List[Transaction], locks: List[LockInfo], cycles: List[DeadlockCycle]
    ) -> str:
        """Generate recommendations for fixing the deadlock."""
        if not cycles:
            return "No cycles detected. Check transaction isolation levels."

        recommendations = []
        recommendations.append("PostgreSQL Deadlock Detected\n")
        recommendations.append(f"Found {len(cycles)} deadlock cycle(s)\n")

        for idx, cycle in enumerate(cycles, 1):
            recommendations.append(f"\nCycle {idx}:")
            recommendations.append(f"  Processes involved: {', '.join(map(str, cycle.processes))}")
            recommendations.append(f"  Tables involved: {', '.join(cycle.relations)}")

        recommendations.append("\nRecommendations:")
        recommendations.append("1. Ensure all transactions access tables in the same order")
        recommendations.append("2. Keep transactions short and focused")
        recommendations.append("3. Use appropriate lock timeouts")
        recommendations.append("4. Consider using SELECT FOR UPDATE NOWAIT")

        return "\n".join(recommendations)


# Public API function for backward compatibility
def parse_postgresql_deadlock(event_data: Dict[str, Any]) -> Optional[DeadlockInfo]:
    """
    Parse PostgreSQL deadlock information from Sentry event data.

    Args:
        event_data: The Sentry event containing the deadlock error

    Returns:
        DeadlockInfo object or None if no deadlock information can be parsed
    """
    parser = DeadlockParser()
    return parser.parse(event_data)

