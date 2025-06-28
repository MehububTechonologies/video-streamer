const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { verifyToken } = require('../middleware/auth');

// Public route to list videos
router.get('/', videoController.listVideos);

// Protected route to stream a specific video, please comment this code and 
// use the next route for security
router.get('/:filename', videoController.streamVideo);
// router.get('/:filename', verifyToken, videoController.streamVideo);

module.exports = router;