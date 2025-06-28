const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const { verifyToken } = require('../middleware/auth');

// Public route to list PDFs
router.get('/', pdfController.listPdfs);

// Protected route to serve a specific PDF
router.get('/:filename', verifyToken, pdfController.servePdf);

module.exports = router;