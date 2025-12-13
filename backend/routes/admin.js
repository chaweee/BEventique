const express = require("express");
const router = express.Router();

// ==========================================
// 1. GET DASHBOARD ANALYTICS
// ==========================================
router.get("/stats", async (req, res) => {
    try {
        // 1. Total Bookings
        const [bookingCount] = await global.db.query("SELECT COUNT(*) as count FROM bookings");
        
        // 2. Total Accounts
        const [accountCount] = await global.db.query("SELECT COUNT(*) as count FROM account");
        
        // 3. Total Customers
        const [customerCount] = await global.db.query("SELECT COUNT(*) as count FROM account WHERE Role = 'customer'");

        // 4. Total Revenue (Sum of confirmed/completed bookings)
        const [revenue] = await global.db.query("SELECT SUM(total_price) as total FROM bookings WHERE status IN ('confirmed', 'completed')");

        // 5. Booking Status Distribution
        const [statusDistribution] = await global.db.query("SELECT status, COUNT(*) as count FROM bookings GROUP BY status");

        return res.json({
            status: "success",
            stats: {
                total_bookings: bookingCount[0].count,
                total_accounts: accountCount[0].count,
                total_customers: customerCount[0].count,
                revenue: revenue[0].total || 0,
                status_distribution: statusDistribution
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
        // Joining bookings, account, and package to see payments with package amounts
        const sql = `
            SELECT 
                b.booking_id,
                b.event_date,
                b.total_price,
                b.payment_status,
                b.status as booking_status,
                CONCAT(a.Firstname, ' ', a.Lastname) as client_name,
                p.Package_Name,
                p.Package_Amount as amount_due
            FROM bookings b
            JOIN account a ON b.customer_id = a.Account_ID
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
