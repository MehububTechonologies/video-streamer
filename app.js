require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
// At the top of app.js
const jwt = require('jsonwebtoken');



const app = express();

const PORT = process.env.PORT || 8080;

// Get the video directory from the environment variable
const MEDIA_DIR = process.env.MEDIA_DIR;

// --- CORS Configuration ---
// 2. Read the allowed origins from the .env file
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',') : [];

// ... after your other const declarations ...
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}

// Middleware function to protect routes
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).send('Access Denied: No token provided.');
  }

  try {
    // Verify the token and check if it's expired
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Optional: pass decoded info to the route
    next(); // Token is valid, proceed to the route handler
  } catch (err) {
    return res.status(403).send('Access Denied: Invalid token.');
  }
};

if (allowedOrigins.length === 0) {
    console.warn("WARNING: No CORS_ALLOWED_ORIGINS set. CORS will be disabled.");
}

const corsOptions = {
    origin: (origin, callback) => {
        // The 'origin' is the URL of the site making the request (e.g., http://localhost:3000)
        // We allow requests if the origin is in our list, or if it's not a browser request (origin is undefined)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true); // Allow the request
        } else {
            callback(new Error('Not allowed by CORS')); // Block the request
        }
    },
    optionsSuccessStatus: 200 // For legacy browser support
};
app.use(cors(corsOptions));


if (!MEDIA_DIR) {
    console.error('Error: MEDIA_DIR environment variable is not set.');
    process.exit(1);
}

// --- API Endpoints ---

app.get("/", (req, res) => {
    res.status(200).json({ message: "Server is running, and it's OK" })
})

// --- VIDEO Endpoints ---
// Endpoint 1: GET /videos
// Scans the designated video folder and returns a list of video filenames.
app.get('/videos', (req, res) => {
    const videosPath = path.join(MEDIA_DIR, 'videos');
    fs.readdir(videosPath, (err, files) => {
        if (err) {
            console.error(`Error reading video directory: ${err}`);
            return res.status(500).send('Error reading video directory.');
        }

        const videoFiles = files.filter(file => file.endsWith('.mp4'));
        res.json(videoFiles);
    });
});

// Endpoint 2: GET /videos/{filename}
// Streams the content of the specified video file.
app.get('/videos/:filename', verifyToken, (req, res) => {
    const { filename } = req.params;
    const videoPath = path.join(MEDIA_DIR, "videos", filename);

    // Logging the request
    console.log(`Request received for video: ${filename}`);

    // Check if the file exists
    fs.stat(videoPath, (err, stats) => {
        if (err) {
            // If file does not exist, ENOENT is the error code
            if (err.code === 'ENOENT') {
                return res.status(404).send('File not found.');
            }
            // For other errors, send a 500
            return res.status(500).send(err.message);
        }

        const fileSize = stats.size;
        const range = req.headers.range;

        // Handle HTTP Range Requests
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, { start, end });

            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };

            res.writeHead(206, head); // 206 Partial Content
            file.pipe(res);
        } else {
            // Stream the entire file if no range is requested
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head); // 200 OK
            fs.createReadStream(videoPath).pipe(res);
        }
    });
})

// --- PDF Endpoints ---
// Endpoint 3: GET /pdfs
// Scans the designated media folder and returns a list of PDF filenames.
app.get('/pdfs', (req, res) => {
    const filePath = path.join(MEDIA_DIR, 'pdfs');
    fs.readdir(filePath, (err, files) => {
        if (err) {
            console.error(`Error reading media directory: ${err}`);
            return res.status(500).send('Error reading media directory.');
        }

        const pdfFiles = files.filter(file => file.endsWith('.pdf'));
        res.json(pdfFiles);
    });
});

// Endpoint 4: GET /pdfs/{filename}
// Streams the content of the specified PDF file.
app.get('/pdfs/:filename', verifyToken,  (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(MEDIA_DIR, 'pdfs', filename);

    console.log(`Request received for PDF: ${filename}`);

    fs.stat(filePath, (err, stats) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.status(404).send('File not found.');
            }
            return res.status(500).send(err.message);
        }

        const fileSize = stats.size;
        // The 'Content-Disposition' header suggests how the file should be displayed.
        // 'inline' suggests opening it in the browser. 'attachment' would suggest downloading.
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
    });

});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Video streaming server is running on port ${PORT}`);
    console.log(`Serving videos from directory: ${MEDIA_DIR}`);
    if (allowedOrigins.length > 0) {
        console.log(`CORS is enabled for the following origins: ${allowedOrigins.join(', ')}`);
    }
});
