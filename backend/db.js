// db.js
const mysql = require("mysql2/promise");

const dbHosts = [
    { host: "localhost", db: "eventdb",    user: "root", pass: "" }
];

async function connectDB() {
    let lastError = null;

    for (const cfg of dbHosts) {
        try {
            const connection = await mysql.createConnection({
                host: cfg.host,
                user: cfg.user,
                password: cfg.pass,
                database: cfg.db,
                charset: "utf8mb4"
            });

            console.log(`✅ Connected to database: ${cfg.db}`);
            return connection;
        } catch (err) {
            lastError = err;
        }
    }

    console.error("❌ All database connection attempts failed.");

    return {
        error: true,
        detail: lastError ? lastError.message : "Unknown error"
    };
}

module.exports = connectDB;
