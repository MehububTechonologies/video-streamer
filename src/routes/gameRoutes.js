const express = require('express');
const path = require('path');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { verifyToken } = require('../middleware/auth');

const MEDIA_DIR = process.env.MEDIA_DIR;

// --- Public route to list available games ---
// GET /games
router.get('/', gameController.listGames);

// --- Route to serve a specific game ---
// This uses express.static to serve all files from a game's directory.
// For example, a request to /games/box-jumper will serve the index.html from that folder.
// A request to /games/box-jumper/style.css will serve the css file.
const gamesBasePath = path.join(MEDIA_DIR, 'games');
router.use('/:gameName', (req, res, next) => {
    // This middleware dynamically sets up a static server for the requested game
    const gameName = req.params.gameName;
    const gamePath = path.join(gamesBasePath, gameName);
    
    // Use express.static for the specific game directory
    express.static(gamePath)(req, res, next);
});

// If you want to protect the games, you can add the middleware like this.
// Note that express.static needs to be configured carefully with middleware.
/*
const gamesBasePath = path.join(MEDIA_DIR, 'games');
router.use('/:gameName', verifyToken, (req, res, next) => {
    const gameName = req.params.gameName;
    const gamePath = path.join(gamesBasePath, gameName);
    express.static(gamePath)(req, res, next);
});
*/


module.exports = router;