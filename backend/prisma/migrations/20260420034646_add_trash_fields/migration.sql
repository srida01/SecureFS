-- AlterTable
ALTER TABLE `files` ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `folders` ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `share_links` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `resource_id` VARCHAR(191) NOT NULL,
    `resource_type` ENUM('file', 'folder') NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `share_links_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `share_links` ADD CONSTRAINT `share_links_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
