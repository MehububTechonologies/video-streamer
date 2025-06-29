const fs = require('fs');
const path = require('path');
const MEDIA_DIR = process.env.MEDIA_DIR;

// Logic to list all available games (which are directories)
exports.listGames = (req, res) => {
    const gamesPath = path.join(MEDIA_DIR, 'games');

    fs.readdir(gamesPath, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.error(`Error reading games directory: ${err}`);
            return res.status(500).send('Error reading games directory.');
        }

        const gameDirectories = files
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        res.json(gameDirectories);
    });
};