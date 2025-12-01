/**
 * Package Model
 * Represents event packages
 */

const db = require('../db/connection');

class Package {
  /**
   * Find package by ID
   */
  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM packages WHERE Package_ID = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Find all packages with photos
   */
  static async findAll({ page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    
    const [packages] = await db.query(
      'SELECT * FROM packages LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
    // Fetch photos for each package
    for (const pkg of packages) {
      const [photos] = await db.query(
        'SELECT photo_url FROM package_photos WHERE Package_ID = ?',
        [pkg.Package_ID]
      );
      pkg.photos = photos.map(p => p.photo_url);
    }
    
    return packages;
  }

  /**
   * Create new package
   */
  static async create({ name, description, amount }) {
    const [result] = await db.query(
      'INSERT INTO packages (Package_Name, Description, Package_Amount) VALUES (?, ?, ?)',
      [name, description, amount]
    );
    
    return this.findById(result.insertId);
  }

  /**
   * Update package
   */
  static async update(id, data) {
    const fields = [];
    const values = [];
    
    if (data.name) {
      fields.push('Package_Name = ?');
      values.push(data.name);
    }
    if (data.description) {
      fields.push('Description = ?');
      values.push(data.description);
    }
    if (data.amount) {
      fields.push('Package_Amount = ?');
      values.push(data.amount);
    }
    
    if (fields.length === 0) return null;
    
    values.push(id);
    
    await db.query(
      `UPDATE packages SET ${fields.join(', ')} WHERE Package_ID = ?`,
      values
    );
    
    return this.findById(id);
  }

  /**
   * Delete package
   */
  static async delete(id) {
    // Delete photos first
    await db.query('DELETE FROM package_photos WHERE Package_ID = ?', [id]);
    
    const [result] = await db.query(
      'DELETE FROM packages WHERE Package_ID = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Add photo to package
   */
  static async addPhoto(packageId, photoUrl) {
    await db.query(
      'INSERT INTO package_photos (Package_ID, photo_url) VALUES (?, ?)',
      [packageId, photoUrl]
    );
  }

  /**
   * Remove photo from package
   */
  static async removePhoto(packageId, photoUrl) {
    await db.query(
      'DELETE FROM package_photos WHERE Package_ID = ? AND photo_url = ?',
      [packageId, photoUrl]
    );
  }
}

module.exports = Package;
