const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { verifyToken } = require('../middleware/auth');

// Public route to list videos
router.get('/', videoController.listVideos);

// GET /videos/:activity -> Lists all categories for an activity (e.g., ["english", "math"])
router.get('/:activity', videoController.listCategories);

// GET /videos/:activity/:category -> Lists all .mp4 files in that category
router.get('/:activity/:category', videoController.listVideosByCategory);

// GET /videos/:activity/:category/:filename -> Streams a specific video file
// This is the main endpoint for playing a video.
// Add 'verifyToken' middleware here if you want to protect it.
router.get('/:activity/:category/:filename(*)', videoController.streamVideo);

// protected route:
// router.get('/:activity/:category/:filename', verifyToken, videoController.streamVideo);

module.exports = router;