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
                a.Email as client_email,
                a.PhoneNumber as client_phone,
                p.Package_Name,
                p.Package_Amount as amount_due,
                b.amount_paid
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

/* ============================================================
   GET ALL DESIGNERS
   GET /api/admin/designers
   ============================================================ */
router.get("/designers", async (req, res) => {
    try {
        const sql = `
            SELECT 
                Account_ID,
                FirstName,
                LastName,
                Email,
                PhoneNumber
            FROM account
            WHERE Role = 'designer'
            ORDER BY FirstName, LastName ASC
        `;

        const [designers] = await global.db.query(sql);

        return res.json({
            status: "success",
            designers: designers
        });

    } catch (err) {
        console.error("Get designers error:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error: " + err.message
        });
    }
});

// Add payment to a booking and update payment status if fully paid
router.post('/payments/:bookingId/add', async (req, res) => {
  const bookingId = req.params.bookingId;
  const { amount, method = 'cash' } = req.body;

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ status: "error", message: "Invalid amount." });
  }

  try {
    // Get booking info
    const [bookings] = await global.db.query(
      "SELECT total_price, IFNULL(amount_paid,0) as amount_paid FROM bookings WHERE booking_id = ?",
      [bookingId]
    );
    if (!bookings.length) {
      return res.status(404).json({ status: "error", message: "Booking not found." });
    }
    const booking = bookings[0];
    const newPaid = Number(booking.amount_paid) + Number(amount);

    // Insert payment record (link to booking_id)
    await global.db.query(
      "INSERT INTO payment (booking_id, Amount, Date, Method, Status) VALUES (?, ?, NOW(), ?, ?)", 
      [bookingId, amount, method, newPaid >= booking.total_price ? 'completed' : 'partial']
    );

    // Update booking's amount_paid and payment_status
    await global.db.query(
      "UPDATE bookings SET amount_paid = ?, payment_status = ? WHERE booking_id = ?",
      [newPaid, newPaid >= booking.total_price ? 'fully_paid' : 'partial', bookingId]
    );

    return res.json({ status: "success", message: "Payment added successfully." });

  } catch (err) {
    console.error("Add payment error:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

module.exports = router;
