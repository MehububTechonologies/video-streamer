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

const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// --- Helper Functions ---

/**
 * Finds a file within a directory, searching subdirectories if necessary.
 * This is specifically to locate .ts files that might be in nested stream folders.
 * @param {string} rootDir The directory to start the search from.
 * @param {string} fileName The name of the file to find.
 * @returns {string|null} The full path to the file, or null if not found.
 */
async function findFile(rootDir, fileName) {
    try {
        const items = await readdir(rootDir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(rootDir, item.name);
            if (item.isDirectory()) {
                const foundPath = await findFile(fullPath, fileName);
                if (foundPath) {
                    return foundPath;
                }
            } else if (item.name === fileName) {
                return fullPath;
            }
        }
    } catch (error) {
        // Ignore errors like permission denied or directory not found
        if (error.code === 'ENOENT' || error.code === 'EACCES') {
            return null;
        }
        // For other errors, log them but don't crash
        console.error(`Error searching for file '${fileName}' in '${rootDir}':`, error);
    }
    return null;
}


// --- Route Handlers ---

// Logic to stream HLS segments (.m3u8 playlists and .ts files)
exports.streamVideo = async (req, res) => {
    const { activity, category } = req.params;
    const requestedPath = req.params[0]; // e.g., '1/master.m3u8' or '1/data0000.ts'

    const videoCategoryPath = path.join(MEDIA_DIR, "videos", activity, category);
    let filePath = path.join(videoCategoryPath, requestedPath);

    // --- Security Check ---
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(videoCategoryPath))) {
        return res.status(403).send('Forbidden: Access denied.');
    }

    const fileExtension = path.extname(requestedPath);
    let contentType;

    if (fileExtension === '.m3u8') {
        contentType = 'application/vnd.apple.mpegurl';
    } else if (fileExtension === '.ts') {
        contentType = 'video/mp2t';
    } else if (fileExtension === '.mp4') {
        contentType = 'video/mp4';
    }
    else {
        return res.status(400).send('Unsupported file type.');
    }

    try {
        // Check if the file exists at the expected path
        await stat(filePath);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // If the requested file is an m3u8 playlist, try to serve the mp4 instead.
            if (fileExtension === '.m3u8') {
                console.warn(`HLS playlist not found at: ${filePath}. Trying MP4 fallback.`);
                const mp4FileName = path.basename(requestedPath, '.m3u8') + '.mp4';
                const mp4Path = path.join(path.dirname(filePath), mp4FileName);

                try {
                    await stat(mp4Path);
                    console.log(`Found MP4 fallback at: ${mp4Path}`);
                    filePath = mp4Path;
                    contentType = 'video/mp4';
                } catch (mp4Error) {
                    console.error(`MP4 fallback not found at: ${mp4Path}`);
                    return res.status(404).send('File not found.');
                }
            } else if (fileExtension === '.ts') {
                // If a .ts file is not found, it's likely because the playlist has a bad path.
                // We'll try to find it within the video's main directory.
                console.warn(`File not found at direct path: ${filePath}. Searching for it...`);
                
                const videoRootDir = path.dirname(filePath); 
                const segmentName = path.basename(filePath);

                const foundPath = await findFile(videoRootDir, segmentName);
                if (foundPath) {
                    console.log(`Found segment at: ${foundPath}`);
                    filePath = foundPath;
                } else {
                    console.error(`HLS file not found after search: ${filePath}`);
                    return res.status(404).send('File not found.');
                }
            } else {
                // For other errors (e.g., permissions) or other file types
                console.error(`File not found: ${filePath}`);
                return res.status(404).send('File not found.');
            }
        } else {
            // For non-ENOENT errors
            console.error(`Error accessing file '${filePath}':`, error);
            return res.status(500).send('Internal server error.');
        }
    }

    // If we've made it here, we have a valid path to the file.
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
};
