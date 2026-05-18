# Person 3: Permissions, Sharing & Access Control
## Complete Implementation Guide

---

## 📋 Database Tables & Schema

### 1. **User Table**
```prisma
model User {
  id          String    @id @default(uuid())
  clerkUserId String    @unique (Clerk authentication integration)
  role        UserRole  @default(viewer)  // admin, editor, viewer
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  lastLoginAt DateTime?

  // Relations
  sessions      Session[]         // User sessions
  storageQuota  StorageQuota?     // Storage allocation
  ownedFolders  Folder[]          // Owned folders
  ownedFiles    File[]            // Owned files
  fileVersions  FileVersion[]     // File versions created
  grantedPerms  Permission[]      // Permissions granted BY this user
  receivedPerms Permission[]      // Permissions received BY this user
  auditLogs     AuditLog[]        // Audit trail
  shareLinks    ShareLink[]       // Share links created
}

enum UserRole {
  admin   // Full system access
  editor  // Can create/edit files and folders
  viewer  // Read-only access
}
```

### 2. **Permission Table** ⭐ Core Table for Access Control
```prisma
model Permission {
  id              String          @id @default(uuid())
  grantedBy       String          @map("granted_by")           // FK → User granting permission
  granteeUserId   String          @map("grantee_user_id")      // FK → User receiving permission
  resourceId      String          @map("resource_id")          // File or Folder ID
  resourceType    ResourceType    @map("resource_type")        // "file" or "folder"
  permissionLevel PermissionLevel @map("permission_level")     // view, edit, delete, owner
  expiresAt       DateTime?       @map("expires_at")           // Optional expiration
  isActive        Boolean         @default(true) @map("is_active")
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // Relations
  granter User @relation("PermissionGranter", fields: [grantedBy], references: [id], onDelete: Cascade)
  grantee User @relation("PermissionReceiver", fields: [granteeUserId], references: [id], onDelete: Cascade)
}

enum PermissionLevel {
  view    // Read-only access
  edit    // Can edit the resource
  delete  // Can delete the resource
  owner   // Full ownership (implicit for resource owners)
}

enum ResourceType {
  file
  folder
}
```

### 3. **ShareLink Table** ⭐ Public Sharing
```prisma
model ShareLink {
  id           String       @id @default(uuid())
  token        String       @unique           // Public share token (UUID)
  resourceId   String       @map("resource_id")
  resourceType ResourceType @map("resource_type")  // "file" or "folder"
  createdBy    String       @map("created_by")     // FK → Creator
  passwordHash String?      @map("password_hash")  // Optional password protection (bcrypt)
  expiresAt    DateTime?    @map("expires_at")     // Optional expiration
  isActive     Boolean      @default(true) @map("is_active")
  createdAt    DateTime     @default(now())

  // Relations
  creator User @relation(fields: [createdBy], references: [id], onDelete: Cascade)
}
```

### 4. **File Table** (Ownership & Deletion)
```prisma
model File {
  id             String    @id @default(uuid())
  ownerId        String    @map("owner_id")           // FK → File owner
  folderId       String    @map("folder_id")          // FK → Parent folder
  name           String
  originalName   String
  mimeType       String?
  sizeBytes      BigInt
  storageKey     String    @unique
  checksumSha256 String?
  isDeleted      Boolean   @default(false)
  deletedAt      DateTime?
  deletedBy      String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relations
  owner    User          @relation("FileOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  folder   Folder        @relation(fields: [folderId], references: [id], onDelete: Cascade)
  versions FileVersion[]
  tags     Tag[]
}
```

### 5. **Folder Table** (Hierarchical Permissions)
```prisma
model Folder {
  id             String    @id @default(uuid())
  ownerId        String    @map("owner_id")           // FK → Folder owner
  parentFolderId String?   @map("parent_folder_id")   // FK → Parent folder (hierarchical)
  name           String
  path           String    // Full path for traversal
  depth          Int       @default(0)
  isDeleted      Boolean   @default(false)
  deletedAt      DateTime?
  deletedBy      String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relations
  owner        User     @relation("FolderOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  parentFolder Folder?  @relation("FolderChildren", fields: [parentFolderId], references: [id])
  children     Folder[] @relation("FolderChildren")
  files        File[]
}
```

### 6. **AuditLog Table** (Audit Trail)
```prisma
model AuditLog {
  id           String      @id @default(uuid())
  actorId      String      @map("actor_id")      // FK → Who performed the action
  resourceId   String?     @map("resource_id")   // Optional: file/folder ID
  resourceType String?     @map("resource_type") // Optional: "file" or "folder"
  action       AuditAction                       // Action performed
  ipAddress    String?
  metadata     Json?       // Additional context (who got permissions, etc.)
  status       AuditStatus @default(success)     // success, failure, denied
  createdAt    DateTime    @default(now())

  // Relations
  actor User @relation(fields: [actorId], references: [id], onDelete: Cascade)
}

enum AuditAction {
  upload, download, delete, restore, view, edit, share, claim, login, logout, denied
}

enum AuditStatus {
  success, failure, denied
}
```

### 7. **Session Table** (Authentication)
```prisma
model Session {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  tokenHash String   @unique @map("token_hash")
  ipAddress String?
  userAgent String?
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 8. **StorageQuota Table**
```prisma
model StorageQuota {
  id         String   @id @default(uuid())
  userId     String   @unique
  quotaBytes BigInt   @default(10737418240)  // 10GB default
  usedBytes  BigInt   @default(0)
  updatedAt  DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 🔐 Access Control Implementation

### **Permission Priority System**
```typescript
const permissionPriority: Record<PermissionLevel, number> = {
  view:   1,  // Lowest
  edit:   2,
  delete: 3,
  owner:  4,  // Highest
};
```

### **Permission Resolution Flow**

#### **1. getFolderAncestors()**
Traverses up the folder hierarchy to find all parent folders.
```typescript
// Gets all ancestor folder IDs from a file's folder
// Root folder → Parent → Child
// Used to check inherited permissions
```

#### **2. getEffectivePermission()** ⭐ Core Logic
Determines what permission a user has on a resource:

```
Flow:
1. Check DIRECT Permission on resource
   └─ If found and active → Return it
   
2. If resource is FOLDER:
   a. Get all ancestor folders
   b. For each ancestor:
      - Check if user is OWNER → Return owner permission
      - Check if user has DIRECT permission → Return it
   
3. If resource is FILE:
   a. Check parent FOLDER permissions recursively
   b. File inherits folder permissions
   
4. No permission found → Return null
```

**Key Features:**
- ✅ Checks expiration date (`expiresAt >= now()`)
- ✅ Checks if permission is active (`isActive: true`)
- ✅ Ownership fallback (owners inherit all permissions)
- ✅ Hierarchical inheritance (files inherit folder permissions)

#### **3. hasPermission()** ⭐ Authorization Check
```typescript
const hasPermission = async (
  userId: string,
  resourceId: string,
  resourceType: ResourceType,
  requiredLevel: PermissionLevel
): boolean

// Returns true if:
1. User is the resource owner, OR
2. User has an effective permission with priority >= requiredLevel
```

---

## 📤 Sharing Mechanisms

### **Mechanism 1: User-to-User Permissions**

#### **Routes:**
```
POST   /api/permissions/share              → Share resource with another user
PATCH  /api/permissions/:id                 → Update permission level/expiry
DELETE /api/permissions/:id                 → Revoke permission
GET    /api/permissions/resource            → Get all permissions for a resource
GET    /api/permissions/shared-with-me      → Get resources shared with current user
GET    /api/permissions/shared-by-me        → Get resources shared by current user
```

#### **Share Resource Endpoint**
```typescript
POST /api/permissions/share
Body: {
  granteeClerkUserId: string,    // Recipient (identified by Clerk ID)
  resourceId: string,             // File or Folder ID
  resourceType: "file" | "folder",
  permissionLevel: "view" | "edit" | "delete",
  expiresAt?: ISO8601 DateTime   // Optional expiration
}

Response: {
  success: true,
  data: {
    id: string,
    grantedBy: string,
    granteeUserId: string,
    resourceId: string,
    resourceType: string,
    permissionLevel: string,
    expiresAt: DateTime | null,
    isActive: true,
    createdAt: DateTime,
    updatedAt: DateTime
  }
}
```

**Implementation Details:**
- ✅ Converts Clerk ID to internal DB user ID
- ✅ Prevents self-sharing
- ✅ Checks resource ownership for authorization
- ✅ Creates audit log entry with grantee details
- ✅ Supports expiring permissions

---

### **Mechanism 2: Public Share Links**

#### **Routes:**
```
POST   /api/share-links/                    → Create public share link
GET    /api/share-links/:token              → Get shared resource info
GET    /api/share-links/:token/download     → Download shared file
GET    /api/share-links/:token/contents     → Get shared folder contents
POST   /api/share-links/:token/claim        → Claim shared access (add to own account)
```

#### **Create Share Link Endpoint**
```typescript
POST /api/share-links/
Body: {
  resourceId: string,
  resourceType: "file" | "folder",
  password?: string,             // Optional password protection
  expiresAt?: ISO8601 DateTime  // Optional link expiration
}

Response: {
  success: true,
  data: {
    token: string,              // UUID token for sharing
    resourceType: string,
    resourceId: string,
    expiresAt: DateTime | null,
    isActive: true
  }
}

// Share URL: http://localhost:5173/share/{token}
// Or with password: http://localhost:5173/share/{token}?password={pwd}
```

**Implementation Details:**
- ✅ Generates UUID token for anonymous access
- ✅ Password protection using bcrypt hashing
- ✅ Expiration checking (validates `expiresAt < now()`)
- ✅ Deactivation support (`isActive` flag)
- ✅ Returns public-safe response (no internal IDs)

#### **Access Shared Resource Flow**
```
1. User accesses /share/:token
2. getShareLink() validates:
   - Token exists
   - Link is active (isActive: true)
   - Link not expired (expiresAt check)
   - Password correct (if passwordHash exists)
3. Returns resource details
4. User can download/view based on resourceType
```

#### **Claim Shared Access**
```typescript
POST /api/share-links/:token/claim
Body: { password?: string }

// Converts public share access to permanent permission
// User adds the resource to their account with "view" permission
// Creates audit log entry with action: "claim"
```

---

## 🗝️ Authentication & Authorization

### **Authentication Flow**
```typescript
// Middleware: authenticate.ts

1. Extract Bearer token from Authorization header
2. Verify token with Clerk SDK
3. Extract clerkUserId from JWT payload
4. Find/Create user in database:
   - If user exists → Load existing record
   - If user doesn't exist → Create new user with:
     - role: "viewer" (default)
     - storageQuota: 10GB
5. Attach to request:
   - req.userId (internal DB ID)
   - req.clerkUserId (Clerk ID)
   - req.userRole (admin/editor/viewer)
6. Proceed to route handler
```

### **Authorization Checks**
```typescript
// Utility: accessControl.ts

Before any operation:
1. Check if user is authenticated (req.userId)
2. Verify user has required permission level:
   - hasPermission(userId, resourceId, resourceType, requiredLevel)
3. If owner → automatic full access
4. If permission found → check priority
5. If no permission → throw 403 Forbidden
```

---

## 📊 Permission Grant Scenarios

### **Scenario 1: User A shares File with User B (view only)**
```
Database Record Created:
┌─────────────────────────────────────────┐
│ Permission Table                        │
├─────────────────────────────────────────┤
│ id: "perm-123"                          │
│ grantedBy: "user-a-id"                  │
│ granteeUserId: "user-b-id"              │
│ resourceId: "file-456"                  │
│ resourceType: "file"                    │
│ permissionLevel: "view"                 │
│ expiresAt: null (no expiration)         │
│ isActive: true                          │
│ createdAt: 2026-04-20T10:30:00Z         │
└─────────────────────────────────────────┘

Audit Log Entry:
┌─────────────────────────────────────────┐
│ AuditLog Table                          │
├─────────────────────────────────────────┤
│ id: "audit-789"                         │
│ actorId: "user-a-id"                    │
│ action: "share"                         │
│ resourceId: "file-456"                  │
│ resourceType: "file"                    │
│ metadata: {                             │
│   "granteeUserId": "user-b-id",        │
│   "granteeClerkUserId": "user_...",    │
│   "permissionLevel": "view"             │
│ }                                       │
│ status: "success"                       │
└─────────────────────────────────────────┘
```

### **Scenario 2: User A creates public share link for Folder**
```
Database Record Created:
┌─────────────────────────────────────────┐
│ ShareLink Table                         │
├─────────────────────────────────────────┤
│ id: "share-001"                         │
│ token: "a1b2c3d4-e5f6-g7h8-..."        │
│ resourceId: "folder-789"                │
│ resourceType: "folder"                  │
│ createdBy: "user-a-id"                  │
│ passwordHash: "$2a$10$..." (bcrypt)    │
│ expiresAt: 2026-05-20T10:30:00Z        │
│ isActive: true                          │
│ createdAt: 2026-04-20T10:30:00Z         │
└─────────────────────────────────────────┘

Share URL: http://localhost:5173/share/a1b2c3d4-e5f6-g7h8-...
(Anyone can access with password)
```

### **Scenario 3: User B accesses User A's folder via hierarchy**
```
Folder Structure:
├─ Folder A (owned by User A)
│  └─ Folder B (owned by User A)
│     └─ File C (owned by User A)

User B has "edit" permission on Folder A.

Access Check for File C:
1. Direct permission on File C? NO
2. Get effective permission on File C:
   - Check parent Folder B:
     a. Direct permission on Folder B? NO
     b. Check parent Folder A:
        - Direct permission exists? YES
        - Level: "edit" (>=1)
        - Return this permission
3. User B can EDIT File C (inherited from parent)
```

---

## 🔄 API Flow Diagrams

### **Share Resource Flow**
```
Frontend                     Backend                    Database
   │                            │                          │
   ├─ POST /permissions/share   │                          │
   │ (granteeClerkId, fileId)   │                          │
   │─────────────────────────>  │                          │
   │                            ├─ Verify token           │
   │                            ├─ Convert Clerk ID       │
   │                            ├─ Check ownership        │
   │                            ├─ Create Permission      │
   │                            │────────────────────────>│
   │                            │                         ├─ INSERT
   │                            │ Create AuditLog         │
   │                            │────────────────────────>│
   │                            │                         ├─ INSERT
   │                            ├─ Return 201             │
   │                            │<────────────────────────┤
   │<────── 201 Created ────────│                          │
   │     {data: permission}     │                          │
   │                            │                          │
```

### **Access Shared Resource Flow**
```
User (no auth)               Backend                    Database
   │                            │                          │
   ├─ GET /share-links/:token   │                          │
   │─────────────────────────>  │                          │
   │                            ├─ Find ShareLink         │
   │                            │────────────────────────>│
   │                            │<──────── SELECT ────────┤
   │                            │                         │
   │                            ├─ Validate:             │
   │                            │  - isActive?            │
   │                            │  - Not expired?         │
   │                            │  - Password match?      │
   │                            │                         │
   │                            ├─ Get Resource           │
   │                            │────────────────────────>│
   │                            │<──────── SELECT ────────┤
   │<────── 200 OK ─────────────│                          │
   │ {shareLink, resource}      │                          │
   │                            │                          │
```

---

## 🚀 Key Features Summary

| Feature | Implementation | Tables Used |
|---------|---|---|
| **Direct Permissions** | User-to-user grants | Permission |
| **Public Share Links** | Token-based access | ShareLink |
| **Password Protection** | bcrypt hashing | ShareLink.passwordHash |
| **Expiring Access** | DateTime comparison | Permission.expiresAt, ShareLink.expiresAt |
| **Hierarchical Permissions** | Parent folder traversal | Folder.parentFolderId |
| **Permission Levels** | Priority-based (view→edit→delete→owner) | Permission.permissionLevel enum |
| **Ownership Fallback** | Automatic owner access | File.ownerId, Folder.ownerId |
| **Audit Trail** | All sharing actions logged | AuditLog |
| **Access Revocation** | Soft delete (isActive: false) | Permission.isActive, ShareLink.isActive |
| **Claim Functionality** | Convert share access to permission | Permission created from ShareLink |

---

## 🔧 Backend Module Structure

```
backend/src/modules/
├── permissions/
│  ├── permission.controller.ts   (Business logic)
│  └── permission.router.ts       (Route definitions)
│
├── share-links/
│  ├── shareLink.controller.ts    (Business logic)
│  └── shareLink.router.ts        (Route definitions)
│
└── (Other modules)
```

### **Key Utility Functions**

| Function | Purpose | Used By |
|----------|---------|---------|
| `getEffectivePermission()` | Resolve user's permission on resource | Authorization checks |
| `hasPermission()` | Check if user has required level | All protected endpoints |
| `getFolderAncestors()` | Get all parent folder IDs | Permission inheritance |
| `createAuditLog()` | Log all sensitive actions | All controllers |
| `authenticate()` | Verify JWT and load user | All protected routes |
| `requireAdmin()` | Check admin role | Admin endpoints |

---

## 📋 Summary

**Permissions, Sharing & Access Control** is implemented through:

1. **Database Schema**: 8 core tables with clear relationships and enums
2. **Permission System**: Hierarchical, priority-based, with expiration support
3. **Access Resolution**: Multi-level checking (direct → inherited → ownership)
4. **Sharing Methods**: Direct permissions + Public share links
5. **Security**: Clerk authentication, role-based access, audit logging
6. **Authorization**: Middleware-based with per-endpoint checks

This creates a robust, auditable, and flexible access control system suitable for collaborative cloud storage.
