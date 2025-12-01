// routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

// ----------------------
// LOGIN (from login.php)
// ----------------------
router.post("/login", async (req, res) => {
    try {
        console.log("Login attempt:", req.body);
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Email and password required"
            });
        }

        // First get user by email only
        const [rows] = await global.db.query(
            "SELECT * FROM account WHERE Email = ? LIMIT 1",
            [email]
        );

        console.log("Login query result:", rows.length > 0 ? "User found" : "No user found");

        if (!rows.length) {
            return res.json({ status: "error", message: "Invalid credentials" });
        }

        const user = rows[0];
        console.log("User Hash field:", user.Hash ? "Has hash" : "No hash (NULL)");
        
        // Check if password matches using only the Hash column
        if (!user.Hash) {
            console.log("User has no hash - this user needs password reset or re-registration");
            return res.json({ status: "error", message: "Account needs password reset. Please contact support." });
        }
        
        console.log("Attempting password verification...");
        console.log("Hash format:", user.Hash.substring(0, 4));
        
        // Handle PHP's $2y$ format by converting to $2b$ for Node.js bcrypt compatibility
        let hashToVerify = user.Hash;
        if (user.Hash.startsWith('$2y$')) {
            hashToVerify = '$2b$' + user.Hash.substring(4);
            console.log("Converted PHP $2y$ hash to $2b$ for Node.js compatibility");
        }
        
        // Verify against hashed password in Hash column
        const passwordMatches = await bcrypt.compare(password, hashToVerify);
        console.log("Password matches:", passwordMatches);
        
        if (!passwordMatches) {
            return res.json({ status: "error", message: "Invalid credentials" });
        }

        // Map database fields to frontend expectations
        const userResponse = {
            id: user.Account_ID,
            email: user.Email,
            firstname: user.FirstName,
            lastname: user.LastName,
            role: user.Role,
            phone: user.PhoneNumber
        };

        return res.json({ 
            status: "success", 
            user: userResponse 
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
});

// ----------------------
// SIGNUP (from signup.php)
// ----------------------
router.post("/signup", async (req, res) => {
    try {
        const {
            Full_Name,
            email,
            password,
            phone
        } = req.body;

        if (!Full_Name || !email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Full_Name, email, and password required"
            });
        }

        // Parse Full_Name into parts
        const nameParts = Full_Name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts[nameParts.length - 1] || '';
        const middleInitial = nameParts.length > 2 ? nameParts[1].charAt(0) + '.' : '';

        // Hash password before storing
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // INSERT user with only hashed password in Hash column
        await global.db.query(
            "INSERT INTO account (FirstName, LastName, M_I, Email, Hash, PhoneNumber, Role) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [firstName, lastName, middleInitial, email, hashedPassword, phone || null, 'customer']
        );

        return res.json({ status: "success" });

    } catch (err) {
        console.error("Signup error:", err);
        return res.status(500).json({
            status: "error",
            message: "Signup failed"
        });
    }
});

// ----------------------
// TEMPORARY: Update hash for existing users
// ----------------------
router.post("/update-hash", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                status: "error",
                message: "Email and password required"
            });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Update the user's hash
        const [result] = await global.db.query(
            "UPDATE account SET Hash = ? WHERE Email = ?",
            [hashedPassword, email]
        );

        if (result.affectedRows === 0) {
            return res.json({ status: "error", message: "User not found" });
        }

        return res.json({ status: "success", message: "Password hash updated" });

    } catch (err) {
        console.error("Update hash error:", err);
        return res.status(500).json({
            status: "error",
            message: "Update failed"
        });
    }
});

module.exports = router;
