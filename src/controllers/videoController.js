const fs = require('fs');
const path = require('path');
const MEDIA_DIR = process.env.MEDIA_DIR;

// Logic to list all video files
exports.listVideos = (req, res) => {
    const videosPath = path.join(MEDIA_DIR, 'videos');
    fs.readdir(videosPath, (err, files) => {
        if (err) {
            console.error(`Error reading video directory: ${err}`);
            return res.status(500).send('Error reading video directory.');
        }
        const videoFiles = files.filter(file => file.endsWith('.mp4'));
        res.json(videoFiles);
    });
};

// Logic to stream a single video file
exports.streamVideo = (req, res) => {
    const { filename } = req.params;
    const videoPath = path.join(MEDIA_DIR, "videos", filename);
    console.log(`Request received for video: ${filename}`);

    fs.stat(videoPath, (err, stats) => {
        if (err) {
            return err.code === 'ENOENT'
                ? res.status(404).send('File not found.')
                : res.status(500).send(err.message);
        }

        const fileSize = stats.size;
        const range = req.headers.range;

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
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    });
};