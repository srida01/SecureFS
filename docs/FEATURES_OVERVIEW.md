# Features Overview - Secure Cloud System

---

## 🎯 Core Features Implemented

### 1. **User Authentication & Roles**
**What:** Secure login + 3-tier role system  
**Database:** `User` table with `role` enum (admin, editor, viewer)  
**How:** Integrated with Clerk (external auth service), auto-create users in DB on first login  
**Design Decision:** Separated auth from DB = users exist before they own resources  
**Benefit:** Users can't own files they can't access; consistent permissions model

---

### 2. **File & Folder Management**
**What:** Hierarchical folder structure + individual file storage  
**Database:**
- `Folder` table with `parentFolderId` (self-referential) for tree structure
- `File` table linked to `Folder` 
- Both track `ownerId`, `isDeleted`, `deletedAt`, `deletedBy`

**How:** Folders create parent-child relationships; files sit inside folders  
**Design Decision:** Soft delete (mark as deleted, don't remove) = recoverable data  
**Benefit:** Prevents accidental permanent loss; audit trail on who deleted what

---

### 3. **File Versioning**
**What:** Keep history of every file modification  
**Database:** `FileVersion` table tracks each version with unique `storageKey`, created timestamp, creator  
**How:** New upload = new version record, not replace old file  
**Design Decision:** Separate table instead of overwriting = full history preserved  
**Benefit:** Recover old versions anytime; track who changed what and when

---

### 4. **Permissions & Sharing**
**What:** Control who can view/edit/delete files; share with other users  
**Database:**
- `Permission` table: tracks grants (grantedBy → granteeUserId)
- `ShareLink` table: public anonymous share tokens

**How:** 
- Direct share = create Permission record with level and optional expiry
- Public link = generate UUID token, anyone with token can access

**Design Decision:** 
- Separate direct/public sharing = simpler access control
- Expiration support = time-limited access without manual revocation
- `isActive` flag = revoke instantly without deleting history

**Benefit:** Flexible sharing; audit trail shows who shared with whom; no permanent data loss

---

### 5. **Tagging System**
**What:** Label files with metadata (key-value pairs)  
**Database:** `Tag` table with `fileId`, `name`, `key`, `value`  
**How:** Multiple tags per file; optional key (can be just name or name+value)  
**Design Decision:** Generic key-value structure = extensible for future tag types  
**Benefit:** Organize files without moving; search by tags; add custom metadata

---

### 6. **Audit Logging**
**What:** Record every action for compliance & debugging  
**Database:** `AuditLog` table logs action, actor, resource, IP, timestamp, status  
**How:** Middleware automatically logs before/after sensitive operations  
**Design Decision:** 
- JSON `metadata` field = flexible extra context (who shared, what permissions, etc.)
- `status` enum = success/failure/denied = distinguish what happened
- `ipAddress` tracking = identify suspicious patterns

**Benefit:** Compliance (prove security); forensics (debug issues); accountability (who did what)

---

### 7. **Storage Quota Management**
**What:** Limit per-user storage (default 10GB)  
**Database:** `StorageQuota` table tracks `quotaBytes` (limit) + `usedBytes` (current)  
**How:** Update `usedBytes` when files uploaded/deleted  
**Design Decision:** Separate table = query limit independently without joining User  
**Benefit:** Fair resource usage; prevent abuse; easy to implement different tiers

---

### 8. **Session Management**
**What:** Track user login sessions + token validity  
**Database:** `Session` table with `userId`, `tokenHash`, `ipAddress`, `userAgent`, `expiresAt`  
**How:** Create session on login, validate token existence + expiry  
**Design Decision:** Store `tokenHash` not plain token = never expose token in DB  
**Benefit:** Multi-device sessions; detect compromised sessions; IP/device tracking

---

### 9. **Advanced Search**
**What:** Full-text search across filenames + tags  
**Database:** Uses `File.name`, `File.originalName`, `Tag.name` fields  
**How:** Query builder with AND/OR logic; searches both file names and tags  
**Design Decision:** Search tags via JOIN not separate index = simpler, good enough  
**Benefit:** Find files fast across folders; tag-based discovery

---

### 10. **Trash/Soft Delete**
**What:** Files marked deleted stay in DB but hidden; users can restore  
**Database:** `File.isDeleted`, `File.deletedAt`, `File.deletedBy` fields  
**How:** Mark as deleted, keep in DB; restore = flip `isDeleted` flag  
**Design Decision:** Soft delete vs hard delete = recoverable  
**Benefit:** No permanent loss; recovery without backups; audit of deletions

---

## 📊 Database Design Key Decisions

| Decision | What | Why |
|----------|------|-----|
| **Soft Delete** | Add `isDeleted` + timestamp fields | Recover data; audit trail |
| **Ownership Tracking** | Every file/folder has `ownerId` | Clear permissions model |
| **Version Separation** | Different table for versions | Keep history without bloat |
| **Hierarchical Folders** | `parentFolderId` self-reference | Build folder trees |
| **Generic Tags** | Key-value structure | Extensible metadata |
| **Permission Expiry** | `expiresAt` field | Time-limited access |
| **Token Hashing** | `tokenHash` not plain token | Never expose secrets |
| **JSON Metadata** | `metadata` column in AuditLog | Flexible logging |
| **Active Flags** | `isActive` instead of delete | Soft revocation |

---

## 🚀 Why These Features Matter

**Security:** Role-based access, audit logging, session tracking, token hashing  
**Reliability:** Soft deletes, version history, recoverable data  
**Usability:** Folder hierarchy, tags, public sharing, expiring links  
**Compliance:** Complete audit trail, IP tracking, action status  
**Scalability:** Separate tables for storage vs users vs permissions = query optimization  
**Flexibility:** Optional expiries, JSON metadata, key-value tags = adapts to changes

---

## 📈 Tables at a Glance

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| **User** | Identity + roles | clerkUserId, role (admin/editor/viewer) |
| **File** | Actual files | ownerId, folderId, storageKey, isDeleted |
| **Folder** | Directory structure | ownerId, parentFolderId, path |
| **FileVersion** | History | fileId, versionNumber, storageKey, createdBy |
| **Permission** | User-to-user sharing | grantedBy, granteeUserId, permissionLevel, expiresAt |
| **ShareLink** | Public sharing | token, resourceId, passwordHash, expiresAt |
| **Tag** | Metadata labeling | fileId, name, key, value |
| **AuditLog** | Activity trail | actorId, action, resourceId, metadata, status |
| **Session** | Login tracking | userId, tokenHash, ipAddress, expiresAt |
| **StorageQuota** | Usage limits | userId, quotaBytes, usedBytes |

---

## ✅ Cleanly Implemented = Good Decisions Under the Hood

Features aren't just "working"—they're designed for:
- **Data Recovery** (soft deletes, version history)
- **Security** (audit logging, role-based access, token hashing)
- **Auditability** (every action logged with metadata)
- **Performance** (separate tables for different concerns, clear indexes)
- **Flexibility** (optional fields, enum types, JSON storage)

This makes the system **production-ready** for an enterprise file-sharing platform.
