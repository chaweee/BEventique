const express = require("express");
const router = express.Router();

// ============================================================
// 1. CREATE A NEW BOOKING
// POST /api/bookings/create
// ============================================================
router.post("/create", async (req, res) => {
    try {
        const {
            customer_id,
            package_id,
            event_type,
            event_date,
            event_time,
            location,
            notes,
            custom_layout
        } = req.body;

        // Log the received data for debugging
        console.log("Booking Create Request - Received Data:");
        console.log("customer_id:", customer_id);
        console.log("package_id:", package_id);
        console.log("event_date:", event_date);
        console.log("location:", location);
        console.log("Full body:", req.body);

        // Basic Validation
        if (!customer_id || !package_id || !event_date || !location) {
            console.log("Validation failed:");
            console.log("customer_id:", !!customer_id, customer_id);
            console.log("package_id:", !!package_id, package_id);
            console.log("event_date:", !!event_date, event_date);
            console.log("location:", !!location, location);
            return res.status(400).json({
                status: "error",
                message: "Missing required fields (Customer, Package, Date, or Location)"
            });
        }

        // Optional: Check if date is already booked (prevent double booking)
        const [existing] = await global.db.query(
            "SELECT booking_id FROM bookings WHERE event_date = ? AND status IN ('pending', 'confirmed')",
            [event_date]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                status: "error",
                message: "Sorry, this date is already booked. Please choose another date."
            });
        }

        // Get Package Price to calculate total
        const [pkgRows] = await global.db.query("SELECT Package_Amount FROM package WHERE Package_ID = ?", [package_id]);
        const basePrice = pkgRows.length ? pkgRows[0].Package_Amount : 0;
        const totalPrice = basePrice; // Can be modified later for discounts, etc.
        
        // Insert Booking
        const sql = `
            INSERT INTO bookings 
            (customer_id, package_id, event_date, event_time, location, base_price, total_price, custom_layout, has_custom_layout, notes, status, payment_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid')
        `;

        const [result] = await global.db.query(sql, [
            customer_id,
            package_id,
            event_date,
            event_time,
            location,
            basePrice,
            totalPrice,
            custom_layout || null,
            custom_layout ? 1 : 0,
            notes || null
        ]);

        return res.json({
            status: "success",
            message: "Booking request submitted successfully!",
            booking_id: result.insertId
        });

    } catch (err) {
        console.error("❌ Create booking error:", err.message);
        console.error("Stack trace:", err.stack);
        return res.status(500).json({
            status: "error",
            message: "Server error creating booking: " + err.message
        });
    }
});

// ============================================================
// 2. GET ALL BOOKINGS (For Admin Dashboard)
// GET /api/bookings/all
// ============================================================
router.get("/all", async (req, res) => {
    try {
        const sql = `
            SELECT 
                b.*,
                CONCAT(a.FirstName, ' ', a.LastName) AS client_name,
                a.Email AS client_email,
                a.PhoneNumber AS client_phone,
                p.Package_Name
            FROM bookings b
            JOIN account a ON b.customer_id = a.Account_ID
            JOIN package p ON b.package_id = p.Package_ID
            ORDER BY b.event_date ASC
        `;

        const [rows] = await global.db.query(sql);

        return res.json({
            status: "success",
            bookings: rows
        });

    } catch (err) {
        console.error("Fetch all bookings error:", err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
});

// ============================================================
// 3. GET MY BOOKINGS (For Client Dashboard)
// GET /api/bookings/my-bookings/:customer_id
// ============================================================
router.get("/my-bookings/:customer_id", async (req, res) => {
    try {
        const { customer_id } = req.params;

        const sql = `
            SELECT 
                b.*,
                p.Package_Name,
                p.Description,
                p.Package_Amount
            FROM bookings b
            JOIN package p ON b.package_id = p.Package_ID
            WHERE b.customer_id = ?
            ORDER BY b.created_at DESC
        `;

        const [rows] = await global.db.query(sql, [customer_id]);

        return res.json({
            status: "success",
            bookings: rows
        });

    } catch (err) {
        console.error("Fetch user bookings error:", err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
});

// ============================================================
// 4. UPDATE BOOKING DETAILS (Edit)
// PUT /api/bookings/update/:id
// ============================================================
router.put("/update/:id", async (req, res) => {
    try {
        const booking_id = req.params.id;
        const {
            event_type,
            event_date,
            event_time,
            location,
            guest_count,
            notes
        } = req.body;

        // Check if booking exists
        const [existing] = await global.db.query("SELECT * FROM bookings WHERE booking_id = ?", [booking_id]);
        if (!existing.length) {
            return res.status(404).json({ status: "error", message: "Booking not found" });
        }

        // Logic: Prevent editing if status is already 'completed' or 'cancelled'
        if (['completed', 'cancelled'].includes(existing[0].status)) {
            return res.status(400).json({ 
                status: "error", 
                message: "Cannot edit a completed or cancelled booking." 
            });
        }

        const sql = `
            UPDATE bookings SET
                event_type = ?,
                event_date = ?,
                event_time = ?,
                location = ?,
                guest_count = ?,
                notes = ?
            WHERE booking_id = ?
        `;

        await global.db.query(sql, [
            event_type,
            event_date,
            event_time,
            location,
            guest_count,
            notes,
            booking_id
        ]);

        return res.json({
            status: "success",
            message: "Booking updated successfully"
        });

    } catch (err) {
        console.error("Update booking error:", err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
});

// ============================================================
// 5. CANCEL BOOKING (or Change Status)
// PATCH /api/bookings/status/:id
// ============================================================
router.patch("/status/:id", async (req, res) => {
    try {
        const booking_id = req.params.id;
        const { status } = req.body; // e.g., 'cancelled', 'confirmed'

        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ status: "error", message: "Invalid status" });
        }

        await global.db.query(
            "UPDATE bookings SET status = ? WHERE booking_id = ?",
            [status, booking_id]
        );

        return res.json({
            status: "success",
            message: `Booking marked as ${status}`
        });

    } catch (err) {
        console.error("Status update error:", err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
});

module.exports = router;
