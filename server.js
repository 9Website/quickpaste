const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests from this IP, please try again later.' }
});

app.use(limiter);
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const pasteRoutes = require('./routes/pastes');
app.use('/api', pasteRoutes);

app.get('/p/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'paste.html'));
});

app.get('/delete/:token', (req, res) => {
    // Basic route to handle deletion page interaction
    res.sendFile(path.join(__dirname, 'public', 'error.html'));
});

app.listen(PORT, () => {
    console.log(`QuickPaste server running on port ${PORT}`);
});
