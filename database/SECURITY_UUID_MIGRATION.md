# Security Migration: Sequential IDs → UUIDs

## 🚨 Problem

Your application currently uses **sequential integer IDs** (524, 525, 526...) for the `uploaded_files` table. This creates security vulnerabilities:

### Vulnerabilities

1. **Information Disclosure**

   - ID 524 reveals ~524 total uploads in the system
   - Shows business growth and activity patterns
   - Helps attackers understand your scale

2. **IDOR Enumeration**

   - Attackers can probe sequential IDs: 1, 2, 3, 4...
   - Even with RLS, timing differences reveal valid vs invalid IDs
   - Enables targeted reconnaissance

3. **Correlation Attacks**

   - IDs 524 and 525 uploaded close together? Likely same user/session
   - Helps build user behavior profiles
   - Can be used for social engineering

4. **Predictable Resource Access**
   - Easy to script and automate attacks
   - Can probe rate limits systematically
   - Reveals API structure

## ✅ Solution: UUID Primary Keys

**UUIDs** (Universally Unique Identifiers) solve all these issues:

```
Before: id = 524 (sequential integer)
After:  id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' (UUID)
```

### Benefits

✅ **No information disclosure** - Random, reveals nothing
✅ **Cannot enumerate** - 128-bit space = 2^128 possibilities
✅ **No correlation** - Each ID is independent
✅ **Industry standard** - Used by AWS, Google, Stripe, etc.
✅ **Works with RLS** - Your existing security policies still work

## 📋 Migration Steps

### Step 1: Backup Your Database

```sql
-- In Supabase Dashboard → Database → Backups
-- Or use pg_dump
pg_dump -h YOUR_PROJECT_URL.supabase.co -U postgres -d postgres > backup.sql
```

### Step 2: Test in Development First

⚠️ **IMPORTANT:** Run this migration in a development/staging environment first!

### Step 3: Run the Migration

1. Go to Supabase Dashboard → SQL Editor
2. Open the file: `database/migrate-to-uuid-ids.sql`
3. Review the script carefully
4. Execute the migration

```sql
-- The script will:
-- 1. Create new table with UUID primary key
-- 2. Copy all data
-- 3. Recreate indexes and RLS policies
-- 4. Atomically swap tables
```

### Step 4: Update Your Application Code

**No code changes needed!**

Your application already works with UUIDs because:

- Supabase returns IDs as strings in JSON
- Your code doesn't assume integer IDs
- The API endpoints already work with any ID format

Verify by checking your route handlers - they already use:

```javascript
const { id } = req.params; // Works with both integers and UUIDs
```

### Step 5: Verify

```sql
-- Check ID format
SELECT id, filename FROM uploaded_files LIMIT 5;

-- Should see UUIDs like:
-- a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
-- NOT integers like: 524
```

### Step 6: Test Your Application

1. Upload a new file
2. Retrieve files list
3. Update a file
4. Delete a file
5. Check that IDs are UUIDs in responses

### Step 7: Clean Up (After 48 hours)

```sql
-- Only after confirming everything works!
DROP TABLE uploaded_files_old;
```

## 🔧 Rollback Plan

If something goes wrong:

```sql
BEGIN;
  ALTER TABLE uploaded_files RENAME TO uploaded_files_failed;
  ALTER TABLE uploaded_files_old RENAME TO uploaded_files;
COMMIT;
```

## 📊 Impact Assessment

### Performance

- **Slightly slower** - UUIDs are 128-bit vs 64-bit integers
- **Negligible impact** - Modern databases handle UUIDs efficiently
- **Worth it** - Security benefit far outweighs tiny performance cost

### Storage

- **Slightly larger** - UUID takes 16 bytes vs 8 bytes for bigint
- **Minimal impact** - For 100K records: +800 KB storage
- **Negligible cost** - Less than $0.01/month

### API Changes

- **No breaking changes** - IDs were already returned as strings in JSON
- **Frontend compatible** - React/Vue/Angular already treat IDs as strings

## 🎯 Current Status

### Before Migration

```json
{
  "id": 524, // ❌ Sequential integer
  "filename": "peony.jpg"
}
```

### After Migration

```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", // ✅ UUID
  "filename": "peony.jpg"
}
```

## ✅ Additional Security Benefits

Once you migrate to UUIDs, you also get:

1. **Distributed system ready** - Can generate IDs in multiple databases
2. **No collision risk** - Even across database shards
3. **Privacy enhanced** - Cannot derive upload sequence or timing
4. **Audit trail safe** - IDs don't reveal chronological order
5. **GDPR compliant** - No sequential tracking of users

## 📚 References

- [OWASP: Insecure Direct Object References](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/04-Testing_for_Insecure_Direct_Object_References)
- [RFC 4122: UUID Specification](https://tools.ietf.org/html/rfc4122)
- [PostgreSQL UUID Documentation](https://www.postgresql.org/docs/current/datatype-uuid.html)

## 🤝 Need Help?

If you encounter issues during migration:

1. Check the rollback plan above
2. Review Supabase logs
3. Verify RLS policies are active
4. Test with a single user first

---

**Status**: ⏳ Ready to migrate
**Priority**: HIGH - Security vulnerability
**Difficulty**: Low - Script provided
**Risk**: Low - Rollback available
**Downtime**: < 1 minute during table swap
