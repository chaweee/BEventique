// routes/packages.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

/* ============================================================
   GET ALL PACKAGES  (replacement for get_package.php)
   ============================================================ */
router.get("/list", async (req, res) => {
    try {
        const [rows] = await global.db.query(
            "SELECT Package_ID, Package_Name, Description, NumTables, NumRoundTables, NumChairs, NumTent, NumPlatform, Package_Amount, Status, package_layout FROM package ORDER BY Package_ID DESC"
        );
        
        // Fetch photos for each package
        const packagesWithPhotos = await Promise.all(rows.map(async (pkg) => {
            const [photoRows] = await global.db.query(
                "SELECT Photo FROM package_photos WHERE Package_ID = ? ORDER BY Photo_ID ASC",
                [pkg.Package_ID]
            );
            
            // Convert old photo paths to new format
            const convertPhotoPath = (photoPath) => {
                if (!photoPath) return null;
                if (photoPath.startsWith('http://')) return photoPath;
                if (photoPath.startsWith('/Eventique/api/uploads/')) {
                    return photoPath.replace('/Eventique/api/uploads/', 'http://localhost:3001/uploads/');
                }
                return photoPath;
            };
            
            return {
                ...pkg,
                photos: photoRows.map(p => convertPhotoPath(p.Photo)).filter(Boolean)
            };
        }));
        
        return res.json(packagesWithPhotos);
    } catch (err) {
        console.error("Get package error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error retrieving packages",
        });
    }
});

/* ============================================================
   ADD PACKAGE  (replacement for add_package.php)
   ============================================================ */
router.post("/add", async (req, res) => {
    try {
        const {
            Package_Name,
            description,
            NumTables,
            NumRoundTables,
            NumChairs,
            NumTent,
            NumPlatform,
            Package_Amount,
            package_layout
        } = req.body;

        if (!Package_Name) {
            return res.status(400).json({
                status: "error",
                message: "Package name is required"
            });
        }

        const sql = `
            INSERT INTO package 
                (Package_Name, Description, NumTables, NumRoundTables, NumChairs, NumTent, NumPlatform, Package_Amount, Status, package_layout)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
        `;

        const [result] = await global.db.query(sql, [
            Package_Name,
            description || "",
            parseInt(NumTables) || 0,
            parseInt(NumRoundTables) || 0,
            parseInt(NumChairs) || 0,
            parseInt(NumTent) || 0,
            parseInt(NumPlatform) || 0,
            parseFloat(Package_Amount) || 0,
            package_layout || null
        ]);

        const packageId = result.insertId;

        // Handle file uploads if any
        if (req.files && req.files["photos[]"]) {
            const photos = Array.isArray(req.files["photos[]"]) 
                ? req.files["photos[]"] 
                : [req.files["photos[]"]];

            const uploadDir = path.join(__dirname, "..", "uploads", `package_${packageId}`);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            for (let i = 0; i < photos.length; i++) {
                const photo = photos[i];
                const ext = path.extname(photo.name);
                const filename = `p_${Date.now()}_${i}${ext}`;
                const dest = path.join(uploadDir, filename);
                
                await photo.mv(dest);
                
                const photoUrl = `http://localhost:3001/uploads/package_${packageId}/${filename}`;
                
                // Save to database
                await global.db.query(
                    "INSERT INTO package_photos (Package_ID, Photo) VALUES (?, ?)",
                    [packageId, photoUrl]
                );
            }
        }

        return res.json({
            status: "success",
            Package_ID: packageId,
            message: "Package added successfully"
        });

    } catch (err) {
        console.error("Add package error:", err);
        return res.status(500).json({
            status: "error",
            message: "Could not insert package: " + err.message,
        });
    }
});

/* ============================================================
   DELETE PACKAGE PHOTO  (replacement for delete_package_photo.php)
   ============================================================ */
router.post("/delete-photo", async (req, res) => {
    try {
        const { photo_id, photo_url } = req.body;

        if (!photo_id && !photo_url) {
            return res.status(400).json({
                status: "error",
                message: "photo_id or photo_url required",
            });
        }

        let photoUrl = null;

        if (photo_id) {
            const [rows] = await global.db.query(
                "SELECT photo_url FROM package_photos WHERE id = ? LIMIT 1",
                [photo_id]
            );
            photoUrl = rows.length ? rows[0].photo_url : null;

            await global.db.query(
                "DELETE FROM package_photos WHERE id = ?",
                [photo_id]
            );
        } else {
            photoUrl = photo_url;
            await global.db.query(
                "DELETE FROM package_photos WHERE photo_url = ? LIMIT 1",
                [photoUrl]
            );
        }

        // Delete file
        if (photoUrl && photoUrl.startsWith("/")) {
            const filePath = path.join(__dirname, "..", photoUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        return res.json({ status: "success" });

    } catch (err) {
        console.error("Delete photo error:", err);
        return res.status(500).json({
            status: "error",
            message: "Could not delete photo",
        });
    }
});

/* ============================================================
   UPDATE PACKAGE  (replacement for update_package.php)
   ============================================================ */
router.post("/update", async (req, res) => {
    try {
        const id = req.body.id;
        if (!id) {
            return res.status(400).json({
                status: "error",
                message: "Package ID is required",
            });
        }

        const {
            Package_Name,
            Description,
            NumTables,
            NumRoundTables,
            NumChairs,
            NumTent,
            NumPlatform,
            Package_Amount,
            package_layout,
            deleted_photos,
        } = req.body;

        let newPhotoUrls = [];

        /* --------------------------------------
           HANDLE DELETED PHOTOS
        -----------------------------------------*/
        if (deleted_photos) {
            try {
                const photosToDelete = JSON.parse(deleted_photos);
                console.log("Photos to delete:", photosToDelete);
                
                for (const photoUrl of photosToDelete) {
                    try {
                        // Delete from database
                        await global.db.query(
                            "DELETE FROM package_photos WHERE Photo = ?",
                            [photoUrl]
                        );
                        console.log(`Deleted from DB: ${photoUrl}`);
                        
                        // Delete file from disk (wrapped in its own try-catch)
                        if (photoUrl && photoUrl.includes('/uploads/')) {
                            try {
                                const urlPath = photoUrl.split('/uploads/')[1];
                                if (urlPath) {
                                    const filePath = path.join(__dirname, "..", "uploads", urlPath);
                                    console.log(`Attempting to delete file: ${filePath}`);
                                    if (fs.existsSync(filePath)) {
                                        fs.unlinkSync(filePath);
                                        console.log(`Deleted file: ${filePath}`);
                                    } else {
                                        console.log(`File not found (already deleted?): ${filePath}`);
                                    }
                                }
                            } catch (fileErr) {
                                console.error(`Error deleting file: ${fileErr.message}`);
                                // Continue - don't crash if file deletion fails
                            }
                        }
                    } catch (photoErr) {
                        console.error(`Error processing photo ${photoUrl}:`, photoErr.message);
                        // Continue with next photo
                    }
                }
            } catch (e) {
                console.error("Error parsing deleted_photos:", e.message);
            }
        }

        /* --------------------------------------
           FILE UPLOAD HANDLING - Multiple Photos
        -----------------------------------------*/
        if (req.files && req.files['photos[]']) {
            const photos = Array.isArray(req.files['photos[]']) 
                ? req.files['photos[]'] 
                : [req.files['photos[]']];

            const uploadDir = path.join(__dirname, "..", "uploads");
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const pkgDir = path.join(uploadDir, `package_${id}`);
            if (!fs.existsSync(pkgDir)) {
                fs.mkdirSync(pkgDir, { recursive: true });
            }

            for (const photo of photos) {
                const ext = path.extname(photo.name);
                const filename = `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
                const dest = path.join(pkgDir, filename);

                await photo.mv(dest);

                const photoUrl = `http://localhost:3001/uploads/package_${id}/${filename}`;
                newPhotoUrls.push(photoUrl);

                console.log(`Uploaded photo: ${photoUrl}`);

                // Add to package_photos table
                await global.db.query(
                    "INSERT INTO package_photos (Package_ID, Photo) VALUES (?, ?)",
                    [id, photoUrl]
                );
            }
        }

        /* --------------------------------------
           UPDATE PACKAGE FIELDS
        -----------------------------------------*/
        await global.db.query(
            `
            UPDATE package SET
                Package_Name = ?,
                Description = ?,
                NumTables = ?,
                NumRoundTables = ?,
                NumChairs = ?,
                NumTent = ?,
                NumPlatform = ?,
                Package_Amount = ?,
                package_layout = ?
            WHERE Package_ID = ?
        `,
            [
                Package_Name || "",
                Description || "",
                parseInt(NumTables) || 0,
                parseInt(NumRoundTables) || 0,
                parseInt(NumChairs) || 0,
                parseInt(NumTent) || 0,
                parseInt(NumPlatform) || 0,
                parseFloat(Package_Amount) || 0,
                package_layout || null,
                id,
            ]
        );

        return res.json({
            status: "success",
            message: "Package updated successfully",
            photos: newPhotoUrls,
        });

    } catch (err) {
        console.error("Update package error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error updating package: " + err.message,
        });
    }
});

/* ============================================================
   GET PACKAGE PHOTOS (replacement for package_photos.php)
   ============================================================ */
router.get("/:id/photos", async (req, res) => {
    const packageId = req.params.id;

    if (!packageId) {
        return res.status(400).json({
            status: "error",
            message: "package_id is required",
        });
    }

    try {
        const [rows] = await global.db.query(
            "SELECT * FROM package_photos WHERE package_id = ? ORDER BY id ASC",
            [packageId]
        );

        if (!rows.length) {
            return res.json({ status: "success", photos: [] });
        }

        const possibleCols = [
            "photo_url",
            "photo",
            "url",
            "image",
            "file",
            "path",
            "src",
        ];

        const photos = rows
            .map((r) => {
                for (const col of possibleCols) {
                    if (r[col] && String(r[col]).trim() !== "") {
                        return r[col];
                    }
                }
                return null;
            })
            .filter(Boolean);

        return res.json({ status: "success", photos });
    } catch (err) {
        console.error("Get photos error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error retrieving package photos",
        });
    }
});

/* ============================================================
   DELETE PACKAGE (replacement for delete_package.php)
   ============================================================ */
router.post("/delete", async (req, res) => {
    try {
        const { id } = req.body;
        
        if (!id) {
            return res.status(400).json({
                status: "error",
                message: "Package ID is required"
            });
        }

        // First delete associated photos from database
        await global.db.query("DELETE FROM package_photos WHERE Package_ID = ?", [id]);
        
        // Then delete the package
        const [result] = await global.db.query("DELETE FROM package WHERE Package_ID = ?", [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: "error",
                message: "Package not found"
            });
        }

        return res.json({
            status: "success",
            message: "Package deleted successfully"
        });

    } catch (err) {
        console.error("Delete package error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error deleting package"
        });
    }
});

/* ============================================================
   GET SINGLE PACKAGE (replacement for get_package.php)
   ============================================================ */
router.get("/:id", async (req, res) => {
    try {
        const packageId = req.params.id;
        
        if (!packageId) {
            return res.status(400).json({
                status: "error",
                message: "Package ID is required"
            });
        }

        // Get package details
        const [packageRows] = await global.db.query(
            "SELECT * FROM package WHERE Package_ID = ? LIMIT 1",
            [packageId]
        );

        if (!packageRows.length) {
            return res.status(404).json({
                status: "error",
                message: "Package not found"
            });
        }

        const pkg = packageRows[0];

        // Get package photos
        const [photoRows] = await global.db.query(
            "SELECT * FROM package_photos WHERE Package_ID = ? ORDER BY Photo_ID ASC",
            [packageId]
        );

        console.log("Raw package data from DB:", pkg);
        console.log("Photo rows from DB:", photoRows);

        // Map to expected format (use package_layout as canvas_layout since that's where data is stored)
        // Convert old photo paths to new format
        const convertPhotoPath = (photoPath) => {
            if (!photoPath) return null;
            if (photoPath.startsWith('http://')) return photoPath; // Already new format
            // Convert old /Eventique/api/uploads/ format to new http://localhost:3001/uploads/ format
            if (photoPath.startsWith('/Eventique/api/uploads/')) {
                return photoPath.replace('/Eventique/api/uploads/', 'http://localhost:3001/uploads/');
            }
            return photoPath;
        };

        const packageData = {
            id: pkg.Package_ID,
            Package_Name: pkg.Package_Name,
            Description: pkg.Description,
            NumTables: pkg.NumTables,
            NumRoundTables: pkg.NumRoundTables,
            NumChairs: pkg.NumChairs,
            NumTent: pkg.NumTent,
            NumPlatform: pkg.NumPlatform,
            Package_Amount: pkg.Package_Amount,
            Status: pkg.Status,
            canvas_layout: pkg.package_layout || pkg.canvas_layout, // Use package_layout as fallback
            photos: photoRows.map(photo => convertPhotoPath(photo.Photo)).filter(url => url && url.trim() !== ''),
            Photo: photoRows.length > 0 ? convertPhotoPath(photoRows[0].Photo) : null,
            photoDetails: photoRows // Include full photo details for debugging
        };

        console.log("Formatted package data being sent:", packageData);

        return res.json({
            status: "success",
            package: packageData
        });

    } catch (err) {
        console.error("Get package error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error retrieving package"
        });
    }
});

module.exports = router;
