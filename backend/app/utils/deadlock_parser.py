# File: app/utils/deadlock_parser.py

"""
PostgreSQL Deadlock Parser - Parses deadlock information from PostgreSQL error messages.
Extracts detailed transaction and lock information to enable visualization and analysis.
"""

import re
import logging
import networkx as nx
from typing import Dict, List, Set, Optional, Any, Tuple
from pydantic import BaseModel, Field, validator

logger = logging.getLogger(__name__)

class LockInfo(BaseModel):
    """Information about a lock involved in a deadlock."""
    lock_type: str  # e.g., "relation", "tuple", "transactionid"
    relation: Optional[str] = None  # Table name if applicable
    database: Optional[str] = None
    lock_mode: str  # e.g., "ShareLock", "ExclusiveLock"
    granted: bool   # Whether the lock was granted or is waiting
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
    
    @validator('tables_accessed', pre=True, each_item=False)
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

def parse_postgresql_deadlock(event_data: Dict[str, Any]) -> Optional[DeadlockInfo]:
    """
    Parse PostgreSQL deadlock information from Sentry event data.
    
    Args:
        event_data: The Sentry event containing the deadlock error
        
    Returns:
        DeadlockInfo object or None if no deadlock information can be parsed
    """
    # Extract deadlock message from various possible locations
    message = _extract_deadlock_message(event_data)
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
        raw_info = _extract_raw_info(message)
        
        # Extract transactions
        transactions = _extract_transactions(raw_info, message)
        
        # Extract locks
        locks = _extract_locks(raw_info, message)
        
        # Build the transaction graph
        graph = _build_transaction_graph(transactions, locks)
        
        # Find deadlock cycles
        cycles = _find_deadlock_cycles(graph)
        
        # Generate recommended fixes
        recommended_fix = _generate_recommendation(transactions, locks, cycles)
        
        # Prepare visualization data for frontend
        visualization_data = _prepare_visualization_data(transactions, locks, cycles, graph)
        
        # Create complete deadlock info object
        return DeadlockInfo(
            raw_message=message,
            transactions={tx.process_id: tx for tx in transactions},
            locks=locks,
            cycles=cycles,
            visualization_data=visualization_data,
            recommended_fix=recommended_fix
        )
    except Exception as e:
        logger.exception(f"Error parsing deadlock: {str(e)}")
        return None

def _extract_deadlock_message(event_data: Dict[str, Any]) -> Optional[str]:
    """Extract deadlock message from Sentry event data."""
    # Check direct message field
    if "message" in event_data:
        return event_data["message"]
    
    # Check exception values
    exception_values = event_data.get("exception", {}).get("values", [])
    for exception in exception_values:
        if "value" in exception:
            return str(exception["value"])
    
    # Check in entries
    for entry in event_data.get("entries", []):
        if entry.get("type") == "exception":
            values = entry.get("data", {}).get("values", [])
            for value in values:
                if "value" in value:
                    return str(value["value"])
    
    return None

def _extract_raw_info(message: str) -> Dict[str, Any]:
    """Extract basic information from a PostgreSQL deadlock message."""
    raw_info = {
        "processes": [],
        "relations": set(),
        "locks": []
    }
    
    # Extract process information using regex
    process_pattern = r'Process (\d+) waits for ([^;]+); blocked by process (\d+)'
    for match in re.finditer(process_pattern, message):
        waiting_pid, lock_desc, blocking_pid = match.groups()
        raw_info["processes"].append({
            "waiting_pid": int(waiting_pid),
            "lock_desc": lock_desc.strip(),
            "blocking_pid": int(blocking_pid)
        })
    
    # Extract relation names
    relation_pattern = r'relation ([\w\.]+)'
    for match in re.finditer(relation_pattern, message):
        relation = match.group(1)
        # Handle schema.table format
        if '.' in relation:
            schema, table = relation.split('.', 1)
            raw_info["relations"].add(table)
        else:
            raw_info["relations"].add(relation)
    
    # Extract lock information
    lock_pattern = r'((?:Share|Update|Exclusive)(?:Lock))(?:[^\(]+\(([^)]+)\))?'
    for match in re.finditer(lock_pattern, message):
        lock_mode, lock_detail = match.groups()
        raw_info["locks"].append({
            "mode": lock_mode,
            "detail": lock_detail.strip() if lock_detail else None
        })
    
    return raw_info

def _extract_transactions(raw_info: Dict[str, Any], message: str) -> List[Transaction]:
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
        query_pattern = fr'Process {pid}:.*?statement: (.*?)(?=Process \d+:|$)'
        query_match = re.search(query_pattern, message, re.DOTALL)
        query = query_match.group(1).strip() if query_match else None
        
        # Extract tables from the query if available
        tables_accessed = []
        if query:
            tables_accessed = _extract_tables_from_query(query)
        
        # Create transaction object
        transaction = Transaction(
            process_id=pid,
            query=query,
            tables_accessed=tables_accessed,
            # We'll fill these later
            locks_held=[],
            locks_waiting=[],
        )
        transactions.append(transaction)
    
    return transactions

def _extract_locks(raw_info: Dict[str, Any], message: str) -> List[LockInfo]:
    """Extract lock information from the deadlock message."""
    locks = []
    
    # Look for specific lock patterns in the message
    lock_pattern = r'((?:Share|Update|Exclusive)(?:Lock)) on ([^\s]+)(?: ([^\s]+))? (granted|waiting)'
    for match in re.finditer(lock_pattern, message):
        lock_mode, lock_type, resource, status = match.groups()
        granted = status == "granted"
        
        # Try to determine the process ID
        # This is tricky and might need improvement for different PostgreSQL versions
        context_pattern = fr'Process (\d+).*?{lock_mode}.*?{lock_type}.*?{status}'
        context_match = re.search(context_pattern, message, re.DOTALL)
        process_id = int(context_match.group(1)) if context_match else -1
        
        relation = None
        if lock_type == "relation" and resource:
            # Handle schema.table format
            if '.' in resource:
                schema, table = resource.split('.', 1)
                relation = table
            else:
                relation = resource
        
        lock = LockInfo(
            lock_type=lock_type,
            relation=relation,
            lock_mode=lock_mode,
            granted=granted,
            process_id=process_id
        )
        locks.append(lock)
    
    return locks

def _extract_tables_from_query(query: str) -> List[str]:
    """Extract table names from an SQL query."""
    tables = set()
    
    # Look for tables in various SQL clauses
    patterns = [
        r'FROM\s+([a-zA-Z0-9_"\.]+)',
        r'JOIN\s+([a-zA-Z0-9_"\.]+)',
        r'UPDATE\s+([a-zA-Z0-9_"\.]+)',
        r'INSERT\s+INTO\s+([a-zA-Z0-9_"\.]+)',
        r'DELETE\s+FROM\s+([a-zA-Z0-9_"\.]+)'
    ]
    
    for pattern in patterns:
        for match in re.finditer(pattern, query, re.IGNORECASE):
            table = match.group(1)
            # Handle schema.table format
            if '.' in table:
                schema, table_name = table.split('.', 1)
                tables.add(table_name.strip('"'))
            else:
                tables.add(table.strip('"'))
    
    return list(tables)

def _build_transaction_graph(transactions: List[Transaction], locks: List[LockInfo]) -> nx.DiGraph:
    """Build a directed graph representing transaction wait-for relationships."""
    graph = nx.DiGraph()
    
    # Add all transactions as nodes
    for tx in transactions:
        graph.add_node(tx.process_id, transaction=tx)
    
    # Add edges based on lock information
    # A waiting process points to the blocking process
    for tx in transactions:
        # Find waiting locks for this transaction
        waiting_locks = [lock for lock in locks if lock.process_id == tx.process_id and not lock.granted]
        
        for waiting_lock in waiting_locks:
            # Find transactions holding conflicting locks
            for other_tx in transactions:
                if other_tx.process_id == tx.process_id:
                    continue  # Skip self
                
                # Find granted locks for the other transaction
                granted_locks = [lock for lock in locks if lock.process_id == other_tx.process_id and lock.granted]
                
                # Check if they conflict
                for granted_lock in granted_locks:
                    if granted_lock.relation == waiting_lock.relation:
                        # Add an edge: waiting -> blocking
                        graph.add_edge(
                            tx.process_id, 
                            other_tx.process_id,
                            waiting_lock=waiting_lock,
                            blocking_lock=granted_lock
                        )
                        
                        # Update transaction objects with lock information
                        tx.locks_waiting.append(f"{waiting_lock.lock_mode} on {waiting_lock.relation}")
                        other_tx.locks_held.append(f"{granted_lock.lock_mode} on {granted_lock.relation}")
    
    return graph

def _find_deadlock_cycles(graph: nx.DiGraph) -> List[DeadlockCycle]:
    """Find cycles in the transaction graph that represent deadlocks."""
    cycles = []
    
    try:
        # Find all elementary circuits (cycles) in the directed graph
        for cycle in nx.simple_cycles(graph):
            if len(cycle) > 1:  # Ignore self-cycles
                # Get tables involved in this cycle
                relations = set()
                for i in range(len(cycle)):
                    pid = cycle[i]
                    next_pid = cycle[(i + 1) % len(cycle)]
                    edge_data = graph.get_edge_data(pid, next_pid)
                    if edge_data and 'waiting_lock' in edge_data:
                        waiting_lock = edge_data['waiting_lock']
                        if waiting_lock.relation:
                            relations.add(waiting_lock.relation)
                
                cycles.append(DeadlockCycle(
                    processes=cycle,
                    relations=list(relations)
                ))
    except Exception as e:
        logger.exception(f"Error finding cycles: {str(e)}")
    
    return cycles

def _generate_recommendation(transactions: List[Transaction], locks: List[LockInfo], cycles: List[DeadlockCycle]) -> str:
    """Generate recommendations to prevent similar deadlocks."""
    if not cycles:
        return "Unable to generate recommendations without a clear deadlock cycle."
    
    # Get all tables involved in the deadlock
    all_tables = set()
    for cycle in cycles:
        all_tables.update(cycle.relations)
    
    for tx in transactions:
        all_tables.update(tx.tables_accessed)
    
    # Create recommendation based on tables involved
    if all_tables:
        tables_str = ", ".join(sorted(all_tables))
        table_order = " → ".join(sorted(all_tables))
        
        recommendation = f"""
## Deadlock Analysis

This deadlock involves **{len(transactions)}** processes that were attempting to access the following tables: **{tables_str}**.

### Root Cause

The deadlock occurred because multiple transactions were trying to acquire locks on the same tables but in different orders, creating a circular waiting pattern.

### Recommended Solutions

1. **Consistent Access Order**: Ensure all transactions access tables in the same order:
   ```
   {table_order}
   ```

2. **Transaction Scope**: Reduce the scope of transactions to minimize lock contention:
   - Keep transactions as short as possible
   - Only lock the tables you actually need to modify

3. **Lock Mode Optimization**: Consider using less restrictive lock modes:
   - Use `FOR SHARE` instead of `FOR UPDATE` when possible
   - Use `NOWAIT` option to fail fast rather than deadlock

4. **Application Changes**: Review application code that accesses these tables:
   - Look for functions/methods that update multiple tables
   - Ensure all code paths use consistent table access ordering
   - Consider using advisory locks for complex operations

5. **Database Configuration**:
   - Review and possibly adjust `deadlock_timeout` setting
   - Consider setting appropriate `statement_timeout` to prevent long-running transactions
        """
    else:
        # Generic recommendation if we couldn't identify specific tables
        recommendation = """
## Deadlock Analysis

A deadlock was detected between multiple database processes, but specific details could not be fully extracted.

### Recommended Solutions

1. **Consistent Access Order**: Ensure all transactions access tables in the same consistent order

2. **Transaction Scope**: Keep transactions as short as possible and only lock necessary tables

3. **Lock Mode Optimization**: Use the least restrictive lock modes that will work for your operations

4. **Query Review**: Review queries involved in the transaction to identify potential optimizations

5. **Database Monitoring**: Consider setting up deadlock monitoring to track occurrence patterns
        """
    
    return recommendation

def _prepare_visualization_data(
    transactions: List[Transaction], 
    locks: List[LockInfo], 
    cycles: List[DeadlockCycle], 
    graph: nx.DiGraph
) -> Dict[str, Any]:
    """Prepare data for frontend visualization of the deadlock."""
    nodes = []
    edges = []
    
    # Create cycle info for highlighting
    cycle_pids = set()
    for cycle in cycles:
        cycle_pids.update(cycle.processes)
    
    # Create nodes for transactions (processes)
    for tx in transactions:
        nodes.append({
            "id": f"process_{tx.process_id}",
            "label": f"Process {tx.process_id}",
            "type": "process",
            "tables": tx.tables_accessed,
            "query": tx.query[:100] + "..." if tx.query and len(tx.query) > 100 else tx.query,
            "locks_held": tx.locks_held,
            "locks_waiting": tx.locks_waiting,
            "inCycle": tx.process_id in cycle_pids
        })
    
    # Create nodes for tables
    tables = set()
    for tx in transactions:
        tables.update(tx.tables_accessed)
    
    for table in tables:
        nodes.append({
            "id": f"table_{table}",
            "label": table,
            "type": "table",
            "inCycle": any(table in cycle.relations for cycle in cycles)
        })
    
    # Create edges for wait-for relationships
    for u, v, data in graph.edges(data=True):
        edges.append({
            "source": f"process_{u}",
            "target": f"process_{v}",
            "label": "waits for",
            "inCycle": u in cycle_pids and v in cycle_pids,
            "details": f"{data.get('waiting_lock').lock_mode} on {data.get('waiting_lock').relation}" 
                      if data.get('waiting_lock') else ""
        })
    
    # Create edges for table access relationships
    for tx in transactions:
        for table in tx.tables_accessed:
            edges.append({
                "source": f"process_{tx.process_id}",
                "target": f"table_{table}",
                "label": "accesses",
                "inCycle": False  # Access edges are not part of the deadlock cycle
            })
    
    return {
        "nodes": nodes,
        "edges": edges,
        "cycles": [{"processes": cycle.processes, "relations": cycle.relations} for cycle in cycles]
    }
