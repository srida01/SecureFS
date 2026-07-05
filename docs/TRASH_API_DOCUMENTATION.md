# Trash System API Documentation

## Overview

The trash system implements soft delete and hard delete functionality with a recoverable trash bin. Files and folders are moved to trash (soft delete) initially, then can be permanently deleted (hard delete) or restored.

## Base URL

```
/api/trash
```

## Authentication

All endpoints require authentication via `Authorization` header.

---

## Endpoints

### 1. Get All Trash Items

**GET** `/`

Get all deleted files and folders for the authenticated user.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "file-uuid",
      "name": "document.pdf",
      "type": "file",
      "deletedAt": "2026-04-20T10:30:00Z",
      "deletedBy": "user-id",
      "sizeBytes": 1024000,
      "ownerId": "user-id"
    },
    {
      "id": "folder-uuid",
      "name": "My Folder",
      "type": "folder",
      "deletedAt": "2026-04-20T10:29:00Z",
      "deletedBy": "user-id",
      "ownerId": "user-id"
    }
  ]
}
```

---

### 2. Get Deleted Files

**GET** `/files`

Get all deleted files for the authenticated user.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "file-uuid",
      "name": "document.pdf",
      "ownerId": "user-id",
      "folderId": "folder-uuid",
      "sizeBytes": 1024000,
      "isDeleted": true,
      "deletedAt": "2026-04-20T10:30:00Z",
      "deletedBy": "user-id",
      "createdAt": "2026-04-20T08:00:00Z",
      "updatedAt": "2026-04-20T10:30:00Z"
    }
  ]
}
```

---

### 3. Get Deleted Folders

**GET** `/folders`

Get all deleted folders for the authenticated user.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "folder-uuid",
      "name": "My Folder",
      "ownerId": "user-id",
      "path": "/My Folder",
      "depth": 0,
      "isDeleted": true,
      "deletedAt": "2026-04-20T10:29:00Z",
      "deletedBy": "user-id",
      "createdAt": "2026-04-20T08:00:00Z",
      "updatedAt": "2026-04-20T10:29:00Z"
    }
  ]
}
```

---

### 4. Restore File from Trash

**POST** `/files/:id/restore`

Restore a deleted file from trash back to its original state.

**Parameters:**

- `id` (path) - File ID to restore

**Response:**

```json
{
  "success": true,
  "message": "File restored from trash",
  "data": {
    "id": "file-uuid",
    "name": "document.pdf",
    "ownerId": "user-id",
    "isDeleted": false,
    "deletedAt": null,
    "deletedBy": null
  }
}
```

**Errors:**

- `404` - File not found
- `403` - Access denied
- `400` - File is not in trash

---

### 5. Restore Folder from Trash

**POST** `/folders/:id/restore`

Restore a deleted folder and all its contents from trash.

**Parameters:**

- `id` (path) - Folder ID to restore

**Response:**

```json
{
  "success": true,
  "message": "Folder restored from trash",
  "data": {
    "id": "folder-uuid",
    "name": "My Folder",
    "ownerId": "user-id",
    "isDeleted": false,
    "deletedAt": null,
    "deletedBy": null
  }
}
```

---

### 6. Permanently Delete File from Trash

**DELETE** `/files/:id`

Permanently delete a file from trash (hard delete). This removes the file and all its versions from storage.

**Parameters:**

- `id` (path) - File ID to permanently delete

**Response:**

```json
{
  "success": true,
  "message": "File permanently deleted"
}
```

**Errors:**

- `404` - File not found in trash
- `403` - Access denied
- `400` - File is not in trash

---

### 7. Permanently Delete Folder from Trash

**DELETE** `/folders/:id`

Permanently delete a folder and all its contents from trash (hard delete).

**Parameters:**

- `id` (path) - Folder ID to permanently delete

**Response:**

```json
{
  "success": true,
  "message": "Folder and all contents permanently deleted"
}
```

---

### 8. Permanently Delete Item from Trash (Auto-detect Type)

**DELETE** `/:id`

Permanently delete a trash item by automatically detecting whether it's a file or folder.

**Parameters:**

- `id` (path) - Item ID to permanently delete
- `type` (query, optional) - Specify 'file' or 'folder' to skip auto-detection

**Response:**

```json
{
  "success": true,
  "message": "File permanently deleted"
}
```

---

### 9. Empty Entire Trash

**DELETE** `/`

Permanently delete all items in the trash. This operation cannot be undone.

**Response:**

```json
{
  "success": true,
  "message": "Trash emptied successfully"
}
```

---

## File Operations

### Soft Delete File (in file controller)

**DELETE** `/api/files/:id`

Moves a file to trash (soft delete). The file is marked as deleted and removed from storage quota.

**Response:**

```json
{
  "success": true,
  "message": "File moved to trash"
}
```

---

### Restore File (in file controller)

**PATCH** `/api/files/:id/restore`

Restores a deleted file from trash.

---

## Folder Operations

### Soft Delete Folder (in folder controller)

**DELETE** `/api/folders/:id`

Moves a folder and all its contents to trash (soft delete).

**Response:**

```json
{
  "success": true,
  "message": "Folder moved to trash"
}
```

---

## Batch Operations

### Batch Delete Files

**POST** `/api/files/batch-delete`

Soft delete multiple files at once.

**Request Body:**

```json
{
  "ids": ["file-id-1", "file-id-2", "file-id-3"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "3 files moved to trash"
}
```

---

## Database Fields

### File and Folder Trash Fields

| Field       | Type     | Description                                     |
| ----------- | -------- | ----------------------------------------------- |
| `isDeleted` | Boolean  | Indicates if the item is deleted (soft deleted) |
| `deletedAt` | DateTime | Timestamp of when the item was deleted          |
| `deletedBy` | String   | User ID of who deleted the item                 |

---

## Workflow Example

### 1. User deletes a file

```bash
DELETE /api/files/file-id
```

→ File is marked as deleted, moved to trash

### 2. User views trash

```bash
GET /api/trash
```

→ Returns all deleted files and folders

### 3. User restores the file

```bash
POST /api/trash/files/file-id/restore
```

→ File is restored from trash

### 4. User permanently deletes the file

```bash
DELETE /api/trash/files/file-id
```

→ File is permanently deleted from storage and database

---

## Audit Logging

All trash operations are logged in the audit log with the following actions:

- `soft_delete` - File/folder moved to trash
- `restore` - File/folder restored from trash
- `hard_delete_from_trash` - File/folder permanently deleted
- `empty_trash` - All trash items permanently deleted
- `batch_soft_delete` - Multiple items moved to trash

---

## Error Handling

### Common Error Responses

**404 - Not Found**

```json
{
  "success": false,
  "error": "File not found in trash"
}
```

**403 - Access Denied**

```json
{
  "success": false,
  "error": "Access denied"
}
```

**400 - Bad Request**

```json
{
  "success": false,
  "error": "File is not in trash. Use soft delete first"
}
```

---

## Storage Quota Impact

- **Soft Delete**: Decrements storage quota (file no longer counted as used)
- **Restore**: Increments storage quota (file counted again)
- **Hard Delete**: No change to quota (already decremented during soft delete)

---

## Notes

1. Soft delete is a non-destructive operation - files can be recovered
2. Hard delete is permanent - files cannot be recovered
3. Deleted files are excluded from normal queries
4. All trash operations require ownership or proper permissions
5. Batch deletion is more efficient than individual deletions for multiple items
