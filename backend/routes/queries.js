// ============================================================
// DESIGN QUERIES API - Conversation/Support System
// ============================================================
const express = require("express");
const router = express.Router();

/* ============================================================
   CREATE NEW QUERY THREAD
   POST /api/queries/create
   ============================================================ */
router.post("/create", async (req, res) => {
    try {
        const { customer_id, booking_id, subject, message } = req.body;

        if (!customer_id || !subject || !message) {
            return res.status(400).json({
                status: "error",
                message: "customer_id, subject, and message are required"
            });
        }

        // Create thread
        const threadSql = `
            INSERT INTO design_query_threads (customer_id, booking_id, subject, status)
            VALUES (?, ?, ?, 'open')
        `;
        const [threadResult] = await global.db.query(threadSql, [customer_id, booking_id || null, subject]);
        const threadId = threadResult.insertId;

        // Create first message
        const messageSql = `
            INSERT INTO design_query_messages (thread_id, sender_id, message, is_designer)
            VALUES (?, ?, ?, FALSE)
        `;
        await global.db.query(messageSql, [threadId, customer_id, message]);

        return res.status(201).json({
            status: "success",
            message: "Query created successfully",
            thread_id: threadId
        });

    } catch (err) {
        console.error("Create query error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error: " + err.message
        });
    }
});

/* ============================================================
   GET CUSTOMER'S QUERY THREADS
   GET /api/queries/customer/:customer_id
   ============================================================ */
router.get("/customer/:customer_id", async (req, res) => {
    try {
        const { customer_id } = req.params;

        const sql = `
            SELECT 
                t.*,
                (SELECT COUNT(*) FROM design_query_messages WHERE thread_id = t.thread_id) as message_count,
                (SELECT COUNT(*) FROM design_query_messages 
                 WHERE thread_id = t.thread_id AND is_designer = TRUE AND read_status = FALSE) as unread_count,
                (SELECT message FROM design_query_messages WHERE thread_id = t.thread_id ORDER BY created_at DESC LIMIT 1) as last_message,
                designer.Firstname as designer_firstname,
                designer.Lastname as designer_lastname
            FROM design_query_threads t
            LEFT JOIN account designer ON t.assigned_to = designer.Account_ID
            WHERE t.customer_id = ?
            ORDER BY t.updated_at DESC
        `;

        const [rows] = await global.db.query(sql, [customer_id]);

        return res.json({
            status: "success",
            threads: rows
        });

    } catch (err) {
        console.error("Get customer threads error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error: " + err.message
        });
    }
});

/* ============================================================
   GET ALL QUERY THREADS (Designer View)
   GET /api/queries/all?status=open
   ============================================================ */
router.get("/all", async (req, res) => {
    try {
        const { status } = req.query;
        
        let sql = `
            SELECT 
                t.*,
                customer.Firstname as customer_firstname,
                customer.Lastname as customer_lastname,
                customer.Email as customer_email,
                (SELECT COUNT(*) FROM design_query_messages WHERE thread_id = t.thread_id) as message_count,
                (SELECT COUNT(*) FROM design_query_messages 
                 WHERE thread_id = t.thread_id AND is_designer = FALSE AND read_status = FALSE) as unread_count,
                (SELECT message FROM design_query_messages WHERE thread_id = t.thread_id ORDER BY created_at DESC LIMIT 1) as last_message,
                designer.Firstname as designer_firstname,
                designer.Lastname as designer_lastname
            FROM design_query_threads t
            LEFT JOIN account customer ON t.customer_id = customer.Account_ID
            LEFT JOIN account designer ON t.assigned_to = designer.Account_ID
        `;

        if (status) {
            sql += ` WHERE t.status = ?`;
        }

        sql += ` ORDER BY t.updated_at DESC`;

        const [rows] = await global.db.query(sql, status ? [status] : []);

        return res.json({
            status: "success",
            threads: rows
        });

    } catch (err) {
        console.error("Get all threads error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error: " + err.message
        });
    }
});

/* ============================================================
   GET MESSAGES FOR A THREAD
   GET /api/queries/messages/:thread_id
   ============================================================ */
router.get("/messages/:thread_id", async (req, res) => {
    try {
        const { thread_id } = req.params;

        const sql = `
            SELECT 
                m.*,
                sender.Firstname,
                sender.Lastname,
                sender.Email
            FROM design_query_messages m
            LEFT JOIN account sender ON m.sender_id = sender.Account_ID
            WHERE m.thread_id = ?
            ORDER BY m.created_at ASC
        `;

        const [rows] = await global.db.query(sql, [thread_id]);

        return res.json({
            status: "success",
            messages: rows
        });

    } catch (err) {
        console.error("Get messages error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error: " + err.message
        });
    }
});

/* ============================================================
   SEND MESSAGE IN THREAD
   POST /api/queries/message
   ============================================================ */
router.post("/message", async (req, res) => {
    try {
        const { thread_id, sender_id, message, is_designer } = req.body;

        if (!thread_id || !sender_id || !message) {
            return res.status(400).json({
                status: "error",
                message: "thread_id, sender_id, and message are required"
            });
        }

        const sql = `
            INSERT INTO design_query_messages (thread_id, sender_id, message, is_designer)
            VALUES (?, ?, ?, ?)
        `;
        
        const [result] = await global.db.query(sql, [thread_id, sender_id, message, is_designer || false]);
        const messageId = result.insertId;

        // Update thread's updated_at timestamp
        await global.db.query("UPDATE design_query_threads SET updated_at = NOW() WHERE thread_id = ?", [thread_id]);

        // Get sender info for real-time update
        const [senderRows] = await global.db.query(
            "SELECT Firstname, Lastname, Email FROM account WHERE Account_ID = ?",
            [sender_id]
        );

        // Emit real-time event via Socket.IO
        if (global.io) {
            global.io.to(`thread_${thread_id}`).emit("new_message", {
                message_id: messageId,
                thread_id,
                sender_id,
                message,
                is_designer: is_designer || false,
                Firstname: senderRows[0]?.Firstname,
                Lastname: senderRows[0]?.Lastname,
                Email: senderRows[0]?.Email,
                created_at: new Date()
            });

            // Also emit thread update to refresh thread lists
            global.io.emit("thread_updated", { thread_id });
        }

        return res.status(201).json({
            status: "success",
            message: "Message sent successfully"
        });

    } catch (err) {
        console.error("Send message error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error: " + err.message
        });
    }
});

/* ============================================================
   UPDATE THREAD STATUS
   PATCH /api/queries/status/:thread_id
   ============================================================ */
router.patch("/status/:thread_id", async (req, res) => {
    try {
        const { thread_id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                status: "error",
                message: "status is required"
            });
        }

        const sql = `UPDATE design_query_threads SET status = ?, updated_at = NOW() WHERE thread_id = ?`;
        await global.db.query(sql, [status, thread_id]);

        return res.json({
            status: "success",
            message: "Status updated successfully"
        });

    } catch (err) {
        console.error("Update status error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error: " + err.message
        });
    }
});

/* ============================================================
   ASSIGN DESIGNER TO THREAD
   PATCH /api/queries/assign/:thread_id
   ============================================================ */
router.patch("/assign/:thread_id", async (req, res) => {
    try {
        const { thread_id } = req.params;
        const { designer_id } = req.body;

        const sql = `
            UPDATE design_query_threads 
            SET assigned_to = ?, status = 'in_progress', updated_at = NOW() 
            WHERE thread_id = ?
        `;
        
        await global.db.query(sql, [designer_id || null, thread_id]);

        return res.json({
            status: "success",
            message: "Designer assigned successfully"
        });

    } catch (err) {
        console.error("Assign designer error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error: " + err.message
        });
    }
});

/* ============================================================
   MARK MESSAGES AS READ
   PATCH /api/queries/mark-read/:thread_id
   ============================================================ */
router.patch("/mark-read/:thread_id", async (req, res) => {
    try {
        const { thread_id } = req.params;
        const { is_designer } = req.body;

        // Mark messages as read based on who is reading them
        const sql = `
            UPDATE design_query_messages 
            SET read_status = TRUE 
            WHERE thread_id = ? AND is_designer = ?
        `;
        
        await global.db.query(sql, [thread_id, !is_designer]);

        return res.json({
            status: "success",
            message: "Messages marked as read"
        });

    } catch (err) {
        console.error("Mark read error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error: " + err.message
        });
    }
});

module.exports = router;
