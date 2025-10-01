# Task 004: Multi-Tenant Architecture
**Priority**: Critical (for SaaS deployment)
**Estimated Duration**: 3 weeks
**Dependencies**: TASK_001 (RBAC must be complete)
**Can Run Parallel With**: TASK_006 only

## Overview
Transform Dexter from single-tenant to multi-tenant architecture, enabling SaaS deployment and enterprise isolation. This is critical for scaling beyond single organization use.

## Objectives
- Implement data isolation per tenant
- Enable tenant-specific configurations
- Ensure performance at scale
- Maintain security boundaries

## Technical Requirements

### Backend Architecture

#### 1. Tenant Models
```python
# backend/app/models/tenant.py
class Tenant(BaseModel):
    id: UUID
    slug: str  # unique identifier in URLs
    name: str
    plan: str  # free, pro, enterprise
    status: str  # active, suspended, cancelled
    settings: Dict[str, Any]
    created_at: datetime
    storage_quota: int
    api_quota: int

class TenantUser(BaseModel):
    tenant_id: UUID
    user_id: UUID
    role: str
    joined_at: datetime
```

#### 2. Database Strategy - Hybrid Approach
```python
# Shared tables with tenant_id column
- users (with tenant_id)
- events (with tenant_id)
- issues (with tenant_id)

# Tenant-specific schemas
- tenant_1.custom_analyzers
- tenant_2.custom_analyzers

# Shared reference data
- public.error_categories
- public.ai_models
```

#### 3. Tenant Context Management
```python
# backend/app/middleware/tenant_middleware.py
class TenantMiddleware:
    async def __call__(self, request: Request, call_next):
        # Extract tenant from subdomain or header
        tenant = self.extract_tenant(request)
        
        # Set tenant context for request
        request.state.tenant = tenant
        
        # Configure tenant-specific database
        set_tenant_schema(tenant.id)
        
        response = await call_next(request)
        return response
```

### Frontend Architecture

#### 1. Tenant-Aware Routing
```typescript
// frontend/src/utils/tenant.ts
export const getTenantFromUrl = () => {
  // subdomain.dexter.com
  const subdomain = window.location.hostname.split('.')[0]
  return subdomain
}

// Or path-based: dexter.com/t/tenant-slug
export const getTenantFromPath = () => {
  const match = window.location.pathname.match(/^\/t\/([^\/]+)/)
  return match?.[1]
}
```

#### 2. Tenant Configuration Store
```typescript
// frontend/src/store/tenantStore.ts
interface TenantState {
  current: Tenant | null
  settings: TenantSettings
  branding: TenantBranding
  limits: TenantLimits
}
```

## Implementation Steps

### Phase 1: Database Multi-Tenancy (Week 1)

1. **Schema Design**
   - [ ] Add tenant_id to all data tables
   - [ ] Create tenant management tables
   - [ ] Design quota tracking schema
   - [ ] Plan migration strategy

2. **Data Isolation**
   ```sql
   -- Row-level security policies
   CREATE POLICY tenant_isolation ON events
   FOR ALL TO application_role
   USING (tenant_id = current_setting('app.current_tenant')::uuid);
   ```

3. **Connection Pooling**
   - [ ] Implement per-tenant connection pools
   - [ ] Dynamic schema switching
   - [ ] Connection limit management
   - [ ] Performance monitoring

4. **Migration Scripts**
   ```python
   # Migrate single-tenant to multi-tenant
   def migrate_to_multi_tenant():
       # 1. Add tenant_id columns
       # 2. Create default tenant
       # 3. Update all rows with default tenant_id
       # 4. Add foreign key constraints
       # 5. Create RLS policies
   ```

### Phase 2: Application Layer (Week 2)

1. **Tenant Resolution**
   ```python
   # Multiple strategies
   def resolve_tenant(request):
       # 1. Subdomain
       if subdomain := extract_subdomain(request.host):
           return get_tenant_by_slug(subdomain)
       
       # 2. Header (for API clients)
       if tenant_id := request.headers.get('X-Tenant-ID'):
           return get_tenant_by_id(tenant_id)
       
       # 3. JWT claim
       if token := decode_jwt(request):
           return get_tenant_by_id(token.tenant_id)
   ```

2. **Tenant Middleware**
   - [ ] Request context injection
   - [ ] Automatic query filtering
   - [ ] Tenant validation
   - [ ] Cross-tenant prevention

3. **API Updates**
   - [ ] Add tenant context to all queries
   - [ ] Update cache keys with tenant_id
   - [ ] Tenant-specific rate limiting
   - [ ] Audit logging with tenant info

4. **Background Jobs**
   - [ ] Tenant-aware job queues
   - [ ] Isolated job processing
   - [ ] Tenant quota enforcement
   - [ ] Priority by tenant plan

### Phase 3: Frontend & Testing (Week 3)

1. **UI Updates**
   - [ ] Tenant switcher (for admins)
   - [ ] Tenant-specific branding
   - [ ] Usage dashboards
   - [ ] Billing integration prep

2. **Testing Infrastructure**
   - [ ] Multi-tenant test fixtures
   - [ ] Isolation verification tests
   - [ ] Performance benchmarks
   - [ ] Security penetration tests

## Tenant Isolation Strategies

### 1. Database Isolation
```python
# Option A: Separate schemas
tenant_schema = f"tenant_{tenant_id}"
await db.execute(f"SET search_path TO {tenant_schema}, public")

# Option B: Row-level security
await db.execute(f"SET app.current_tenant = '{tenant_id}'")
```

### 2. Cache Isolation
```python
# Tenant-prefixed cache keys
cache_key = f"tenant:{tenant_id}:issues:{issue_id}"
```

### 3. File Storage Isolation
```python
# S3 bucket structure
s3_path = f"tenants/{tenant_id}/attachments/{file_id}"
```

### 4. Search Index Isolation
```python
# Elasticsearch index per tenant
index_name = f"dexter-{tenant_id}-events"
```

## Performance Considerations

### 1. Database Optimization
```sql
-- Partition large tables by tenant_id
CREATE TABLE events_partitioned (
    LIKE events INCLUDING ALL
) PARTITION BY HASH (tenant_id);

-- Composite indexes
CREATE INDEX idx_events_tenant_timestamp 
ON events(tenant_id, timestamp DESC);
```

### 2. Caching Strategy
```python
# Two-tier cache
# L1: In-memory per tenant (small, hot data)
# L2: Redis shared (larger, warm data)
cache_hierarchy = {
    "L1": {"size": "100MB", "ttl": 300},
    "L2": {"size": "10GB", "ttl": 3600}
}
```

### 3. Resource Limits
```python
tenant_limits = {
    "free": {
        "api_calls_per_hour": 1000,
        "storage_gb": 1,
        "users": 5
    },
    "enterprise": {
        "api_calls_per_hour": 100000,
        "storage_gb": 1000,
        "users": -1  # unlimited
    }
}
```

## Security Requirements

### 1. Tenant Isolation Verification
```python
# Automated tests
async def test_tenant_isolation():
    # Create events in tenant A
    # Try to access from tenant B context
    # Should return empty/forbidden
```

### 2. Cross-Tenant Prevention
```python
# Middleware to prevent tenant hopping
if request.tenant_id != resource.tenant_id:
    raise CrossTenantAccessError()
```

### 3. Admin Access
```python
# Super admin can access all tenants
if user.is_super_admin:
    # Bypass tenant filtering
    # Log all access
```

## Migration Plan

### Phase 1: Preparation
1. Deploy RBAC system
2. Create tenant tables
3. Add tenant_id columns (nullable)

### Phase 2: Migration
1. Create default tenant
2. Assign all users to default
3. Update all records with tenant_id
4. Make tenant_id required

### Phase 3: Activation
1. Enable tenant middleware
2. Deploy tenant-aware UI
3. Enable subdomain routing
4. Monitor for issues

## Testing Checklist

- [ ] Data isolation between tenants
- [ ] Performance with 100+ tenants
- [ ] Tenant creation/deletion
- [ ] Resource limit enforcement
- [ ] Billing integration points
- [ ] Backup/restore per tenant
- [ ] Tenant data export
- [ ] GDPR compliance per tenant

## Success Criteria

- [ ] Complete data isolation verified
- [ ] <10ms overhead from multi-tenancy
- [ ] Support 1000+ active tenants
- [ ] No cross-tenant data leaks
- [ ] Automated tenant provisioning
- [ ] Per-tenant backup/restore

## Future Enhancements

1. **Tenant Templates**: Pre-configured setups
2. **White Labeling**: Full UI customization
3. **Tenant Marketplace**: Shared analyzers
4. **Geographic Isolation**: Region-specific deployment