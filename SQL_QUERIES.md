# SQL Queries - Database Schema & Operations

---

## 1. DDL (Data Definition Language) - Table Creation Statements

### Create Users Table
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  role ENUM('admin', 'editor', 'viewer') DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  INDEX idx_clerk_user_id (clerk_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create Sessions Table
```sql
CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token_hash VARCHAR(512) UNIQUE NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create Storage Quotas Table
```sql
CREATE TABLE storage_quotas (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) UNIQUE NOT NULL,
  quota_bytes BIGINT DEFAULT 10737418240,
  used_bytes BIGINT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create Folders Table
```sql
CREATE TABLE folders (
  id VARCHAR(36) PRIMARY KEY,
  owner_id VARCHAR(36) NOT NULL,
  parent_folder_id VARCHAR(36) NULL,
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,
  depth INT DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE CASCADE,
  INDEX idx_owner_id (owner_id),
  INDEX idx_parent_folder_id (parent_folder_id),
  INDEX idx_is_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create Files Table
```sql
CREATE TABLE files (
  id VARCHAR(36) PRIMARY KEY,
  owner_id VARCHAR(36) NOT NULL,
  folder_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(127) NULL,
  size_bytes BIGINT NOT NULL,
  storage_key VARCHAR(255) UNIQUE NOT NULL,
  checksum_sha256 CHAR(64) NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
  INDEX idx_owner_id (owner_id),
  INDEX idx_folder_id (folder_id),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_storage_key (storage_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create File Versions Table
```sql
CREATE TABLE file_versions (
  id VARCHAR(36) PRIMARY KEY,
  file_id VARCHAR(36) NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  version_number INT NOT NULL,
  storage_key VARCHAR(255) UNIQUE NOT NULL,
  size_bytes BIGINT NOT NULL,
  checksum_sha256 CHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_file_id (file_id),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create Tags Table
```sql
CREATE TABLE tags (
  id VARCHAR(36) PRIMARY KEY,
  file_id VARCHAR(36) NOT NULL,
  key VARCHAR(100) NULL,
  name VARCHAR(100) NOT NULL,
  value VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  INDEX idx_file_id (file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create Permissions Table
```sql
CREATE TABLE permissions (
  id VARCHAR(36) PRIMARY KEY,
  granted_by VARCHAR(36) NOT NULL,
  grantee_user_id VARCHAR(36) NOT NULL,
  resource_id VARCHAR(36) NOT NULL,
  resource_type ENUM('file', 'folder') NOT NULL,
  permission_level ENUM('view', 'edit', 'delete', 'owner') NOT NULL,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (grantee_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_granted_by (granted_by),
  INDEX idx_grantee_user_id (grantee_user_id),
  INDEX idx_resource_id (resource_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create Share Links Table
```sql
CREATE TABLE share_links (
  id VARCHAR(36) PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  resource_id VARCHAR(36) NOT NULL,
  resource_type ENUM('file', 'folder') NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  password_hash VARCHAR(255) NULL,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_resource_id (resource_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Create Audit Logs Table
```sql
CREATE TABLE audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  actor_id VARCHAR(36) NOT NULL,
  resource_id VARCHAR(36) NULL,
  resource_type VARCHAR(50) NULL,
  action ENUM('upload', 'download', 'delete', 'restore', 'view', 'edit', 'share', 'claim', 'login', 'logout', 'denied') NOT NULL,
  ip_address VARCHAR(45) NULL,
  metadata JSON NULL,
  status ENUM('success', 'failure', 'denied') DEFAULT 'success',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_actor_id (actor_id),
  INDEX idx_resource_id (resource_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 2. DML (Data Manipulation Language) - CRUD Operations

### User Management

#### Insert New User
```sql
INSERT INTO users (id, clerk_user_id, role, created_at, updated_at)
VALUES (UUID(), 'clerk_user_123', 'editor', NOW(), NOW());
```

#### Update User Role
```sql
UPDATE users
SET role = 'admin', updated_at = NOW()
WHERE clerk_user_id = 'clerk_user_123';
```

#### Update Last Login
```sql
UPDATE users
SET last_login_at = NOW()
WHERE id = 'user-id';
```

#### Get User with Storage Quota
```sql
SELECT u.id, u.clerk_user_id, u.role, sq.quota_bytes, sq.used_bytes,
       (sq.quota_bytes - sq.used_bytes) AS available_bytes
FROM users u
LEFT JOIN storage_quotas sq ON u.id = sq.user_id
WHERE u.id = 'user-id';
```

### File & Folder Operations

#### Create Folder
```sql
INSERT INTO folders (id, owner_id, parent_folder_id, name, path, depth, created_at, updated_at)
VALUES (UUID(), 'user-id', NULL, 'My Documents', '/My Documents', 0, NOW(), NOW());
```

#### Upload File
```sql
INSERT INTO files (id, owner_id, folder_id, name, original_name, mime_type, size_bytes, storage_key, created_at, updated_at)
VALUES (UUID(), 'user-id', 'folder-id', 'document.pdf', 'document.pdf', 'application/pdf', 2048576, 'storage_key_abc123', NOW(), NOW());
```

#### Get All Files in Folder (Not Deleted)
```sql
SELECT f.id, f.name, f.original_name, f.mime_type, f.size_bytes, f.created_at
FROM files f
WHERE f.folder_id = 'folder-id' AND f.is_deleted = FALSE
ORDER BY f.created_at DESC;
```

#### Get Folder Hierarchy
```sql
WITH RECURSIVE folder_tree AS (
  SELECT id, name, parent_folder_id, depth, 0 AS level
  FROM folders
  WHERE id = 'root-folder-id'
  
  UNION ALL
  
  SELECT f.id, f.name, f.parent_folder_id, f.depth, ft.level + 1
  FROM folders f
  INNER JOIN folder_tree ft ON f.parent_folder_id = ft.id
  WHERE f.is_deleted = FALSE
)
SELECT * FROM folder_tree
ORDER BY depth, id;
```

#### Soft Delete File
```sql
UPDATE files
SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = 'user-id', updated_at = NOW()
WHERE id = 'file-id' AND owner_id = 'user-id';
```

#### Restore Deleted File
```sql
UPDATE files
SET is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL, updated_at = NOW()
WHERE id = 'file-id' AND owner_id = 'user-id';
```

#### Permanently Delete File (Cleanup)
```sql
DELETE FROM files
WHERE id = 'file-id' AND is_deleted = TRUE AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### File Versioning

#### Create New Version
```sql
INSERT INTO file_versions (id, file_id, created_by, version_number, storage_key, size_bytes, checksum_sha256, created_at)
VALUES (UUID(), 'file-id', 'user-id', 2, 'storage_key_v2', 2097152, 'sha256_hash', NOW());
```

#### Get File Version History
```sql
SELECT id, version_number, size_bytes, checksum_sha256, created_at,
       (SELECT clerk_user_id FROM users WHERE id = created_by) AS created_by_user
FROM file_versions
WHERE file_id = 'file-id'
ORDER BY version_number DESC;
```

#### Restore Previous Version
```sql
UPDATE files f
JOIN file_versions fv ON f.id = fv.file_id
SET f.storage_key = fv.storage_key, f.updated_at = NOW()
WHERE f.id = 'file-id' AND fv.version_number = 2;
```

### Permissions & Sharing

#### Grant Permission
```sql
INSERT INTO permissions (id, granted_by, grantee_user_id, resource_id, resource_type, permission_level, created_at, updated_at)
VALUES (UUID(), 'owner-user-id', 'grantee-user-id', 'file-id', 'file', 'edit', NOW(), NOW());
```

#### Grant Time-Limited Permission
```sql
INSERT INTO permissions (id, granted_by, grantee_user_id, resource_id, resource_type, permission_level, expires_at, created_at, updated_at)
VALUES (UUID(), 'owner-user-id', 'grantee-user-id', 'file-id', 'file', 'view', DATE_ADD(NOW(), INTERVAL 7 DAY), NOW(), NOW());
```

#### Get User Permissions
```sql
SELECT p.id, p.resource_id, p.resource_type, p.permission_level, p.expires_at, p.is_active
FROM permissions p
WHERE p.grantee_user_id = 'user-id' AND p.is_active = TRUE
  AND (p.expires_at IS NULL OR p.expires_at > NOW())
ORDER BY p.created_at DESC;
```

#### Revoke Permission
```sql
UPDATE permissions
SET is_active = FALSE, updated_at = NOW()
WHERE id = 'permission-id' AND granted_by = 'user-id';
```

#### Create Public Share Link
```sql
INSERT INTO share_links (id, token, resource_id, resource_type, created_by, password_hash, expires_at, created_at)
VALUES (UUID(), 'unique_token_xyz', 'file-id', 'file', 'user-id', NULL, NULL, NOW());
```

#### Get Share Link Details
```sql
SELECT id, token, resource_id, resource_type, created_by, password_hash, expires_at, is_active
FROM share_links
WHERE token = 'unique_token_xyz' AND is_active = TRUE
  AND (expires_at IS NULL OR expires_at > NOW());
```

### Tags

#### Add Tag to File
```sql
INSERT INTO tags (id, file_id, key, name, value, created_at, updated_at)
VALUES (UUID(), 'file-id', 'category', 'Project', 'Q1-Report', NOW(), NOW());
```

#### Get File Tags
```sql
SELECT id, key, name, value
FROM tags
WHERE file_id = 'file-id'
ORDER BY created_at;
```

#### Search Files by Tag
```sql
SELECT DISTINCT f.id, f.name, f.original_name
FROM files f
INNER JOIN tags t ON f.id = t.file_id
WHERE t.name = 'Project' AND t.value = 'Q1-Report'
  AND f.is_deleted = FALSE;
```

### Audit Logging

#### Log File Upload
```sql
INSERT INTO audit_logs (id, actor_id, resource_id, resource_type, action, ip_address, metadata, status, created_at)
VALUES (UUID(), 'user-id', 'file-id', 'file', 'upload', '192.168.1.100', JSON_OBJECT('original_name', 'report.pdf', 'size_bytes', 2048576), 'success', NOW());
```

#### Log Access Denied
```sql
INSERT INTO audit_logs (id, actor_id, resource_id, resource_type, action, ip_address, metadata, status, created_at)
VALUES (UUID(), 'user-id', 'file-id', 'file', 'view', '192.168.1.100', JSON_OBJECT('reason', 'insufficient_permissions'), 'denied', NOW());
```

#### Get Audit Trail for Resource
```sql
SELECT id, actor_id, action, ip_address, metadata, status, created_at
FROM audit_logs
WHERE resource_id = 'file-id' AND resource_type = 'file'
ORDER BY created_at DESC
LIMIT 50;
```

#### Get User Activity Report
```sql
SELECT action, COUNT(*) as count, MAX(created_at) as last_action
FROM audit_logs
WHERE actor_id = 'user-id'
  AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY action
ORDER BY count DESC;
```

#### Suspicious Activity Detection
```sql
SELECT actor_id, COUNT(*) as failed_attempts, MIN(created_at) as first_attempt
FROM audit_logs
WHERE action = 'denied' AND status = 'denied'
  AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY actor_id
HAVING COUNT(*) > 5;
```

---

## 3. DCL (Data Control Language) - Access Control & Permissions

### Database User Creation
```sql
-- Create application user with read/write privileges
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'strong_password';

-- Grant privileges on the database
GRANT SELECT, INSERT, UPDATE, DELETE ON secure_cloud_system.* TO 'app_user'@'localhost';

-- Create read-only user for reporting
CREATE USER 'report_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT SELECT ON secure_cloud_system.* TO 'report_user'@'localhost';

-- Create backup user
CREATE USER 'backup_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT SELECT, LOCK TABLES ON secure_cloud_system.* TO 'backup_user'@'localhost';

-- Apply privilege changes
FLUSH PRIVILEGES;
```

### User Privilege Management
```sql
-- Revoke specific privilege
REVOKE DELETE ON secure_cloud_system.audit_logs FROM 'app_user'@'localhost';

-- Show user privileges
SHOW GRANTS FOR 'app_user'@'localhost';

-- Drop user
DROP USER 'app_user'@'localhost';
```

### Table-Level Access Control
```sql
-- Allow user to only view audit logs (read-only)
GRANT SELECT ON secure_cloud_system.audit_logs TO 'report_user'@'localhost';
REVOKE INSERT, UPDATE, DELETE ON secure_cloud_system.audit_logs FROM 'report_user'@'localhost';

-- Allow user to manage users
GRANT SELECT, INSERT, UPDATE ON secure_cloud_system.users TO 'admin_user'@'localhost';
```

---

## Summary

- **DDL**: 9 table definitions with proper indexing, foreign keys, and constraints
- **DML**: 30+ practical query examples covering CRUD operations, file management, permissions, and audit logging
- **DCL**: User creation, privilege management, and access control statements

These queries form the complete database operations layer for the Secure Cloud System application.
