const express = require("express");
const router = express.Router();

// POST /api/feedback/create
router.post("/create", async (req, res) => {
  try {
    // quick diagnostics + DB presence check
    console.log("Feedback create headers:", req.headers);
    if (!global.db || typeof global.db.query !== "function") {
      console.error("Database not initialized on global.db");
      return res.status(500).json({ status: "error", message: "Server database not initialized." });
    }

    const { Account_ID, feedback, rate } = req.body;

    // Validate Account_ID (allow numeric 0 if needed by app, but normally >0)
    if (Account_ID === undefined || Account_ID === null || Account_ID === "") {
      return res.status(400).json({ status: "error", message: "Account_ID is required." });
    }
    const accountIdInt = parseInt(Account_ID, 10);
    if (Number.isNaN(accountIdInt) || accountIdInt <= 0) {
      return res.status(400).json({ status: "error", message: "Account_ID must be a positive integer." });
    }

    // Validate feedback text
    if (feedback === undefined || feedback === null) {
      return res.status(400).json({ status: "error", message: "Feedback text is required." });
    }
    const feedbackText = String(feedback).trim();
    if (feedbackText.length === 0) {
      return res.status(400).json({ status: "error", message: "Feedback cannot be empty." });
    }
    const MAX_FEEDBACK_LENGTH = 2000;
    if (feedbackText.length > MAX_FEEDBACK_LENGTH) {
      return res.status(400).json({ status: "error", message: `Feedback too long (max ${MAX_FEEDBACK_LENGTH} characters).` });
    }

    // Validate rate
    const rateInt = parseInt(rate, 10);
    if (Number.isNaN(rateInt) || rateInt < 1 || rateInt > 5) {
      return res.status(400).json({ status: "error", message: "Invalid rating. Rate must be an integer between 1 and 5." });
    }

    const sql = `
      INSERT INTO feedback (Account_ID, feedback, rate)
      VALUES (?, ?, ?)
    `;
    const params = [accountIdInt, feedbackText, rateInt];

    const [result] = await global.db.query(sql, params);
    return res.status(201).json({ status: "success", feedback_ID: result.insertId });
  } catch (err) {
    console.error("Feedback insert error:", err);
    return res.status(500).json({ status: "error", message: "Server error saving feedback." });
  }
});

module.exports = router;
