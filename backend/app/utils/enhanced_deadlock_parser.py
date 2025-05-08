"""
Enhanced PostgreSQL Deadlock Parser - Parses deadlock information from PostgreSQL error messages.
Extracts detailed transaction and lock information to enable visualization and analysis.

This version includes:
- Improved lock-to-process linking
- Structured lock references in Transaction models
- PII redaction for queries
- Lock compatibility matrix
- Query fingerprinting
- Enhanced recommendations
- Improved error handling and context
"""

import re
import logging
import networkx as nx
import hashlib
import functools
from typing import Dict, List, Set, Optional, Any, Tuple, Union, TypeVar, Type
from pydantic import BaseModel, Field

# Handle compatibility between Pydantic v1 and v2
try:
    from pydantic import model_validator, field_validator
except ImportError:
    from pydantic.validators import validator as field_validator
    from pydantic import validator as model_validator

# Helper function to handle model serialization consistently
def model_to_dict(model):
    """Convert a Pydantic model to a dict, handling version differences."""
    if model is None:
        return None
        
    if hasattr(model, 'model_dump'):
        return model.model_dump()  # Pydantic v2
    if hasattr(model, 'dict'):
        return model.dict()  # Pydantic v1
        
    # Fallback for non-model objects
    if isinstance(model, dict):
        return model
    if isinstance(model, (list, tuple)):
        return [model_to_dict(item) for item in model]
        
    # For primitive types
    return model
from datetime import datetime, timedelta
from enum import Enum, auto

logger = logging.getLogger(__name__)

# Type variable for generic model methods
T = TypeVar('T', bound=BaseModel)

# PostgreSQL lock modes
class LockMode(str, Enum):
    ACCESS_SHARE = "AccessShareLock"
    ROW_SHARE = "RowShareLock"
    ROW_EXCLUSIVE = "RowExclusiveLock"
    SHARE_UPDATE_EXCLUSIVE = "ShareUpdateExclusiveLock"
    SHARE = "ShareLock"
    SHARE_ROW_EXCLUSIVE = "ShareRowExclusiveLock"
    EXCLUSIVE = "ExclusiveLock"
    ACCESS_EXCLUSIVE = "AccessExclusiveLock"

# Lock type enumeration
class LockType(str, Enum):
    RELATION = "relation"
    TUPLE = "tuple"
    TRANSACTIONID = "transactionid"
    VIRTUALXID = "virtualxid"
    OBJECT = "object"
    PAGE = "page"
    EXTEND = "extend"
    ADVISORY = "advisory"
    OTHER = "other"

# PostgreSQL lock compatibility matrix
# True means the locks are compatible; False means they conflict
LOCK_COMPATIBILITY_MATRIX = {
    LockMode.ACCESS_SHARE: {
        LockMode.ACCESS_SHARE: True,
        LockMode.ROW_SHARE: True,
        LockMode.ROW_EXCLUSIVE: True,
        LockMode.SHARE_UPDATE_EXCLUSIVE: True,
        LockMode.SHARE: True,
        LockMode.SHARE_ROW_EXCLUSIVE: True,
        LockMode.EXCLUSIVE: True,
        LockMode.ACCESS_EXCLUSIVE: False
    },
    LockMode.ROW_SHARE: {
        LockMode.ACCESS_SHARE: True,
        LockMode.ROW_SHARE: True,
        LockMode.ROW_EXCLUSIVE: True,
        LockMode.SHARE_UPDATE_EXCLUSIVE: True,
        LockMode.SHARE: True,
        LockMode.SHARE_ROW_EXCLUSIVE: True,
        LockMode.EXCLUSIVE: False,
        LockMode.ACCESS_EXCLUSIVE: False
    },
    LockMode.ROW_EXCLUSIVE: {
        LockMode.ACCESS_SHARE: True,
        LockMode.ROW_SHARE: True,
        LockMode.ROW_EXCLUSIVE: True,
        LockMode.SHARE_UPDATE_EXCLUSIVE: True,
        LockMode.SHARE: False,
        LockMode.SHARE_ROW_EXCLUSIVE: False,
        LockMode.EXCLUSIVE: False,
        LockMode.ACCESS_EXCLUSIVE: False
    },
    LockMode.SHARE_UPDATE_EXCLUSIVE: {
        LockMode.ACCESS_SHARE: True,
        LockMode.ROW_SHARE: True,
        LockMode.ROW_EXCLUSIVE: True,
        LockMode.SHARE_UPDATE_EXCLUSIVE: False,
        LockMode.SHARE: False,
        LockMode.SHARE_ROW_EXCLUSIVE: False,
        LockMode.EXCLUSIVE: False,
        LockMode.ACCESS_EXCLUSIVE: False
    },
    LockMode.SHARE: {
        LockMode.ACCESS_SHARE: True,
        LockMode.ROW_SHARE: True,
        LockMode.ROW_EXCLUSIVE: False,
        LockMode.SHARE_UPDATE_EXCLUSIVE: False,
        LockMode.SHARE: True,
        LockMode.SHARE_ROW_EXCLUSIVE: False,
        LockMode.EXCLUSIVE: False,
        LockMode.ACCESS_EXCLUSIVE: False
    },
    LockMode.SHARE_ROW_EXCLUSIVE: {
        LockMode.ACCESS_SHARE: True,
        LockMode.ROW_SHARE: True,
        LockMode.ROW_EXCLUSIVE: False,
        LockMode.SHARE_UPDATE_EXCLUSIVE: False,
        LockMode.SHARE: False,
        LockMode.SHARE_ROW_EXCLUSIVE: False,
        LockMode.EXCLUSIVE: False,
        LockMode.ACCESS_EXCLUSIVE: False
    },
    LockMode.EXCLUSIVE: {
        LockMode.ACCESS_SHARE: True,
        LockMode.ROW_SHARE: False,
        LockMode.ROW_EXCLUSIVE: False,
        LockMode.SHARE_UPDATE_EXCLUSIVE: False,
        LockMode.SHARE: False,
        LockMode.SHARE_ROW_EXCLUSIVE: False,
        LockMode.EXCLUSIVE: False,
        LockMode.ACCESS_EXCLUSIVE: False
    },
    LockMode.ACCESS_EXCLUSIVE: {
        LockMode.ACCESS_SHARE: False,
        LockMode.ROW_SHARE: False,
        LockMode.ROW_EXCLUSIVE: False,
        LockMode.SHARE_UPDATE_EXCLUSIVE: False,
        LockMode.SHARE: False,
        LockMode.SHARE_ROW_EXCLUSIVE: False,
        LockMode.EXCLUSIVE: False,
        LockMode.ACCESS_EXCLUSIVE: False
    }
}

class LockInfo(BaseModel):
    """Information about a lock involved in a deadlock."""
    lock_type: Union[LockType, str]  # Type of lock
    relation: Optional[str] = None  # Table name if applicable
    database: Optional[str] = None  # Database name if available
    lock_mode: Union[LockMode, str]  # Lock mode
    granted: bool  # Whether the lock was granted or is waiting
    process_id: int  # Process ID holding or waiting for the lock
    resource_id: Optional[str] = None  # Object ID, tuple ID, etc.
    
    @field_validator('lock_type')
    @classmethod
    def validate_lock_type(cls, v):
        """Convert string lock type to enum if possible."""
        if isinstance(v, str) and v in [lt.value for lt in LockType]:
            return LockType(v)
        return v
    
    @field_validator('lock_mode')
    @classmethod
    def validate_lock_mode(cls, v):
        """Convert string lock mode to enum if possible."""
        if isinstance(v, str) and v in [lm.value for lm in LockMode]:
            return LockMode(v)
        return v
    
    def is_compatible_with(self, other: 'LockInfo') -> bool:
        """Check if this lock is compatible with another lock."""
        # Only relevant for locks on the same relation
        if self.relation != other.relation or self.relation is None:
            return True
            
        # Convert lock modes to enum if they're not already
        self_mode = self.lock_mode
        other_mode = other.lock_mode
        
        if isinstance(self_mode, str):
            # Try to find closest match
            for lm in LockMode:
                if lm.value.lower() in self_mode.lower():
                    self_mode = lm
                    break
        
        if isinstance(other_mode, str):
            # Try to find closest match
            for lm in LockMode:
                if lm.value.lower() in other_mode.lower():
                    other_mode = lm
                    break
                    
        # If still strings, we can't determine compatibility
        if isinstance(self_mode, str) or isinstance(other_mode, str):
            return False  # Assume incompatible if we can't determine
            
        # Use compatibility matrix
        return LOCK_COMPATIBILITY_MATRIX.get(self_mode, {}).get(other_mode, False)

    def get_formatted_description(self) -> str:
        """Get a formatted description of this lock."""
        base = f"{self.lock_mode} on {self.lock_type}"
        if self.relation:
            base += f" {self.relation}"
        if self.resource_id:
            base += f" (ID: {self.resource_id})"
        return base
    
    # Add method to convert to dict for Pydantic v1 compatibility
    def dict(self, *args, **kwargs):
        """Convert to dictionary for Pydantic v1 compatibility."""
        if hasattr(self, 'model_dump'):
            return self.model_dump(*args, **kwargs)
        # Use the original method if we're on Pydantic v1
        return super().dict(*args, **kwargs)
        
    class Config:
        from_attributes = True

class QueryFingerprint(BaseModel):
    """Query fingerprint for identifying similar queries."""
    original_query: str
    normalized_query: str
    hash: str
    parameterized_query: Optional[str] = None
    
    @classmethod
    def from_query(cls, query: str) -> 'QueryFingerprint':
        """Create a fingerprint from a SQL query."""
        if not query:
            return cls(
                original_query="",
                normalized_query="",
                hash=""
            )
            
        # Basic normalization: lowercase, collapse whitespace
        normalized = re.sub(r'\s+', ' ', query.lower().strip())
        
        # More advanced: replace literals with placeholders
        # Replace numbers
        parameterized = re.sub(r'\b\d+\b', '?', normalized)
        # Replace quoted strings
        parameterized = re.sub(r"'[^']*'", "'?'", parameterized)
        # Replace double-quoted identifiers
        parameterized = re.sub(r'"[^"]*"', '"?"', parameterized)
        
        # Create hash of parameterized query
        hash_obj = hashlib.md5(parameterized.encode())
        
        return cls(
            original_query=query,
            normalized_query=normalized,
            parameterized_query=parameterized,
            hash=hash_obj.hexdigest()
        )
        
    # Add method to convert to dict for Pydantic v1 compatibility
    def dict(self, *args, **kwargs):
        """Convert to dictionary for Pydantic v1 compatibility."""
        if hasattr(self, 'model_dump'):
            return self.model_dump(*args, **kwargs)
        # Use the original method if we're on Pydantic v1
        return super().dict(*args, **kwargs)

class Transaction(BaseModel):
    """Information about a transaction involved in a deadlock."""
    process_id: int
    query: Optional[str] = None
    query_fingerprint: Optional[QueryFingerprint] = None
    tables_accessed: List[str] = Field(default_factory=list)
    locks_held: List[int] = Field(default_factory=list)  # IDs of locks held by this transaction
    locks_waiting: List[int] = Field(default_factory=list)  # IDs of locks this transaction is waiting for
    application_name: Optional[str] = None
    username: Optional[str] = None
    start_time: Optional[datetime] = None
    query_duration: Optional[timedelta] = None
    lock_wait_duration: Optional[timedelta] = None  
    
    @field_validator('tables_accessed')
    @classmethod
    def ensure_unique_tables(cls, v):
        """Ensures table names are unique."""
        if isinstance(v, list):
            return list(set(v))
        return v
    
    @model_validator(mode='after')
    def create_fingerprint(self):
        """Create query fingerprint if query exists."""
        if self.query and not self.query_fingerprint:
            self.query_fingerprint = QueryFingerprint.from_query(self.query)
        return self
    
    # Add method to convert to dict for Pydantic v1 compatibility
    def dict(self, *args, **kwargs):
        """Convert to dictionary for Pydantic v1 compatibility."""
        if hasattr(self, 'model_dump'):
            return self.model_dump(*args, **kwargs)
        # Use the original method if we're on Pydantic v1
        return super().dict(*args, **kwargs)
    
    class Config:
        from_attributes = True

class DeadlockCycle(BaseModel):
    """Represents a deadlock cycle between transactions."""
    processes: List[int]  # PIDs in cycle order
    relations: List[str] = Field(default_factory=list)  # Tables involved
    severity: int = 0  # Severity score (higher is more severe)
    
    # Add method to convert to dict for Pydantic v1 compatibility
    def dict(self, *args, **kwargs):
        """Convert to dictionary for Pydantic v1 compatibility."""
        if hasattr(self, 'model_dump'):
            return self.model_dump(*args, **kwargs)
        # Use the original method if we're on Pydantic v1
        return super().dict(*args, **kwargs)
    
    class Config:
        from_attributes = True

class DeadlockInfo(BaseModel):
    """Complete representation of a PostgreSQL deadlock."""
    raw_message: str
    transactions: Dict[int, Transaction]  # Keyed by process ID
    locks: List[LockInfo]
    cycles: List[DeadlockCycle]  # Usually just one cycle
    visualization_data: Dict[str, Any]  # Data prepared for frontend visualization
    recommended_fix: Optional[str] = None
    timestamp: Optional[datetime] = Field(default_factory=datetime.now)
    severity_score: int = 0  # Overall severity score
    
    def get_lock_by_id(self, lock_id: int) -> Optional[LockInfo]:
        """Get a lock by its position in the locks list."""
        if 0 <= lock_id < len(self.locks):
            return self.locks[lock_id]
        return None
    
    def calculate_severity(self) -> int:
        """Calculate the severity score of this deadlock."""
        score = 0
        
        # More cycles = more complex deadlock
        score += len(self.cycles) * 10
        
        # More transactions involved = more severe
        score += len(self.transactions) * 5
        
        # More locks = more complex
        score += len(self.locks) * 2
        
        # Special tables increase severity (critical tables for your application)
        critical_tables = {"users", "accounts", "payments", "orders"}
        for cycle in self.cycles:
            for relation in cycle.relations:
                if relation.lower() in critical_tables:
                    score += 15
        
        # Higher lock modes increase severity
        for lock in self.locks:
            if isinstance(lock.lock_mode, LockMode):
                if lock.lock_mode in [LockMode.EXCLUSIVE, LockMode.ACCESS_EXCLUSIVE]:
                    score += 5
                elif lock.lock_mode in [LockMode.SHARE_ROW_EXCLUSIVE, LockMode.SHARE]:
                    score += 3
        
        self.severity_score = score
        return score
    
    # Add method to convert to dict for Pydantic v1 compatibility
    def dict(self, *args, **kwargs):
        """Convert to dictionary for Pydantic v1 compatibility."""
        if hasattr(self, 'model_dump'):
            return self.model_dump(*args, **kwargs)
        # Use the original method if we're on Pydantic v1
        return super().dict(*args, **kwargs)
    
    class Config:
        from_attributes = True

def redact_pii_from_query(query: str) -> str:
    """Redact potentially sensitive information from SQL queries."""
    if not query:
        return query
        
    # Redact email addresses
    query = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', query)
    
    # Redact UUIDs
    query = re.sub(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', '[UUID]', query)
    
    # Redact potential credit card numbers (16 digits with possible separators)
    query = re.sub(r'\b(?:\d{4}[-\s]?){3}\d{4}\b', '[CC_NUMBER]', query)
    
    # Redact phone numbers (various formats)
    query = re.sub(r'\b\+?1?[-\s]?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}\b', '[PHONE]', query)
    
    # Redact IP addresses
    query = re.sub(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', '[IP_ADDRESS]', query)
    
    return query

@functools.lru_cache(maxsize=100)
def compile_regex(pattern: str, flags: int = 0) -> re.Pattern:
    """Compile regex patterns with caching for performance."""
    return re.compile(pattern, flags)

def parse_postgresql_deadlock(event_data: Dict[str, Any]) -> Optional[DeadlockInfo]:
    """
    Parse PostgreSQL deadlock information from Sentry event data.
    
    Args:
        event_data: The Sentry event containing the deadlock error
        
    Returns:
        DeadlockInfo object or None if no deadlock information can be parsed
    """
    try:
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
        
        # Extract raw information from the message
        raw_info = _extract_raw_info(message)
        
        # Extract transactions
        transactions = _extract_transactions(raw_info, message)
        
        # Extract locks
        locks = _extract_locks(raw_info, message)
        
        # Map transactions to locks
        _link_transactions_to_locks(transactions, locks)
        
        # Build the transaction graph
        graph = _build_transaction_graph(transactions, locks)
        
        # Find deadlock cycles
        cycles = _find_deadlock_cycles(graph, transactions, locks)
        
        # Create DeadlockInfo object
        deadlock_info = DeadlockInfo(
            raw_message=message,
            transactions={tx.process_id: tx for tx in transactions},
            locks=locks,
            cycles=cycles,
            visualization_data={},  # Will be filled later
            recommended_fix=None  # Will be filled later
        )
        
        # Generate recommended fixes
        recommended_fix = _generate_recommendation(deadlock_info)
        deadlock_info.recommended_fix = recommended_fix
        
        # Calculate severity
        deadlock_info.calculate_severity()
        
        # Prepare visualization data for frontend
        visualization_data = _prepare_visualization_data(deadlock_info, graph)
        deadlock_info.visualization_data = visualization_data
        
        return deadlock_info
        
    except Exception as e:
        # Enhanced error logging with context
        context = {
            "event_id": event_data.get("id", "unknown"),
            "project": event_data.get("project", {}).get("name", "unknown"),
            "error_type": "deadlock_parsing_error"
        }
        logger.exception(f"Error parsing deadlock: {str(e)}. Context: {context}")
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
    process_pattern = compile_regex(r'Process (\d+) waits for ([^;]+); blocked by process (\d+)')
    for match in process_pattern.finditer(message):
        waiting_pid, lock_desc, blocking_pid = match.groups()
        raw_info["processes"].append({
            "waiting_pid": int(waiting_pid),
            "lock_desc": lock_desc.strip(),
            "blocking_pid": int(blocking_pid)
        })
    
    # Extract relation names
    relation_pattern = compile_regex(r'relation ([\w\.]+)')
    for match in relation_pattern.finditer(message):
        relation = match.group(1)
        # Handle schema.table format
        if '.' in relation:
            schema, table = relation.split('.', 1)
            raw_info["relations"].add(table)
        else:
            raw_info["relations"].add(relation)
    
    # Extract lock information
    lock_pattern = compile_regex(r'((?:Share|Update|Exclusive)(?:Lock))(?:[^\(]+\(([^)]+)\))?')
    for match in lock_pattern.finditer(message):
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
        query_pattern = compile_regex(fr'Process {pid}:.*?statement: (.*?)(?=Process \d+:|$)', re.DOTALL)
        query_match = query_pattern.search(message)
        query = query_match.group(1).strip() if query_match else None
        
        # Redact PII from query
        if query:
            query = redact_pii_from_query(query)
        
        # Extract application name if available
        app_pattern = compile_regex(fr'Process {pid}: application_name: ([^\n]+)')
        app_match = app_pattern.search(message)
        app_name = app_match.group(1).strip() if app_match else None
        
        # Extract username if available
        user_pattern = compile_regex(fr'Process {pid}: user=([^\s,]+)')
        user_match = user_pattern.search(message)
        username = user_match.group(1).strip() if user_match else None
        
        # Extract tables from the query if available
        tables_accessed = []
        if query:
            tables_accessed = _extract_tables_from_query(query)
        
        # Create transaction object
        transaction = Transaction(
            process_id=pid,
            query=query,
            tables_accessed=tables_accessed,
            application_name=app_name,
            username=username,
            # We'll fill these later
            locks_held=[],
            locks_waiting=[],
        )
        
        # Create query fingerprint
        if query:
            transaction.query_fingerprint = QueryFingerprint.from_query(query)
        
        transactions.append(transaction)
    
    return transactions

def _extract_locks(raw_info: Dict[str, Any], message: str) -> List[LockInfo]:
    """Extract lock information from the deadlock message."""
    locks = []
    
    # Look for specific lock patterns in the message
    lock_pattern = compile_regex(r'((?:Share|Update|Exclusive)(?:Lock)) on ([^\s]+)(?: ([^\s]+))? (granted|waiting)')
    for match in lock_pattern.finditer(message):
        lock_mode, lock_type, resource, status = match.groups()
        granted = status == "granted"
        
        # Try to determine the process ID
        # This is tricky and might need improvement for different PostgreSQL versions
        context_pattern = compile_regex(fr'Process (\d+).*?{lock_mode}.*?{lock_type}.*?{status}', re.DOTALL)
        context_match = context_pattern.search(message)
        process_id = int(context_match.group(1)) if context_match else -1
        
        relation = None
        resource_id = None
        
        if lock_type == "relation" and resource:
            # Handle schema.table format
            if '.' in resource:
                schema, table = resource.split('.', 1)
                relation = table
            else:
                relation = resource
        elif resource:
            # For non-relation locks, the resource might be an ID
            resource_id = resource
        
        # Map lock mode string to enum if possible
        lock_mode_enum = None
        for lm in LockMode:
            if lm.value.lower() in lock_mode.lower():
                lock_mode_enum = lm
                break
        
        # Map lock type string to enum if possible
        lock_type_enum = None
        for lt in LockType:
            if lt.value.lower() == lock_type.lower():
                lock_type_enum = lt
                break
        
        lock = LockInfo(
            lock_type=lock_type_enum or lock_type,
            relation=relation,
            lock_mode=lock_mode_enum or lock_mode,
            granted=granted,
            process_id=process_id,
            resource_id=resource_id
        )
        locks.append(lock)
    
    return locks

def _link_transactions_to_locks(transactions: List[Transaction], locks: List[LockInfo]) -> None:
    """Link transactions to their corresponding locks."""
    # Create a mapping of process IDs to transactions for easy lookup
    tx_map = {tx.process_id: tx for tx in transactions}
    
    # Link locks to transactions
    for i, lock in enumerate(locks):
        tx = tx_map.get(lock.process_id)
        if tx:
            if lock.granted:
                tx.locks_held.append(i)
            else:
                tx.locks_waiting.append(i)

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
        regex = compile_regex(pattern, re.IGNORECASE)
        for match in regex.finditer(query):
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
        waiting_lock_ids = tx.locks_waiting
        
        for lock_id in waiting_lock_ids:
            if lock_id < 0 or lock_id >= len(locks):
                continue
                
            waiting_lock = locks[lock_id]
            
            # Find transactions holding conflicting locks
            for other_tx in transactions:
                if other_tx.process_id == tx.process_id:
                    continue  # Skip self
                
                # Find granted locks for the other transaction
                for held_lock_id in other_tx.locks_held:
                    if held_lock_id < 0 or held_lock_id >= len(locks):
                        continue
                        
                    held_lock = locks[held_lock_id]
                    
                    # Check if they conflict
                    # Locks conflict if they're on the same relation and incompatible
                    if (waiting_lock.relation and 
                        waiting_lock.relation == held_lock.relation and 
                        not waiting_lock.is_compatible_with(held_lock)):
                        
                        # Add an edge: waiting -> blocking
                        graph.add_edge(
                            tx.process_id, 
                            other_tx.process_id,
                            waiting_lock_id=lock_id,
                            blocking_lock_id=held_lock_id
                        )
    
    return graph

def _find_deadlock_cycles(graph: nx.DiGraph, transactions: List[Transaction], locks: List[LockInfo]) -> List[DeadlockCycle]:
    """Find cycles in the transaction graph that represent deadlocks."""
    cycles = []
    
    try:
        # Find all elementary circuits (cycles) in the directed graph
        for cycle in nx.simple_cycles(graph):
            if len(cycle) > 1:  # Ignore self-cycles
                # Get tables involved in this cycle
                relations = set()
                severity = 0
                
                for i in range(len(cycle)):
                    pid = cycle[i]
                    next_pid = cycle[(i + 1) % len(cycle)]
                    edge_data = graph.get_edge_data(pid, next_pid)
                    
                    if edge_data and 'waiting_lock_id' in edge_data:
                        waiting_lock_id = edge_data['waiting_lock_id']
                        if 0 <= waiting_lock_id < len(locks):
                            waiting_lock = locks[waiting_lock_id]
                            if waiting_lock.relation:
                                relations.add(waiting_lock.relation)
                                
                                # Higher severity for more restrictive locks
                                if isinstance(waiting_lock.lock_mode, LockMode):
                                    if waiting_lock.lock_mode in [LockMode.EXCLUSIVE, LockMode.ACCESS_EXCLUSIVE]:
                                        severity += 5
                                    elif waiting_lock.lock_mode in [LockMode.SHARE_ROW_EXCLUSIVE, LockMode.SHARE]:
                                        severity += 3
                
                # Calculate cycle severity based on various factors
                severity += len(cycle) * 5  # More processes = more severe
                severity += len(relations) * 3  # More tables = more severe
                
                # Check if any critical tables are involved
                critical_tables = {"users", "accounts", "payments", "orders"}
                for relation in relations:
                    if relation.lower() in critical_tables:
                        severity += 10
                
                cycles.append(DeadlockCycle(
                    processes=cycle,
                    relations=list(relations),
                    severity=severity
                ))
    except Exception as e:
        logger.exception(f"Error finding cycles: {str(e)}")
    
    # Sort cycles by severity (highest first)
    cycles.sort(key=lambda c: c.severity, reverse=True)
    
    return cycles

def _generate_recommendation(deadlock_info: DeadlockInfo) -> str:
    """Generate context-aware recommendations to prevent similar deadlocks."""
    transactions = list(deadlock_info.transactions.values())
    locks = deadlock_info.locks
    cycles = deadlock_info.cycles
    
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
        
        # Find lock modes involved in the deadlock
        lock_modes = set()
        for lock in locks:
            if isinstance(lock.lock_mode, LockMode):
                lock_modes.add(lock.lock_mode.value)
            else:
                lock_modes.add(str(lock.lock_mode))
        
        lock_modes_str = ", ".join(sorted(lock_modes))
        
        # Analyze queries to identify potential patterns
        query_patterns = set()
        for tx in transactions:
            if tx.query:
                if "UPDATE" in tx.query.upper():
                    query_patterns.add("UPDATE")
                if "INSERT" in tx.query.upper():
                    query_patterns.add("INSERT")
                if "DELETE" in tx.query.upper():
                    query_patterns.add("DELETE")
                if "SELECT FOR UPDATE" in tx.query.upper():
                    query_patterns.add("SELECT FOR UPDATE")
                    
        query_patterns_str = ", ".join(sorted(query_patterns))
        
        # Check for common deadlock patterns
        has_update_update = "UPDATE" in query_patterns and len(query_patterns) == 1
        has_select_for_update = "SELECT FOR UPDATE" in query_patterns
        has_exclusive_locks = any(
            ("EXCLUSIVE" in str(lock.lock_mode).upper() and "ROW" not in str(lock.lock_mode).upper())
            for lock in locks
        )
        
        recommendation = f"""
## Deadlock Analysis

This deadlock involves **{len(transactions)}** processes that were attempting to access the following tables: **{tables_str}**.

### Root Cause

The deadlock occurred because multiple transactions were trying to acquire locks ({lock_modes_str}) on the same tables but in different orders, creating a circular waiting pattern.
"""

        # Add pattern-specific recommendations
        if has_update_update:
            recommendation += """
The deadlock was caused by concurrent UPDATE statements that acquired row locks in different orders.
"""
        elif has_select_for_update:
            recommendation += """
The deadlock involved SELECT FOR UPDATE statements, which acquire exclusive row locks that can easily conflict with other transactions.
"""
        elif has_exclusive_locks:
            recommendation += """
The deadlock involved exclusive locks, which block most other lock types and frequently cause deadlocks when multiple transactions attempt to acquire them in different orders.
"""
        
        recommendation += f"""
### Recommended Solutions

1. **Consistent Access Order**: Ensure all transactions access tables in the same order:
   ```
   {table_order}
   ```
"""

        # Add pattern-specific solutions
        if has_update_update:
            recommendation += """
2. **Row Locking Strategy**: For UPDATE operations:
   - Consider using optimistic concurrency control instead of locks where possible
   - Add `FOR UPDATE SKIP LOCKED` for queue-like workloads
   - Add explicit transaction ordering in the application
"""
        elif has_select_for_update:
            recommendation += """
2. **FOR UPDATE Usage**: Review SELECT FOR UPDATE usage:
   - Consider using FOR SHARE when you don't need to modify the rows
   - Add NOWAIT or SET lock_timeout to prevent long lock waits
   - Consider alternative designs that minimize lock contention
"""
        else:
            recommendation += """
2. **Transaction Scope**: Reduce the scope of transactions to minimize lock contention:
   - Keep transactions as short as possible
   - Only lock the tables you actually need to modify
   - Break large transactions into smaller ones where possible
"""

        recommendation += """
3. **Lock Mode Optimization**: Consider using less restrictive lock modes:
   - Use `FOR SHARE` instead of `FOR UPDATE` when possible
   - Use `NOWAIT` option to fail fast rather than deadlock
   - Consider optimistic concurrency control where appropriate

4. **Application Changes**: Review application code that accesses these tables:
   - Look for functions/methods that update multiple tables
   - Ensure all code paths use consistent table access ordering
   - Consider using advisory locks for complex operations

5. **Database Configuration**:
   - Review and possibly adjust `deadlock_timeout` setting (current default is 1s)
   - Consider setting appropriate `statement_timeout` to prevent long-running transactions
   - Enable `log_lock_waits` to catch potential deadlock situations before they occur
"""

        # Add specific examples if we have queries
        if any(tx.query for tx in transactions):
            recommendation += """
### Example Code Pattern

Based on the queries involved, consider refactoring your transactions to follow this pattern:

```sql
BEGIN;
-- Always access tables in alphabetical order
"""
            for table in sorted(all_tables):
                if any("UPDATE" in tx.query.upper() for tx in transactions if tx.query):
                    recommendation += f"UPDATE {table} SET ... WHERE ...;\n"
                else:
                    recommendation += f"-- Lock {table} first if needed\nSELECT * FROM {table} WHERE ... FOR SHARE;\n"
            
            recommendation += "COMMIT;\n```"

    else:
        # Generic recommendation if we couldn't identify specific tables
        recommendation = """
## Deadlock Analysis

A deadlock has been detected in your PostgreSQL database.

### Recommended Solutions

1. **Consistent Table Access Order**: Ensure all transactions access tables in the same consistent order.

2. **Short Transactions**: Keep transactions as short as possible to minimize lock contention time.

3. **Appropriate Lock Modes**: Use the least restrictive lock mode that meets your requirements.

4. **Set Timeouts**: Consider using NOWAIT option or setting lock_timeout to avoid indefinite waits.

5. **Monitor and Log**: Enable deadlock monitoring (log_lock_waits = on) to better understand lock patterns.
        """
    
    return recommendation

def _prepare_visualization_data(deadlock_info: DeadlockInfo, graph: nx.DiGraph) -> Dict[str, Any]:
    """Prepare data for frontend visualization of the deadlock."""
    transactions = list(deadlock_info.transactions.values())
    locks = deadlock_info.locks
    cycles = deadlock_info.cycles
    
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
            "locks_held": [locks[lock_id].get_formatted_description() for lock_id in tx.locks_held if lock_id < len(locks)],
            "locks_waiting": [locks[lock_id].get_formatted_description() for lock_id in tx.locks_waiting if lock_id < len(locks)],
            "inCycle": tx.process_id in cycle_pids,
            "application": tx.application_name,
            "username": tx.username,
            "queryFingerprint": tx.query_fingerprint.hash if tx.query_fingerprint else None
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
        waiting_lock_id = data.get('waiting_lock_id')
        blocking_lock_id = data.get('blocking_lock_id')
        
        waiting_lock = locks[waiting_lock_id] if waiting_lock_id is not None and waiting_lock_id < len(locks) else None
        blocking_lock = locks[blocking_lock_id] if blocking_lock_id is not None and blocking_lock_id < len(locks) else None
        
        details = ""
        if waiting_lock and blocking_lock:
            details = f"{waiting_lock.get_formatted_description()} conflicts with {blocking_lock.get_formatted_description()}"
        elif waiting_lock:
            details = waiting_lock.get_formatted_description()
            
        edges.append({
            "source": f"process_{u}",
            "target": f"process_{v}",
            "label": "waits for",
            "inCycle": u in cycle_pids and v in cycle_pids,
            "details": details
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
    
    # Add information about lock compatibility for tooltips
    lock_compatibility = {}
    for mode1 in LockMode:
        lock_compatibility[mode1.value] = {}
        for mode2 in LockMode:
            lock_compatibility[mode1.value][mode2.value] = LOCK_COMPATIBILITY_MATRIX.get(mode1, {}).get(mode2, False)
    
    return {
        "nodes": nodes,
        "edges": edges,
        "cycles": [
            {
                "processes": cycle.processes, 
                "relations": cycle.relations,
                "severity": cycle.severity
            } 
            for cycle in cycles
        ],
        "lockCompatibility": lock_compatibility,
        "severity": deadlock_info.severity_score
    }
