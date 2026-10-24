import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../interfaces/http/middlewares/errorHandler.js';
import { ErrorCode } from '@workforcepro/api-contracts';

export interface StoredPhotoResult {
  photoKey: string;
  photoHash: string;
  sizeBytes: number;
  mimeType: string;
  storedPath: string;
}

export class StorageService {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir = customBaseDir || path.resolve(process.cwd(), 'data', 'storage');
  }

  /**
   * Validates selfie data and writes to private, tenant-isolated storage.
   */
  async validateAndSaveSelfie(
    companyId: string,
    base64Data: string,
    dateStr: string
  ): Promise<StoredPhotoResult> {
    if (!base64Data || typeof base64Data !== 'string') {
      throw new AppError(
        400,
        ErrorCode.MISSING_ATTENDANCE_PHOTO,
        'Attendance selfie is required for verification'
      );
    }

    let mimeType = 'image/jpeg';
    let rawBase64 = base64Data.trim();

    // Parse Data URI if present: data:image/jpeg;base64,...
    const matches = rawBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches && matches[1] && matches[2]) {
      mimeType = matches[1].toLowerCase();
      rawBase64 = matches[2];
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        `Unsupported image format '${mimeType}'. Allowed formats: JPEG, PNG, WEBP`
      );
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(rawBase64, 'base64');
    } catch {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Invalid base64 encoding for attendance selfie'
      );
    }

    // Size checks: min 50 bytes, max 5MB
    if (buffer.length < 50) {
      throw new AppError(
        400,
        ErrorCode.MISSING_ATTENDANCE_PHOTO,
        'Attendance selfie is empty or invalid'
      );
    }
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (buffer.length > maxSizeBytes) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Attendance selfie exceeds maximum allowable size of 5MB'
      );
    }

    const photoHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const photoKey = `selfie_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    // Tenant-isolated private storage directory
    const targetDir = path.join(this.baseDir, 'tenants', companyId, 'attendance', dateStr);
    await fs.promises.mkdir(targetDir, { recursive: true });

    const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const filePath = path.join(targetDir, `${photoKey}.${extension}`);

    await fs.promises.writeFile(filePath, buffer, { mode: 0o600 });

    return {
      photoKey,
      photoHash,
      sizeBytes: buffer.length,
      mimeType,
      storedPath: filePath
    };
  }

  /**
   * Generates a short-lived cryptographically signed token for photo viewing (15 min expiry).
   */
  generateShortLivedPhotoToken(
    companyId: string,
    photoKey: string,
    expiresInMinutes: number = 15
  ): string {
    const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
    const payload = JSON.stringify({ companyId, photoKey, exp: expiresAt });
    const payloadB64 = Buffer.from(payload).toString('base64url');

    const signature = crypto
      .createHmac('sha256', env.JWT_ACCESS_SECRET)
      .update(payloadB64)
      .digest('base64url');

    return `${payloadB64}.${signature}`;
  }

  /**
   * Verifies the short-lived photo token.
   */
  verifyPhotoToken(token: string, expectedCompanyId: string, expectedPhotoKey: string): boolean {
    if (!token || typeof token !== 'string') return false;

    const parts = token.split('.');
    if (parts.length !== 2) return false;

    const [payloadB64, providedSig] = parts;
    if (!payloadB64 || !providedSig) return false;

    const expectedSig = crypto
      .createHmac('sha256', env.JWT_ACCESS_SECRET)
      .update(payloadB64)
      .digest('base64url');

    const isSigValid = crypto.timingSafeEqual(
      Buffer.from(providedSig),
      Buffer.from(expectedSig)
    );
    if (!isSigValid) return false;

    try {
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (
        payload.companyId !== expectedCompanyId ||
        payload.photoKey !== expectedPhotoKey ||
        Date.now() > payload.exp
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieves a photo buffer from private storage with tenant boundary verification.
   */
  async getPhotoStream(
    companyId: string,
    photoKey: string
  ): Promise<{ stream: fs.ReadStream; mimeType: string } | null> {
    const tenantDir = path.join(this.baseDir, 'tenants', companyId, 'attendance');
    if (!fs.existsSync(tenantDir)) return null;

    // Search for photoKey in tenant directory
    const dateDirs = await fs.promises.readdir(tenantDir);
    for (const dateDir of dateDirs) {
      const dirPath = path.join(tenantDir, dateDir);
      const files = await fs.promises.readdir(dirPath);
      for (const file of files) {
        if (file.startsWith(photoKey)) {
          const filePath = path.join(dirPath, file);
          const ext = path.extname(file).toLowerCase();
          const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
          return {
            stream: fs.createReadStream(filePath),
            mimeType
          };
        }
      }
    }

    return null;
  }

  /**
   * Purges photos older than the specified retention days.
   */
  async purgeExpiredPhotos(companyId: string, retentionDays: number = 90): Promise<number> {
    const tenantDir = path.join(this.baseDir, 'tenants', companyId, 'attendance');
    if (!fs.existsSync(tenantDir)) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffDateStr = cutoffDate.toISOString().slice(0, 10);

    let purgedCount = 0;
    const dateDirs = await fs.promises.readdir(tenantDir);
    for (const dateDir of dateDirs) {
      if (dateDir < cutoffDateStr) {
        const dirPath = path.join(tenantDir, dateDir);
        const files = await fs.promises.readdir(dirPath);
        for (const file of files) {
          await fs.promises.unlink(path.join(dirPath, file));
          purgedCount++;
        }
        await fs.promises.rmdir(dirPath);
      }
    }

    return purgedCount;
  }
}

export const storageService = new StorageService();
