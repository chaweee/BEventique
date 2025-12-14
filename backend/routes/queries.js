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
        const { customer_id, booking_id, message } = req.body;
        
        console.log("📝 CREATE QUERY - Received request:", { customer_id, booking_id, message: message?.substring(0, 50) });

        if (!customer_id || !booking_id || !message) {
            console.error("❌ CREATE QUERY - Missing required fields:", { customer_id, booking_id, hasMessage: !!message });
            return res.status(400).json({
                status: "error",
                message: "customer_id, booking_id, and message are required"
            });
        }

        // Insert into queries table with reply_to = NULL (this is a new thread)
        const querySql = `
            INSERT INTO queries (sender_id, booking_id, message, reply_to, created_at)
            VALUES (?, ?, ?, NULL, NOW())
        `;
        console.log("📝 CREATE QUERY - Inserting query with:", { sender_id: customer_id, booking_id, message: message.substring(0, 50) });
        const [queryResult] = await global.db.query(querySql, [customer_id, booking_id, message]);
        const queryId = queryResult.insertId;
        
        console.log("✅ CREATE QUERY - Query created with ID:", queryId);

        return res.status(201).json({
            status: "success",
            message: "Query created successfully",
            query_id: queryId
        });

    } catch (err) {
        console.error("❌ CREATE QUERY - Error:", err.message);
        console.error("❌ CREATE QUERY - Full error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error: " + err.message
        });
    }
});

/* ============================================================
   CHECK MIGRATION STATUS
   GET /api/queries/check-migration
   ============================================================ */
router.get("/check-migration", async (req, res) => {
    try {
        const [oldQueries] = await global.db.query(`
            SELECT COUNT(*) as count FROM queries WHERE reply_to IS NULL
        `);
        
        const [newThreads] = await global.db.query(`
            SELECT COUNT(*) as count FROM design_query_threads
        `);

        return res.json({
            status: "success",
            old_queries: oldQueries[0]?.count || 0,
            new_threads: newThreads[0]?.count || 0,
            message: "Check if migration is needed"
        });

    } catch (err) {
        console.error("Check migration error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error: " + err.message
        });
    }
});

/* ============================================================
   GET MESSAGES FOR A QUERY
   GET /api/queries/:query_id/messages
   ============================================================ */
router.get("/:query_id/messages", async (req, res) => {
    try {
        const { query_id } = req.params;

        // Fetch all messages from queries table only, with account and bookings joins
        const sql = `
            SELECT 
                q.query_id as message_id,
                q.sender_id,
                q.message,
                q.booking_id as thread_id,
                q.created_at,
                q.reply_to,
                0 as is_designer,
                CASE 
                    WHEN q.sender_id IS NULL THEN 'Admin'
                    ELSE CONCAT(a.FirstName, ' ', a.LastName)
                END as sender_name,
                a.Email as sender_email,
                DATE_FORMAT(q.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                b.event_date,
                b.event_time,
                e.event_type,
                p.Package_Name
            FROM queries q
            LEFT JOIN account a ON q.sender_id = a.Account_ID
            LEFT JOIN bookings b ON q.booking_id = b.booking_id
            LEFT JOIN event e ON b.event_id = e.event_id
            LEFT JOIN package p ON b.package_id = p.Package_ID
            WHERE q.query_id = ? OR q.reply_to = ?
            ORDER BY q.created_at ASC
        `;

        const [rows] = await global.db.query(sql, [query_id, query_id]);

        console.log("📨 GET MESSAGES - Query ID:", query_id, "Total messages:", rows.length);
        rows.forEach((msg, idx) => {
            console.log(`   [${idx}] query_id:${msg.message_id}, sender_id:${msg.sender_id}, reply_to:${msg.reply_to}, msg:"${msg.message?.substring(0, 20)}"`);
        });

        return res.json({
            status: "success",
            messages: rows
        });

    } catch (err) {
        console.error("❌ Get messages error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error: " + err.message
        });
    }
});

/* ============================================================
   SEND MESSAGE TO A QUERY
   POST /api/queries/:query_id/message
   ============================================================ */
router.post("/:query_id/message", async (req, res) => {
    try {
        const { query_id } = req.params;
        const { sender_id, message, is_designer } = req.body;

        if (!sender_id || !message) {
            return res.status(400).json({
                status: "error",
                message: "sender_id and message are required"
            });
        }

        // Insert into queries table with reply_to = query_id (this is a reply to the thread)
        const sql = `
            INSERT INTO queries (sender_id, booking_id, message, reply_to, created_at)
            SELECT ?, booking_id, ?, ?, NOW()
            FROM queries
            WHERE query_id = ?
            LIMIT 1
        `;

        const [result] = await global.db.query(sql, [sender_id, message, query_id, query_id]);
        const messageId = result.insertId;

        console.log("✅ Message sent - ID:", messageId, "Sender:", sender_id, "Reply to:", query_id);

        return res.status(201).json({
            status: "success",
            message: "Message sent successfully",
            message_id: messageId
        });

    } catch (err) {
        console.error("❌ Send message error:", err);
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
                t.thread_id,
                t.customer_id,
                t.booking_id,
                t.subject,
                t.status,
                t.priority,
                t.assigned_to,
                t.created_at,
                t.updated_at,
                customer.FirstName as customer_firstname,
                customer.LastName as customer_lastname,
                customer.Email as customer_email,
                (SELECT COUNT(*) FROM design_query_messages WHERE thread_id = t.thread_id) as message_count,
                (SELECT message FROM design_query_messages WHERE thread_id = t.thread_id ORDER BY created_at DESC LIMIT 1) as last_message,
                b.event_date,
                b.event_time,
                e.event_type
            FROM design_query_threads t
            LEFT JOIN account customer ON t.customer_id = customer.Account_ID
            LEFT JOIN bookings b ON t.booking_id = b.booking_id
            LEFT JOIN event e ON b.event_id = e.event_id
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
   GET ALL QUERY THREADS (Designer/Admin View)
   GET /api/queries/all?status=open
   ============================================================ */
router.get("/all", async (req, res) => {
    try {
        const { status } = req.query;
        
        let sql = `
            SELECT 
                t.thread_id,
                t.customer_id,
                t.booking_id,
                t.subject,
                t.status,
                t.priority,
                t.assigned_to,
                t.created_at,
                t.updated_at,
                customer.FirstName as customer_firstname,
                customer.LastName as customer_lastname,
                customer.Email as customer_email,
                (SELECT COUNT(*) FROM design_query_messages WHERE thread_id = t.thread_id) as message_count,
                (SELECT COUNT(*) FROM design_query_messages 
                 WHERE thread_id = t.thread_id AND is_designer = FALSE AND read_status = FALSE) as unread_count,
                (SELECT message FROM design_query_messages WHERE thread_id = t.thread_id ORDER BY created_at DESC LIMIT 1) as last_message,
                designer.FirstName as designer_firstname,
                designer.LastName as designer_lastname
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
   GET DESIGNER-ONLY QUERIES
   GET /api/queries/designer?status=open
   ============================================================ */
router.get("/designer", async (req, res) => {
    try {
        const { status } = req.query;
        
        let sql = `
            SELECT 
                t.thread_id,
                t.customer_id,
                t.booking_id,
                t.subject,
                t.status,
                t.priority,
                t.assigned_to,
                t.created_at,
                t.updated_at,
                customer.FirstName as customer_firstname,
                customer.LastName as customer_lastname,
                customer.Email as customer_email,
                (SELECT COUNT(*) FROM design_query_messages WHERE thread_id = t.thread_id) as message_count,
                (SELECT COUNT(*) FROM design_query_messages 
                 WHERE thread_id = t.thread_id AND is_designer = FALSE AND read_status = FALSE) as unread_count,
                (SELECT message FROM design_query_messages WHERE thread_id = t.thread_id ORDER BY created_at DESC LIMIT 1) as last_message,
                designer.FirstName as designer_firstname,
                designer.LastName as designer_lastname
            FROM design_query_threads t
            LEFT JOIN account customer ON t.customer_id = customer.Account_ID
            LEFT JOIN account designer ON t.assigned_to = designer.Account_ID
            WHERE t.subject LIKE '%Designer%'
        `;

        if (status) {
            sql += ` AND t.status = ?`;
        }

        sql += ` ORDER BY t.updated_at DESC`;

        const [rows] = await global.db.query(sql, status ? [status] : []);

        return res.json({
            status: "success",
            threads: rows
        });

    } catch (err) {
        console.error("Get designer threads error:", err);
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
        
        await global.db.query(sql, [thread_id, is_designer]);

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

/* ============================================================
   MIGRATE OLD QUERIES TO NEW THREADS (One-time migration)
   POST /api/queries/migrate
   ============================================================ */
router.post("/migrate", async (req, res) => {
    try {
        // Get all root queries (reply_to IS NULL) from old queries table
        const [oldQueries] = await global.db.query(`
            SELECT DISTINCT 
                q.query_id,
                q.sender_id,
                q.booking_id,
                q.created_at,
                COALESCE(b.customer_id, q.sender_id) as customer_id,
                'customer query' as subject
            FROM queries q
            LEFT JOIN bookings b ON q.booking_id = b.booking_id
            WHERE q.reply_to IS NULL
        `);

        let migratedCount = 0;

        for (const oldQuery of oldQueries) {
            try {
                // Create thread
                const [threadResult] = await global.db.query(`
                    INSERT INTO design_query_threads 
                    (customer_id, booking_id, subject, status, created_at, updated_at)
                    VALUES (?, ?, ?, 'open', ?, ?)
                `, [
                    oldQuery.customer_id,
                    oldQuery.booking_id,
                    oldQuery.subject,
                    oldQuery.created_at,
                    oldQuery.created_at
                ]);

                const threadId = threadResult.insertId;

                // Get all messages for this query (root + replies)
                const [allMessages] = await global.db.query(`
                    SELECT * FROM queries
                    WHERE query_id = ? OR reply_to = ?
                    ORDER BY created_at ASC
                `, [oldQuery.query_id, oldQuery.query_id]);

                // Migrate messages to new table
                for (const msg of allMessages) {
                    await global.db.query(`
                        INSERT INTO design_query_messages
                        (thread_id, sender_id, message, is_designer, created_at)
                        VALUES (?, ?, ?, 0, ?)
                    `, [threadId, msg.sender_id, msg.message, msg.created_at]);
                }

                migratedCount++;
            } catch (innerErr) {
                console.error(`Error migrating query ${oldQuery.query_id}:`, innerErr.message);
            }
        }

        return res.json({
            status: "success",
            message: `Migrated ${migratedCount} queries to new system`
        });

    } catch (err) {
        console.error("Migration error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error: " + err.message
        });
    }
});

/* ============================================================
   CREATE NEW QUERY THREAD (Customer)
   POST /api/queries/create-thread
   ============================================================ */
router.post("/create-thread", async (req, res) => {
    try {
        const { customer_id, booking_id, subject, message, recipient_type } = req.body;

        if (!customer_id || !booking_id || !subject || !message) {
            return res.status(400).json({
                status: "error",
                message: "customer_id, booking_id, subject, and message are required"
            });
        }

        // Determine initial status and priority based on recipient type
        const initialStatus = "open";
        const priority = recipient_type === "designer" ? "high" : "medium";
        
        // For designer queries, try to auto-assign if there's an available designer
        let assignedDesigner = null;
        if (recipient_type === "designer") {
            // Get available designers (you can customize this logic)
            const [designers] = await global.db.query(`
                SELECT Account_ID 
                FROM account 
                WHERE Role = 'designer' 
                LIMIT 1
            `);
            
            if (designers.length > 0) {
                assignedDesigner = designers[0].Account_ID;
            }
        }

        // Create new thread with recipient info in subject
        const [threadResult] = await global.db.query(`
            INSERT INTO design_query_threads 
            (customer_id, booking_id, subject, status, priority, assigned_to, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            customer_id, 
            booking_id, 
            subject, 
            initialStatus, 
            priority,
            assignedDesigner
        ]);

        const threadId = threadResult.insertId;

        // Insert first message
        await global.db.query(`
            INSERT INTO design_query_messages
            (thread_id, sender_id, message, is_designer, created_at)
            VALUES (?, ?, ?, 0, NOW())
        `, [threadId, customer_id, message]);

        // Emit real-time event to notify admin/designers
        if (global.io) {
            global.io.emit("thread_updated", { 
                thread_id: threadId,
                recipient_type: recipient_type,
                priority: priority
            });
            
            // Send specific notification based on recipient
            if (recipient_type === "designer") {
                global.io.emit("designer_new_query", {
                    thread_id: threadId,
                    customer_id: customer_id,
                    priority: "high"
                });
            } else {
                global.io.emit("admin_new_query", {
                    thread_id: threadId,
                    customer_id: customer_id
                });
            }
        }

        return res.status(201).json({
            status: "success",
            message: "Query created successfully",
            thread_id: threadId,
            recipient_type: recipient_type
        });

    } catch (err) {
        console.error("Create thread error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error: " + err.message
        });
    }
});

module.exports = router;
