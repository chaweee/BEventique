const express = require("express");
const router = express.Router();

// ==========================================
// 1. GET DASHBOARD ANALYTICS
// ==========================================
router.get("/stats", async (req, res) => {
    try {
        // 1. Total Bookings
        const [bookingCount] = await global.db.query("SELECT COUNT(*) as count FROM bookings");
        
        // 2. Pending Bookings
        const [pendingCount] = await global.db.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'");
        
        // 3. Total Users
        const [userCount] = await global.db.query("SELECT COUNT(*) as count FROM account WHERE Role = 'customer'");

        // 4. Total Revenue (Sum of confirmed/completed bookings)
        const [revenue] = await global.db.query("SELECT SUM(total_amount) as total FROM bookings WHERE status IN ('confirmed', 'completed')");

        return res.json({
            status: "success",
            stats: {
                total_bookings: bookingCount[0].count,
                pending_bookings: pendingCount[0].count,
                total_users: userCount[0].count,
                revenue: revenue[0].total || 0
            }
        });

    } catch (err) {
        console.error("Admin stats error:", err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
});

// ==========================================
// 2. GET ALL PAYMENTS
// ==========================================
router.get("/payments", async (req, res) => {
    try {
        // Joining bookings and account to see who paid for what
        const sql = `
            SELECT 
                b.booking_id,
                b.event_date,
                b.total_amount,
                b.status as booking_status,
                CONCAT(a.FirstName, ' ', a.LastName) as client_name,
                p.Package_Name
            FROM bookings b
            JOIN account a ON b.client_id = a.Account_ID
            JOIN package p ON b.package_id = p.Package_ID
            ORDER BY b.event_date DESC
        `;
        const [rows] = await global.db.query(sql);
        
        return res.json({ status: "success", payments: rows });
    } catch (err) {
        console.error("Admin payments error:", err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
});

module.exports = router;
