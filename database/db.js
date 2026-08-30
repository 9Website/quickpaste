const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.run(`CREATE TABLE IF NOT EXISTS pastes (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        language TEXT DEFAULT 'plaintext',
        created_at INTEGER NOT NULL,
        expires_at INTEGER,
        views INTEGER DEFAULT 0,
        password_hash TEXT,
        burn_after_reading INTEGER DEFAULT 0,
        deletion_token TEXT NOT NULL,
        is_markdown INTEGER DEFAULT 0
    )`);
}

// Background cleanup worker for expired pastes
setInterval(() => {
    const now = Date.now();
    db.run(`DELETE FROM pastes WHERE expires_at IS NOT NULL AND expires_at < ?`, [now], function(err) {
        if (err) console.error('Cleanup error:', err.message);
    });
}, 60 * 1000);

module.exports = db;
