// server.js
const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const { createServer } = require("http");
const { Server } = require("socket.io");

const connectDB = require("./db");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
                return callback(null, true);
            }
            return callback(null, true);
        },
        credentials: true
    }
});

// Global error handlers to prevent crashes
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow any localhost or 127.0.0.1 with any port
        if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
            return callback(null, true);
        }
        
        // Allow the origin
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(fileUpload());

// Serve uploaded files
app.use("/uploads", express.static(__dirname + "/uploads"));

// Start server only after DB connection
(async () => {
    const db = await connectDB();

    if (db.error) {
        console.error("❌ Database connection failed:", db.detail);
        process.exit(1);
    }

    console.log("✅ Database connected");
    global.db = db;
    global.io = io;  // Add this line to make Socket.IO available globally

    // Database migration - Add canvas_layout column if it doesn't exist
    try {
        await db.query(`
            ALTER TABLE package ADD COLUMN canvas_layout TEXT NULL
        `);
        console.log("✅ Added canvas_layout column to package table");
    } catch (err) {
        // Column might already exist, that's okay
        if (err.code !== 'ER_DUP_FIELDNAME') {
            console.log("ℹ️ Canvas_layout column already exists or other error:", err.message);
        }
    }

    // Database migration - add design_revision_id to design_query_messages if missing
    try {
        await db.query(`
            ALTER TABLE design_query_messages ADD COLUMN design_revision_id INT NULL
        `);
        console.log("✅ Added design_revision_id column to design_query_messages");
    } catch (err) {
        // If column exists, ignore
        if (err && err.code !== 'ER_DUP_FIELDNAME' && err.message && !err.message.includes('Duplicate')) {
            console.log("ℹ️ design_revision_id column may already exist or other error:", err.message);
        }
    }

    // Test route
    app.get("/api/test", (req, res) => {
        res.json({ message: "API is working!", timestamp: new Date().toISOString() });
    });

    // Lightweight health/heartbeat route (for uptime & DB ping)
    app.get('/api/health', async (req, res) => {
        let dbStatus = 'down';
        try {
            await global.db.query('SELECT 1');
            dbStatus = 'up';
        } catch (e) {
            dbStatus = 'error';
        }
        const mem = process.memoryUsage();
        res.json({
            status: 'ok',
            db: dbStatus,
            uptime_seconds: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
            memory: {
                rss: mem.rss,
                heapTotal: mem.heapTotal,
                heapUsed: mem.heapUsed
            }
        });
    });

    // Debug route to check database structure
    app.get("/api/debug/package-structure", async (req, res) => {
        try {
            const [columns] = await db.query("SHOW COLUMNS FROM package");
            const [samples] = await db.query("SELECT * FROM package LIMIT 3");
            res.json({
                columns: columns,
                sampleData: samples
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Debug route to check photos
    app.get("/api/debug/photos", async (req, res) => {
        try {
            const [photos] = await db.query("SELECT * FROM package_photos ORDER BY Package_ID, Photo_ID");
            res.json({
                photos: photos,
                count: photos.length
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Debug route to check database
    app.get("/api/debug/users", async (req, res) => {
        try {
            const [tables] = await global.db.query("SHOW TABLES");
            const [accountSchema] = await global.db.query("DESCRIBE account");
            const [accounts] = await global.db.query("SELECT Account_ID, Email, FirstName, LastName, Role, Hash FROM account LIMIT 5");
            
            res.json({
                tables: tables.map(t => Object.values(t)[0]),
                accountSchema,
                accounts,
                message: "Database debug info"
            });
        } catch (err) {
            res.json({ error: err.message });
        }
    });

    // Create test user in account table
    app.get("/api/debug/create-test-user", async (req, res) => {
        try {
            // Insert test user
            await global.db.query(
                "INSERT IGNORE INTO account (FirstName, LastName, Email, Password, PhoneNumber, Role) VALUES (?, ?, ?, ?, ?, ?)",
                ["Test", "User", "test@example.com", "test123", "09123456789", "customer"]
            );

            res.json({ message: "Test user created successfully" });
        } catch (err) {
            res.json({ error: err.message });
        }
    });
    
    // Routes (after DB is ready)
    app.use("/api/admin", require("./routes/admin"));
    app.use("/api/auth", require("./routes/auth"));
    app.use("/api/bookings", require("./routes/bookings"));
    app.use("/api/design", require("./routes/design"));
    app.use("/api/packages", require("./routes/packages"));
    app.use("/api/queries", require("./routes/queries"));
    app.use("/api/upload", require("./routes/upload"));
    app.use("/api/feedback", require("./routes/feedback")); // <-- added feedback routes
    
    // Global Express error handler
    app.use((err, req, res, next) => {
        console.error('❌ Express Error:', err.message);
        console.error(err.stack);
        res.status(500).json({ 
            status: 'error', 
            message: 'Internal server error: ' + err.message 
        });
    });

    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})();
