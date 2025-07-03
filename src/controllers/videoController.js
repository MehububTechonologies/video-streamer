const fs = require('fs');
const path = require('path');
const MEDIA_DIR = process.env.MEDIA_DIR;
const VIDEOS_BASE_PATH = path.join(MEDIA_DIR, 'videos');

/**
 * Helper function to read directories and filter for subdirectories.
 * @param {string} directoryPath The path to read.
 * @param {function} callback The callback function (err, subdirectories).
 */
const getSubdirectories = (directoryPath, callback) => {
    fs.readdir(directoryPath, { withFileTypes: true }, (err, files) => {
        if (err) {
            // If the directory doesn't exist, return an empty array instead of an error.
            if (err.code === 'ENOENT') {
                return callback(null, []);
            }
            return callback(err);
        }

        const directories = files
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        callback(null, directories);
    });
};

// Logic to list all video files
exports.listVideos = (req, res) => {
    const videosPath = path.join(MEDIA_DIR, 'videos');
    fs.readdir(videosPath, (err, files) => {
        if (err) {
            console.error(`Error reading video directory: ${err}`);
            return res.status(500).send('Error reading video directory.');
        }
        const videoFiles = files.filter(file => file.endsWith('.mp4'));
        res.json(files);
    });
};

// Logic to list all top-level activity directories (e.g., 'school', 'songs')
exports.listActivities = (req, res) => {
    getSubdirectories(VIDEOS_BASE_PATH, (err, activities) => {
        if (err) {
            console.error(`Error reading base video directory: ${err}`);
            return res.status(500).send('Error reading video activities.');
        }
        res.json(activities);
    });
};

// Logic to list all category subdirectories for a given activity
exports.listCategories = (req, res) => {
    const { activity } = req.params;
    const activityPath = path.join(VIDEOS_BASE_PATH, activity);

    getSubdirectories(activityPath, (err, categories) => {
        if (err) {
            console.error(`Error reading activity directory '${activity}': ${err}`);
            return res.status(500).send('Error reading video categories.');
        }
        if (categories.length === 0 && !fs.existsSync(activityPath)) {
             return res.status(404).json({ message: `Activity '${activity}' not found.`});
        }
        res.json(categories);
    });
};

// Logic to list all video files within a specific activity and category
exports.listVideosByCategory = (req, res) => {
    const { activity, category } = req.params;
    const categoryPath = path.join(VIDEOS_BASE_PATH, activity, category);

    fs.readdir(categoryPath, (err, files) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.status(404).send('Activity or category not found.');
            }
            console.error(`Error reading video directory: ${err}`);
            return res.status(500).send('Error reading video directory.');
        }
        const videoFiles = files.filter(file => file.endsWith('.mp4'));
        res.json(videoFiles);
    });
};

// Logic to stream a single video file
exports.streamVideo = (req, res) => {
    const { activity, category, filename } = req.params;
    const videoPath = path.join(MEDIA_DIR, "videos", activity, category, filename);
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
