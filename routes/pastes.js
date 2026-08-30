const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const sanitizeHtml = require('sanitize-html');
const { marked } = require('marked');
const db = require('../database/db');

// Helper for generating secure IDs
function generateId(length = 6) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

// Create Paste API
router.post('/pastes', async (req, res) => {
    try {
        let { content, language, expiration, customId, password, burnAfterReading, isMarkdown } = req.body;
        
        if (!content || typeof content !== 'string' || content.trim() === '') {
            return res.status(400).json({ error: 'Content cannot be empty' });
        }
        if (content.length > 500000) {
            return res.status(400).json({ error: 'Paste exceeds maximum size limit (500KB)' });
        }

        let id = customId ? customId.trim() : generateId(7);
        if (customId) {
            if (!/^[a-zA-Z0-9\-_]{3,40}$/.test(customId)) {
                return res.status(400).json({ error: 'Invalid custom ID format. Must be 3-40 alphanumeric characters, hyphens, or underscores.' });
            }
        }

        // Calculate Expiration
        let expiresAt = null;
        const now = Date.now();
        if (expiration) {
            const expMap = {
                '5m': 5 * 60 * 1000,
                '10m': 10 * 60 * 1000,
                '1h': 60 * 60 * 1000,
                '1d': 24 * 60 * 60 * 1000,
                '1w': 7 * 24 * 60 * 60 * 1000,
                '1mo': 30 * 24 * 60 * 60 * 1000
            };
            if (expMap[expiration]) {
                expiresAt = now + expMap[expiration];
            }
        }

        let passwordHash = null;
        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        }

        const deletionToken = crypto.randomBytes(16).toString('hex');
        const burnFlag = burnAfterReading ? 1 : 0;
        const markdownFlag = isMarkdown ? 1 : 0;

        db.run(
            `INSERT INTO pastes (id, content, language, created_at, expires_at, password_hash, burn_after_reading, deletion_token, is_markdown) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, content, language || 'plaintext', now, expiresAt, passwordHash, burnFlag, deletionToken, markdownFlag],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ error: 'Custom ID is already taken.' });
                    }
                    return res.status(500).json({ error: 'Database error occurred.' });
                }
                res.status(201).json({
                    id,
                    url: `/p/${id}`,
                    rawUrl: `/p/${id}/raw`,
                    deleteUrl: `/delete/${deletionToken}`
                });
            }
        );
    } catch (e) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Paste Metadata / Content
router.post('/pastes/:id/verify', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    db.get(`SELECT * FROM pastes WHERE id = ?`, [id], async (err, paste) => {
        if (err || !paste) return res.status(404).json({ error: 'Paste not found' });
        
        if (paste.expires_at && paste.expires_at < Date.now()) {
            db.run(`DELETE FROM pastes WHERE id = ?`, [id]);
            return res.status(410).json({ error: 'Paste has expired' });
        }

        if (paste.password_hash) {
            const match = await bcrypt.compare(password || '', paste.password_hash);
            if (!match) return res.status(401).json({ error: 'Incorrect password' });
        }

        // Handle burn-after-reading verification step
        if (paste.burn_after_reading === 1) {
            db.run(`DELETE FROM pastes WHERE id = ?`, [id], () => {});
        } else {
            db.run(`UPDATE pastes SET views = views + 1 WHERE id = ?`, [id]);
        }

        let renderedContent = paste.content;
        if (paste.is_markdown) {
            renderedContent = sanitizeHtml(marked.parse(paste.content), {
                allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3']),
                allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, '*': ['class'] }
            });
        }

        res.json({
            content: paste.content,
            renderedContent,
            language: paste.language,
            createdAt: paste.created_at,
            expiresAt: paste.expires_at,
            views: paste.burn_after_reading === 1 ? paste.views + 1 : paste.views + 1,
            isMarkdown: paste.is_markdown,
            isBurn: paste.burn_after_reading === 1
        });
    });
});

router.get('/pastes/:id', (req, res) => {
    const { id } = req.params;
    db.get(`SELECT id, language, created_at, expires_at, views, password_hash, burn_after_reading, is_markdown FROM pastes WHERE id = ?`, [id], (err, paste) => {
        if (err || !paste) return res.status(404).json({ error: 'Paste not found' });
        if (paste.expires_at && paste.expires_at < Date.now()) {
            return res.status(410).json({ error: 'Paste expired' });
        }
        res.json({
            id: paste.id,
            language: paste.language,
            createdAt: paste.created_at,
            expiresAt: paste.expires_at,
            views: paste.views,
            hasPassword: !!paste.password_hash,
            isBurn: paste.burn_after_reading === 1,
            isMarkdown: paste.is_markdown
        });
    });
});

// Raw Endpoint
router.get('/pastes/:id/raw', (req, res) => {
    const { id } = req.params;
    db.get(`SELECT * FROM pastes WHERE id = ?`, [id], (err, paste) => {
        if (err || !paste) return res.status(404).send('Paste not found');
        if (paste.expires_at && paste.expires_at < Date.now()) {
            db.run(`DELETE FROM pastes WHERE id = ?`, [id]);
            return res.status(410).send('Paste expired');
        }
        if (paste.password_hash) {
            return res.status(401).send('Password protected paste cannot be viewed raw directly without authorization.');
        }
        if (paste.burn_after_reading === 1) {
            db.run(`DELETE FROM pastes WHERE id = ?`, [id]);
        } else {
            db.run(`UPDATE pastes SET views = views + 1 WHERE id = ?`, [id]);
        }
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(paste.content);
    });
});

// Delete via Token
router.delete('/delete/:token', (req, res) => {
    const { token } = req.params;
    db.run(`DELETE FROM pastes WHERE deletion_token = ?`, [token], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (this.changes === 0) return res.status(404).json({ error: 'Invalid deletion token or paste already deleted' });
        res.json({ success: true, message: 'Paste deleted permanently' });
    });
});

module.exports = router;
