# Username Migration Plan

## Current Analysis
✅ **Current State:**
- Users table has `name: text("name").notNull()` field (line 8 in shared/schema.ts)
- Frontend uses "Full Name" label in AuthForms.tsx (line 217)
- No username field exists currently
- No username uniqueness constraints

## Username Requirements & Validation Rules

### Username Constraints:
- **Length**: 3-20 characters
- **Characters**: Alphanumeric + underscore + hyphen only (a-z, A-Z, 0-9, _, -)
- **Format**: Must start with letter or number (not underscore/hyphen)
- **Case**: Case-insensitive uniqueness (store lowercase, display as entered)
- **Reserved**: Block common reserved words (admin, root, api, www, etc.)

### Validation Rules:
```regex
^[a-zA-Z0-9][a-zA-Z0-9_-]{2,19}$
```

## Implementation Strategy

### Phase 1: Database Schema Update
1. **Add username column** to users table
2. **Add unique index** on username (case-insensitive)
3. **Make username required** for new users
4. **Migrate existing users**: Generate usernames from email prefixes

### Phase 2: Backend Updates
1. **Update shared schema** with username validation
2. **Add username uniqueness API endpoint**
3. **Update registration/login logic**
4. **Add username availability checking**

### Phase 3: Frontend Updates
1. **Replace "Full Name" with "Username"** in forms
2. **Add real-time username availability checking**
3. **Update form validation and error messages**
4. **Add username uniqueness feedback UI**

### Phase 4: Data Migration
1. **Generate usernames for existing users**
2. **Handle edge cases and conflicts**
3. **Validate migration success**

## Migration Script Logic

### Username Generation for Existing Users:
1. Extract prefix from email (before @)
2. Clean non-alphanumeric characters
3. Ensure 3-20 character length
4. Add numeric suffix if conflicts exist
5. Validate against reserved words list

### Example Transformations:
- `john.doe@email.com` → `johndoe`
- `user123@gmail.com` → `user123`
- `admin@company.com` → `admin_user` (avoid reserved word)
- Conflicts: `john`, `john1`, `john2`, etc.

## Risk Mitigation

### Backwards Compatibility:
- Keep `name` field for display purposes initially
- Gradual migration approach
- Rollback plan if issues arise

### Username Conflicts:
- Systematic conflict resolution
- User notification for auto-generated usernames
- Allow users to change username post-migration

### Testing Requirements:
- Unit tests for username validation
- Integration tests for uniqueness checking
- End-to-end tests for registration flow
- Performance tests for username lookups

## Timeline Estimate
- **Phase 1**: Database migration - 1-2 hours
- **Phase 2**: Backend updates - 2-3 hours
- **Phase 3**: Frontend updates - 2-3 hours
- **Phase 4**: Data migration & testing - 1-2 hours
- **Total**: ~6-10 hours development time