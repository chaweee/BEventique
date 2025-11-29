// routes/upload.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

/**
 * POST /api/upload/package-photo
 * Expects:
 *  - package_id in req.body
 *  - file in req.files.photo (using express-fileupload)
 *
 * Returns JSON:
 *  { status: "success", photo: { id, url } }
 */
router.post("/package-photo", async (req, res) => {
    try {
        const package_id = req.body.package_id;
        if (!package_id) {
            return res.status(400).json({ status: "error", message: "package_id required" });
        }

        if (!req.files || !req.files.photo) {
            return res.status(400).json({ status: "error", message: "No file uploaded" });
        }

        const photo = req.files.photo;

        // prepare upload directories
        const uploadsRoot = path.join(__dirname, "..", "uploads");
        if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });

        const safeId = String(package_id).replace(/[^0-9A-Za-z_-]/g, "");
        const pkgDir = path.join(uploadsRoot, `package_${safeId}`);
        if (!fs.existsSync(pkgDir)) fs.mkdirSync(pkgDir, { recursive: true });

        const ext = path.extname(photo.name) || "";
        const fname = `photo_${Date.now()}${ext}`;
        const dest = path.join(pkgDir, fname);

        // move file (express-fileupload exposes .mv)
        await new Promise((resolve, reject) => {
            photo.mv(dest, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // build URL path (keeps same pattern as your PHP)
        const urlPath = `/Eventique/api/uploads/package_${safeId}/${fname}`;

        // insert record into package_photos table
        try {
            const sql = "INSERT INTO package_photos (package_id, photo_url) VALUES (?, ?)";
            const [result] = await global.db.query(sql, [package_id, urlPath]);
            const id = result && result.insertId ? result.insertId : null;

            return res.json({ status: "success", photo: { id, url: urlPath } });
        } catch (dbErr) {
            console.error("DB error saving package photo:", dbErr);

            // Optionally remove the file since DB failed
            try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch (_) {}

            return res.status(500).json({ status: "error", message: "Could not save photo record" });
        }

    } catch (err) {
        console.error("Upload package photo error:", err);
        return res.status(500).json({ status: "error", message: "Upload failed" });
    }
});

module.exports = router;
