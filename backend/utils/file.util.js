/**
 * File Helper Utility
 * Helpers for file upload and management
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

/**
 * Ensure directory exists, create if not
 */
exports.ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

/**
 * Delete file
 */
exports.deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    logger.info(`File deleted: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to delete file: ${filePath}`, error);
    throw error;
  }
};

/**
 * Get file extension
 */
exports.getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

/**
 * Generate unique filename
 */
exports.generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  
  return `${name}-${timestamp}-${random}${ext}`;
};

/**
 * Validate file type
 */
exports.isValidFileType = (filename, allowedTypes) => {
  const ext = this.getFileExtension(filename);
  return allowedTypes.includes(ext);
};

/**
 * Format file size
 */
exports.formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Clean old files from directory
 */
exports.cleanOldFiles = async (dirPath, maxAgeInDays = 30) => {
  try {
    const files = await fs.readdir(dirPath);
    const now = Date.now();
    const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000;
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        await this.deleteFile(filePath);
      }
    }
    
    logger.info(`Cleaned old files from ${dirPath}`);
  } catch (error) {
    logger.error('Failed to clean old files', error);
  }
};
