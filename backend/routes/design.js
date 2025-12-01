// ============================================================
// DESIGN MANAGEMENT SYSTEM - Backend Routes
// ============================================================
const express = require("express");
const router = express.Router();

/* ============================================================
   A. CREATE DESIGN REQUEST
   POST /api/design/request
   ============================================================ */
router.post("/request", async (req, res) => {
    try {
        const { booking_id, client_id, layout_specs, notes } = req.body;

        // Validation
        if (!booking_id || !client_id) {
            return res.status(400).json({
                status: "error",
                message: "booking_id and client_id are required"
            });
        }

        const sql = `
            INSERT INTO design_requests (booking_id, client_id, layout_specs, notes, status)
            VALUES (?, ?, ?, ?, 'pending')
        `;

        const [result] = await global.db.query(sql, [
            booking_id,
            client_id,
            layout_specs || null,
            notes || null
        ]);

        // Log activity
        await logActivity(result.insertId, client_id, "REQUEST_CREATED", "Design request created");

        return res.status(201).json({
            status: "success",
            message: "Design request created successfully",
            request_id: result.insertId
        });

    } catch (err) {
        console.error("Create design request error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error creating design request: " + err.message
        });
    }
});

/* ============================================================
   B. GET ALL PENDING DESIGN REQUESTS
   GET /api/design/pending
   ============================================================ */
router.get("/pending", async (req, res) => {
    try {
        const sql = `
            SELECT 
                dr.*,
                client.Firstname AS client_firstname,
                client.Lastname AS client_lastname,
                client.Email AS client_email
            FROM design_requests dr
            LEFT JOIN account client ON dr.client_id = client.Account_ID
            WHERE dr.status = 'pending'
            ORDER BY dr.created_at ASC
        `;

        const [rows] = await global.db.query(sql);

        return res.json({
            status: "success",
            count: rows.length,
            requests: rows
        });

    } catch (err) {
        console.error("Get pending requests error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error fetching pending requests: " + err.message
        });
    }
});

/* ============================================================
   GET ALL DESIGN REQUESTS (with optional status filter)
   GET /api/design/list?status=pending|assigned|completed
   ============================================================ */
router.get("/list", async (req, res) => {
    try {
        const { status, designer_id, client_id } = req.query;

        let sql = `
            SELECT 
                dr.*,
                client.Firstname AS client_firstname,
                client.Lastname AS client_lastname,
                client.Email AS client_email,
                designer.Firstname AS designer_firstname,
                designer.Lastname AS designer_lastname,
                designer.Email AS designer_email
            FROM design_requests dr
            LEFT JOIN account client ON dr.client_id = client.Account_ID
            LEFT JOIN account designer ON dr.assigned_to = designer.Account_ID
            WHERE 1=1
        `;

        const params = [];

        if (status) {
            sql += " AND dr.status = ?";
            params.push(status);
        }

        if (designer_id) {
            sql += " AND dr.assigned_to = ?";
            params.push(designer_id);
        }

        if (client_id) {
            sql += " AND dr.client_id = ?";
            params.push(client_id);
        }

        sql += " ORDER BY dr.created_at DESC";

        const [rows] = await global.db.query(sql, params);

        return res.json({
            status: "success",
            count: rows.length,
            requests: rows
        });

    } catch (err) {
        console.error("Get design requests error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error fetching design requests: " + err.message
        });
    }
});

/* ============================================================
   C. ASSIGN DESIGNER TO REQUEST
   POST /api/design/assign
   ============================================================ */
router.post("/assign", async (req, res) => {
    try {
        const { request_id, designer_id } = req.body;

        // Validation
        if (!request_id || !designer_id) {
            return res.status(400).json({
                status: "error",
                message: "request_id and designer_id are required"
            });
        }

        // Check if request exists and is pending
        const [existing] = await global.db.query(
            "SELECT * FROM design_requests WHERE request_id = ?",
            [request_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Design request not found"
            });
        }

        if (existing[0].status !== 'pending') {
            return res.status(400).json({
                status: "error",
                message: `Cannot assign designer. Request status is '${existing[0].status}'`
            });
        }

        // Verify designer exists
        const [designer] = await global.db.query(
            "SELECT Account_ID, Firstname, Lastname FROM account WHERE Account_ID = ?",
            [designer_id]
        );

        if (designer.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Designer not found"
            });
        }

        // Update the request
        const sql = `
            UPDATE design_requests 
            SET assigned_to = ?, status = 'assigned', updated_at = NOW()
            WHERE request_id = ?
        `;

        await global.db.query(sql, [designer_id, request_id]);

        // Log activity
        await logActivity(
            request_id, 
            designer_id, 
            "DESIGNER_ASSIGNED", 
            `Assigned to ${designer[0].Firstname} ${designer[0].Lastname}`
        );

        return res.json({
            status: "success",
            message: "Designer assigned successfully",
            designer: {
                id: designer[0].Account_ID,
                name: `${designer[0].Firstname} ${designer[0].Lastname}`
            }
        });

    } catch (err) {
        console.error("Assign designer error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error assigning designer: " + err.message
        });
    }
});

/* ============================================================
   D. SAVE REVISION NOTES FROM CLIENT
   POST /api/design/revision
   ============================================================ */
router.post("/revision", async (req, res) => {
    try {
        const { request_id, revision_note, revised_by } = req.body;

        // Validation
        if (!request_id || !revision_note || !revised_by) {
            return res.status(400).json({
                status: "error",
                message: "request_id, revision_note, and revised_by are required"
            });
        }

        // Check if request exists
        const [existing] = await global.db.query(
            "SELECT * FROM design_requests WHERE request_id = ?",
            [request_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Design request not found"
            });
        }

        // Insert revision
        const insertSql = `
            INSERT INTO design_revisions (request_id, revision_note, revised_by)
            VALUES (?, ?, ?)
        `;

        const [result] = await global.db.query(insertSql, [
            request_id,
            revision_note,
            revised_by
        ]);

        // Update request status to 'revision'
        await global.db.query(
            "UPDATE design_requests SET status = 'revision', updated_at = NOW() WHERE request_id = ?",
            [request_id]
        );

        // Log activity
        await logActivity(request_id, revised_by, "REVISION_REQUESTED", revision_note.substring(0, 100));

        return res.status(201).json({
            status: "success",
            message: "Revision note saved successfully",
            revision_id: result.insertId
        });

    } catch (err) {
        console.error("Save revision error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error saving revision: " + err.message
        });
    }
});

/* ============================================================
   GET REVISIONS FOR A REQUEST
   GET /api/design/revisions/:request_id
   ============================================================ */
router.get("/revisions/:request_id", async (req, res) => {
    try {
        const { request_id } = req.params;

        const sql = `
            SELECT 
                rev.*,
                a.Firstname,
                a.Lastname,
                a.Email
            FROM design_revisions rev
            LEFT JOIN account a ON rev.revised_by = a.Account_ID
            WHERE rev.request_id = ?
            ORDER BY rev.created_at DESC
        `;

        const [rows] = await global.db.query(sql, [request_id]);

        return res.json({
            status: "success",
            count: rows.length,
            revisions: rows
        });

    } catch (err) {
        console.error("Get revisions error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error fetching revisions: " + err.message
        });
    }
});

/* ============================================================
   E. SAVE UPDATED DESIGN OUTPUT (Complete Request)
   POST /api/design/complete
   ============================================================ */
router.post("/complete", async (req, res) => {
    try {
        const { request_id, final_output, remarks, completed_by } = req.body;

        // Validation
        if (!request_id || !final_output) {
            return res.status(400).json({
                status: "error",
                message: "request_id and final_output are required"
            });
        }

        // Check if request exists
        const [existing] = await global.db.query(
            "SELECT * FROM design_requests WHERE request_id = ?",
            [request_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Design request not found"
            });
        }

        // Update the request with final output
        const sql = `
            UPDATE design_requests 
            SET final_output = ?, 
                status = 'completed', 
                completed_at = NOW(),
                updated_at = NOW()
            WHERE request_id = ?
        `;

        await global.db.query(sql, [final_output, request_id]);

        // Log activity
        if (completed_by) {
            await logActivity(
                request_id, 
                completed_by, 
                "DESIGN_COMPLETED", 
                remarks || "Final design submitted"
            );
        }

        return res.json({
            status: "success",
            message: "Design completed successfully",
            final_output: final_output
        });

    } catch (err) {
        console.error("Complete design error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error completing design: " + err.message
        });
    }
});

/* ============================================================
   UPDATE DESIGN STATUS (In Progress, etc.)
   PATCH /api/design/status/:request_id
   ============================================================ */
router.patch("/status/:request_id", async (req, res) => {
    try {
        const { request_id } = req.params;
        const { status, updated_by } = req.body;

        const validStatuses = ['pending', 'assigned', 'in_progress', 'revision', 'completed', 'cancelled'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                status: "error",
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const sql = `
            UPDATE design_requests 
            SET status = ?, updated_at = NOW()
            WHERE request_id = ?
        `;

        const [result] = await global.db.query(sql, [status, request_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: "error",
                message: "Design request not found"
            });
        }

        // Log activity
        if (updated_by) {
            await logActivity(request_id, updated_by, "STATUS_CHANGED", `Status changed to ${status}`);
        }

        return res.json({
            status: "success",
            message: `Status updated to '${status}'`
        });

    } catch (err) {
        console.error("Update status error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error updating status: " + err.message
        });
    }
});

/* ============================================================
   F. GET COMPLETE DESIGN REQUEST DETAILS
   GET /api/design/:request_id
   ============================================================ */
router.get("/:request_id", async (req, res) => {
    try {
        const { request_id } = req.params;

        // Get request details with joins
        const requestSql = `
            SELECT 
                dr.*,
                client.Firstname AS client_firstname,
                client.Lastname AS client_lastname,
                client.Email AS client_email,
                client.Contact_Number AS client_phone,
                designer.Firstname AS designer_firstname,
                designer.Lastname AS designer_lastname,
                designer.Email AS designer_email
            FROM design_requests dr
            LEFT JOIN account client ON dr.client_id = client.Account_ID
            LEFT JOIN account designer ON dr.assigned_to = designer.Account_ID
            WHERE dr.request_id = ?
        `;

        const [requestRows] = await global.db.query(requestSql, [request_id]);

        if (requestRows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Design request not found"
            });
        }

        // Get revisions
        const revisionsSql = `
            SELECT 
                rev.*,
                a.Firstname,
                a.Lastname
            FROM design_revisions rev
            LEFT JOIN account a ON rev.revised_by = a.Account_ID
            WHERE rev.request_id = ?
            ORDER BY rev.created_at DESC
        `;

        const [revisionRows] = await global.db.query(revisionsSql, [request_id]);

        // Get activity log
        const activitySql = `
            SELECT 
                log.*,
                a.Firstname,
                a.Lastname
            FROM design_activity_log log
            LEFT JOIN account a ON log.performed_by = a.Account_ID
            WHERE log.request_id = ?
            ORDER BY log.created_at DESC
            LIMIT 20
        `;

        const [activityRows] = await global.db.query(activitySql, [request_id]);

        return res.json({
            status: "success",
            request: requestRows[0],
            revisions: revisionRows,
            activity_log: activityRows
        });

    } catch (err) {
        console.error("Get design request details error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error fetching request details: " + err.message
        });
    }
});

/* ============================================================
   DELETE DESIGN REQUEST
   DELETE /api/design/:request_id
   ============================================================ */
router.delete("/:request_id", async (req, res) => {
    try {
        const { request_id } = req.params;

        const [result] = await global.db.query(
            "DELETE FROM design_requests WHERE request_id = ?",
            [request_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: "error",
                message: "Design request not found"
            });
        }

        return res.json({
            status: "success",
            message: "Design request deleted successfully"
        });

    } catch (err) {
        console.error("Delete design request error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error deleting request: " + err.message
        });
    }
});

/* ============================================================
   GET DESIGNERS LIST (for assignment dropdown)
   GET /api/design/designers/list
   ============================================================ */
router.get("/designers/list", async (req, res) => {
    try {
        // Assuming designers have a specific account type
        const sql = `
            SELECT Account_ID, Firstname, Lastname, Email
            FROM account
            WHERE Account_Type = 'Designer'
            ORDER BY Firstname, Lastname
        `;

        const [rows] = await global.db.query(sql);

        return res.json({
            status: "success",
            count: rows.length,
            designers: rows
        });

    } catch (err) {
        console.error("Get designers list error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error fetching designers: " + err.message
        });
    }
});

/* ============================================================
   HELPER: Log Activity
   ============================================================ */
async function logActivity(request_id, performed_by, action, details) {
    try {
        await global.db.query(
            `INSERT INTO design_activity_log (request_id, action, performed_by, details)
             VALUES (?, ?, ?, ?)`,
            [request_id, action, performed_by, details]
        );
    } catch (err) {
        console.error("Error logging activity:", err);
        // Don't throw - logging failure shouldn't break main operation
    }
}

module.exports = router;
