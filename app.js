// --- Initial Configuration ---
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// --- Import Routes ---
const videoRoutes = require('./src/routes/videoRoutes');
const pdfRoutes = require('./src/routes/pdfRoutes');

// --- App & Environment Setup ---
const app = express();
const PORT = process.env.PORT || 8080;
const MEDIA_DIR = process.env.MEDIA_DIR;

if (!MEDIA_DIR) {
    console.error('Error: MEDIA_DIR environment variable is not set.');
    process.exit(1);
}

// --- CORS Middleware Configuration ---
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',') : [];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('This origin is not allowed by CORS'));
        }
    },
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// --- Route Definitions ---
app.get("/", (req, res) => {
    res.status(200).json({ message: "Media Streaming Server is running." });
});

// For any request to /videos, use the videoRoutes module
app.use('/videos', videoRoutes);

// For any request to /pdfs, use the pdfRoutes module
app.use('/pdfs', pdfRoutes);

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Serving media from directory: ${path.resolve(MEDIA_DIR)}`);
    if (allowedOrigins.length > 0) {
        console.log(`CORS is enabled for origins: ${allowedOrigins.join(', ')}`);
    } else {
        console.warn("WARNING: CORS is not configured for any specific origins.");
    }
});