# Secure Cloud System
**Enterprise-Style File Storage with RBAC, Sharing, and Audit Compliance**

---

## The Problem

Most consumer cloud drives optimize for simplicity, not inspectable security or compliance. That implies:

- Permission logic is opaque — you cannot see or export who accessed what, when, and with what outcome.
- Building secure file sharing from scratch requires coordinating authentication, hierarchical access control, versioning, soft-delete lifecycle, and per-user quota enforcement in one coherent system.
- Naive sharing (public links without expiry or password protection) and hard deletes create compliance and recovery risks when access should be time-limited or revocable.
- Filename-only search without metadata tags fails for organized enterprise libraries where files span many folders and collaborators.

Traditional approaches either delegate everything to a proprietary SaaS with limited audit export, or ship a basic upload/download API without versioning, sharing inheritance, or accountability trails.

---

## Our Solution

A full-stack secure cloud file platform that handles identity via Clerk, stores metadata in MySQL through Prisma, and persists file blobs on local disk (with an S3 stub for future cloud deployment). Every sensitive action is permission-checked, quota-enforced, and audit-logged.

- **Clerk** handles sign-in/sign-up; the backend verifies JWTs and provisions users into **MySQL** with a default 10 GB quota.
- Hierarchical **folders and files** with soft-delete trash, restore, and permanent purge.
- **Dual sharing model**: direct user permissions (view / edit / delete + expiry) and public token links (password + expiry + claim-after-login).
- **File versioning** with history, restore, and per-version download.
- **Tags and advanced search** (name, MIME type, size, date range, tags) across owned and shared resources.
- **Audit logging** with per-resource trails, personal activity feeds, and admin CSV/JSON export.
- **SHA-256 integrity checksums** computed on every upload.
- **Role-based access control**: `admin`, `editor`, and `viewer` roles gate system-level operations.

---

## Architecture

| Component | Path | Role |
|-----------|------|------|
| Frontend SPA | [`frontend/src/`](frontend/src/) | React 19 + Vite UI, Clerk auth, Redux state |
| API Server | [`backend/src/index.ts`](backend/src/index.ts) | Express 4 + TypeScript REST API |
| Database | [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) | MySQL 8 via Prisma ORM |
| Object Storage | [`backend/src/services/storage.service.ts`](backend/src/services/storage.service.ts) | Local disk (default) or S3 URL stub |
| Auth Provider | Clerk (external) | Sign-in/up, JWT issuance |
| Infrastructure | [`docker-compose.yml`](docker-compose.yml) | MySQL container on host port **3307** |

```mermaid
flowchart LR
  subgraph client [Frontend port 5173]
    ReactApp[React + Redux]
    ClerkUI[Clerk Auth]
  end
  subgraph server [Backend port 5000]
    ExpressAPI[Express API]
    AccessCtrl[accessControl.ts]
    StorageSvc[storage.service.ts]
  end
  subgraph persistence [Persistence]
    MySQL[(MySQL 3307)]
    LocalDisk[backend/uploads]
  end
  ClerkUI -->|JWT| ReactApp
  ReactApp -->|REST /api/*| ExpressAPI
  ExpressAPI --> AccessCtrl
  ExpressAPI --> MySQL
  StorageSvc --> LocalDisk
```

---

## How It Works

### Authentication and User Provisioning

The system never stores passwords locally. Clerk handles identity; the backend trusts verified JWTs and maintains its own user records for ownership and permissions.

1. User signs in via Clerk on the frontend (`/sign-in`).
2. `setupAxiosInterceptor()` in [`frontend/src/services/api.ts`](frontend/src/services/api.ts) attaches `Authorization: Bearer <jwt>` to every API request.
3. On Dashboard mount, `POST /api/auth/sync` upserts the user in MySQL and provisions a 10 GB `StorageQuota` if new.
4. Profile and quota are stored in Redux via `authSlice`.

**Key files:** [`frontend/src/services/api.ts`](frontend/src/services/api.ts), [`backend/src/middleware/authenticate.ts`](backend/src/middleware/authenticate.ts), [`backend/src/modules/auth/auth.controller.ts`](backend/src/modules/auth/auth.controller.ts)

---

### File and Folder Lifecycle

| Stage | Behavior |
|-------|----------|
| **Upload** | Multer in-memory buffer (500 MB max) → SHA-256 checksum → write to `backend/uploads/` → insert `File` + `FileVersion` rows → increment `usedBytes` on quota |
| **Navigate** | Folder tree uses `path` and `depth` fields; permissions inherited up the ancestor chain via [`accessControl.ts`](backend/src/utils/accessControl.ts) |
| **Preview** | Image, PDF, text, video, and audio served inline; PPTX and unsupported formats are download-only |
| **Version** | Re-upload creates a new `FileVersion` record; restore swaps the active version without losing history |
| **Delete** | Soft delete sets `isDeleted=true` → item appears in Trash → restore flips flag or hard delete removes blob and frees quota |

**Key files:** [`backend/src/modules/files/file.controller.ts`](backend/src/modules/files/file.controller.ts), [`backend/src/modules/folders/folder.controller.ts`](backend/src/modules/folders/folder.controller.ts), [`backend/src/modules/trash/trash.service.ts`](backend/src/modules/trash/trash.service.ts)

---

### Sharing and Access Control

| Mode | Mechanism |
|------|-----------|
| **Direct share** | `Permission` record targeting a grantee's internal user ID, with level (`view` / `edit` / `delete` / `owner`) and optional expiry |
| **Public link** | UUID `ShareLink` token, optional bcrypt password hash, optional expiry; anonymous browse/download; signed-in users can **claim** to receive a persistent `view` permission |
| **Inheritance** | Folder permissions propagate to all nested files and subfolders via ancestor walk |

**Permission priority** (highest wins): `view` (1) < `edit` (2) < `delete` (3) < `owner` (4).

Owners bypass all permission checks. Expired or revoked permissions (`isActive=false`) are ignored.

**Key files:** [`backend/src/utils/accessControl.ts`](backend/src/utils/accessControl.ts), [`backend/src/modules/permissions/permission.controller.ts`](backend/src/modules/permissions/permission.controller.ts), [`backend/src/modules/share-links/shareLink.controller.ts`](backend/src/modules/share-links/shareLink.controller.ts)

---

### Search, Tags, and Audit

| Feature | Endpoint | Details |
|---------|----------|---------|
| **Tags** | `/api/tags/files/:fileId/tags` | Key/value metadata attached to files |
| **Search** | `/api/search` | Query params: `q`, `mimeType`, `minSize`, `maxSize`, `dateFrom`, `dateTo`, `tags`, `scope`, `folderId` |
| **Personal audit** | `/api/audit-logs/me` | Paginated activity for the current user |
| **Audit export** | `/api/audit-logs/me/export` | JSON or CSV download |
| **Admin audit** | `/api/admin/audit-logs` | System-wide log (admin role required) |

Audit actions logged: `upload`, `download`, `delete`, `restore`, `view`, `edit`, `share`, `claim`, `login`, `logout`, `denied`.

---

## Configuration

### Backend Environment (`backend/.env`)

Copy [`backend/.env.example`](backend/.env.example) to `backend/.env` and fill in values.

| Variable | Required | Default / Example |
|----------|----------|-------------------|
| `CLERK_SECRET_KEY` | Yes | Clerk dashboard secret key |
| `DATABASE_URL` | Yes | `mysql://clouduser:CloudPass@2024@localhost:3307/secure_cloud_storage` |
| `PORT` | No | `5000` |
| `FRONTEND_URL` | No | `http://localhost:5173` |
| `USE_LOCAL_STORAGE` | No | `true` |
| `LOCAL_UPLOAD_PATH` | No | `./uploads` |
| `BACKEND_URL` | No | `http://localhost:5000` |
| `AWS_REGION` | No | S3 stub only — upload not implemented |
| `S3_BUCKET_NAME` | No | S3 stub only — upload not implemented |

### Frontend Environment (`frontend/.env`)

Copy [`frontend/.env.example`](frontend/.env.example) to `frontend/.env` and fill in values.

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `VITE_API_URL` | No | `http://localhost:5000/api` |

### Docker MySQL ([`docker-compose.yml`](docker-compose.yml))

| Setting | Value |
|---------|-------|
| Database | `secure_cloud_storage` |
| User / Password | `clouduser` / `CloudPass@2024` |
| Host port | **3307** → container 3306 |
| Root password | `rootpass` |

---

## Installation

**Prerequisites:** Node.js 18+, Docker Desktop, a free [Clerk](https://clerk.com) account.

```bash
# 1. Start MySQL
docker compose up -d

# 2. Backend setup
cd backend
cp .env.example .env          # fill in CLERK_SECRET_KEY and DATABASE_URL
npm install
npx prisma migrate deploy
npm run dev                   # http://localhost:5000

# 3. Frontend setup (new terminal)
cd frontend
cp .env.example .env          # fill in VITE_CLERK_PUBLISHABLE_KEY
npm install
npm run dev                   # http://localhost:5173
```

Open `http://localhost:5173`, sign up via Clerk, and the Dashboard will sync your user on first load.

For deeper setup details and request-level flows, see [WORKFLOW.md](WORKFLOW.md).

---

## Usage

### Quick Start

```bash
# Terminal 1 — database
docker compose up -d

# Terminal 2 — API
cd backend && npm run dev

# Terminal 3 — UI
cd frontend && npm run dev
```

### Demo Walkthrough

1. **Upload** — drag and drop files onto the Dashboard or use the file picker.
2. **Organize** — create nested folders in the sidebar tree; navigate with breadcrumbs.
3. **Share** — open ShareDialog on a file or folder; share by Clerk user ID or generate a public link with optional password and expiry.
4. **Preview** — double-click a file to open the preview modal (images, PDF, text, video, audio).
5. **Version history** — open Version History from the file context menu; restore or download older versions.
6. **Tags** — attach key/value tags via TagManager; search by tag in Advanced Search.
7. **Trash** — deleted items go to `/trash`; restore or permanently delete from there.
8. **Admin** — navigate to `/admin` (admin role) for system audit logs and user list.

### Health Check

```bash
curl http://localhost:5000/api/health
# {"success":true,"message":"Server is running","timestamp":"..."}
```

---

## Output

| Output | Location | Description |
|--------|----------|-------------|
| **Web UI** | `http://localhost:5173` | Dashboard, file grid, storage quota widget, toast notifications |
| **Server logs** | `backend/logs/combined.log`, `backend/logs/error.log` | Winston structured logs |
| **File blobs** | `backend/uploads/` | UUID-timestamp-based storage keys on disk |
| **Audit export** | Settings page or Admin panel | JSON/CSV download of activity logs |
| **Database** | MySQL on port 3307 | All metadata, permissions, audit records |

---

## File Structure

```
secure_cloud_system/
├── README.md                              # This file
├── WORKFLOW.md                            # End-to-end flows + file reference
├── docker-compose.yml                     # MySQL 8 container
├── FEATURES_OVERVIEW.md                   # Feature design rationale
├── TRASH_API_DOCUMENTATION.md             # Trash endpoint reference
├── PERSON3_PERMISSIONS_SHARING_ACCESS_CONTROL.md
├── SQL_QUERIES.md                         # Raw SQL reference
├── backend/
│   ├── src/index.ts                       # Express bootstrap + route mounts
│   ├── src/modules/                       # auth, files, folders, permissions, ...
│   ├── src/middleware/                    # authenticate, auditLogger, errorHandler
│   ├── src/services/storage.service.ts    # Local/S3 storage abstraction
│   ├── src/utils/accessControl.ts         # Permission inheritance engine
│   ├── prisma/schema.prisma               # Database schema
│   └── uploads/                           # Local file storage (gitignored)
├── frontend/
│   └── src/
│       ├── App.tsx                        # Routes + auth guards
│       ├── pages/                         # Dashboard, Trash, Shared*, Admin, Settings
│       ├── components/                    # FileGrid, ShareDialog, modals, ...
│       ├── services/                      # api.ts, fileService.ts
│       └── store/                         # Redux auth + file slices
└── *.tsx (repo root)                      # Legacy duplicates — not part of build
```

The canonical frontend source is `frontend/src/`. Root-level `.tsx` files (`Dashboard.tsx`, `FileGrid.tsx`, etc.) are legacy copies and are not wired into the Vite build.

---

## Design Decisions

**Why Clerk instead of custom auth?**
Password reset, MFA, OAuth, and session management are solved problems. Delegating identity to Clerk lets the backend focus on resource ownership and permissions. The backend only verifies JWTs and syncs a local `User` record — it never stores credentials.

**Why soft delete plus a dedicated Trash module?**
Accidental deletion is the most common data-loss scenario in file systems. Soft delete preserves rows and audit history; recovery is a single flag flip. Hard delete is an explicit second step that removes the blob from disk and decrements the user's quota — preventing silent permanent loss.

**Why permission inheritance on folders?**
Granting access file-by-file in a deep folder tree requires N permission rows and creates sync headaches when new files are added. Inheriting permissions from folder ancestors means one grant covers an entire subtree, matching how Google Drive and SharePoint behave at the folder level.

**Why SHA-256 checksums on upload?**
Checksums provide integrity verification independent of client-reported metadata. They support future deduplication, corruption detection, and audit trails that prove a stored blob matches what was originally uploaded.

---

## Caveats

- S3 upload logic is **stubbed** in `storage.service.ts` — local disk is the fully implemented storage backend.
- The `Session` Prisma model exists in the schema but has **no active application routes**.
- `express-rate-limit` is listed in dependencies but is **not wired** into middleware.
- Share-with-user requires a **Clerk user ID** (`user_xxx`), not an email address lookup.
- No automated test suite or CI/CD pipeline is included.
- The UI is desktop-first; mobile responsiveness is limited.
- Search covers filenames and tag metadata only — there is no full-text search inside PDF or document contents.
- Admin quota management has a backend API (`PATCH /api/admin/users/:id/quota`) but no edit UI in the Admin panel yet.

---

## Further Reading

| Document | When to read |
|----------|-------------|
| [WORKFLOW.md](WORKFLOW.md) | Request lifecycles, route maps, file-by-file reference |
| [FEATURES_OVERVIEW.md](FEATURES_OVERVIEW.md) | Feature rationale and database design decisions |
| [PERSON3_PERMISSIONS_SHARING_ACCESS_CONTROL.md](PERSON3_PERMISSIONS_SHARING_ACCESS_CONTROL.md) | Deep dive on permissions and sharing model |
| [TRASH_API_DOCUMENTATION.md](TRASH_API_DOCUMENTATION.md) | Trash REST endpoint payloads |
| [SQL_QUERIES.md](SQL_QUERIES.md) | Raw SQL for schema inspection and manual queries |
