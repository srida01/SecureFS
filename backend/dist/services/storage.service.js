"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const LOCAL_PATH = process.env.LOCAL_UPLOAD_PATH || './uploads';
// Ensure upload directory exists
if (!fs_1.default.existsSync(LOCAL_PATH)) {
    fs_1.default.mkdirSync(LOCAL_PATH, { recursive: true });
}
exports.storageService = {
    async uploadFile(buffer, originalName, mimeType) {
        const key = `${(0, uuid_1.v4)()}-${Date.now()}-${originalName}`;
        const checksum = crypto_1.default.createHash('sha256').update(buffer).digest('hex');
        if (process.env.USE_LOCAL_STORAGE === 'true') {
            const filePath = path_1.default.join(LOCAL_PATH, key);
            fs_1.default.writeFileSync(filePath, buffer);
            return { key, checksum };
        }
        // S3 upload (optional)
        // const s3 = new S3Client({ region: process.env.AWS_REGION });
        // await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key, Body: buffer }));
        return { key, checksum };
    },
    async deleteFile(key) {
        if (process.env.USE_LOCAL_STORAGE === 'true') {
            const filePath = path_1.default.join(LOCAL_PATH, key);
            if (fs_1.default.existsSync(filePath))
                fs_1.default.unlinkSync(filePath);
        }
    },
    getFileUrl(key) {
        if (process.env.USE_LOCAL_STORAGE === 'true') {
            return `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/${key}`;
        }
        return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    },
};
//# sourceMappingURL=storage.service.js.map