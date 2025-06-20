const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;

// Get the video directory from the environment variable
const VIDEO_DIR = process.env.VIDEO_DIR;

if (!VIDEO_DIR) {
    console.error('Error: VIDEO_DIR environment variable is not set.');
    process.exit(1);
}

// --- API Endpoints ---

// Endpoint 1: GET /videos
// Scans the designated video folder and returns a list of video filenames.
app.get('/videos', (req, res) => {
    fs.readdir(VIDEO_DIR, (err, files) => {
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
app.get('/videos/:filename', (req, res) => {
    const { filename } = req.params;
    const videoPath = path.join(VIDEO_DIR, filename);

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
});

// --- Server Start ---

app.listen(PORT, () => {
    console.log(`Video streaming server is running on port ${PORT}`);
    console.log(`Serving videos from directory: ${VIDEO_DIR}`);
});