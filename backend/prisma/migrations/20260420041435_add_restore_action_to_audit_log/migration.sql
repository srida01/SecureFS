-- AlterTable
ALTER TABLE `audit_logs` MODIFY `action` ENUM('upload', 'download', 'delete', 'restore', 'view', 'edit', 'share', 'login', 'logout', 'denied') NOT NULL;
