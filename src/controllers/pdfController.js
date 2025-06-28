const fs = require('fs');
const path = require('path');
const MEDIA_DIR = process.env.MEDIA_DIR;

// Logic to list all PDF files
exports.listPdfs = (req, res) => {
    const pdfsPath = path.join(MEDIA_DIR, 'pdfs');
    fs.readdir(pdfsPath, (err, files) => {
        if (err) {
            console.error(`Error reading PDF directory: ${err}`);
            return res.status(500).send('Error reading PDF directory.');
        }
        const pdfFiles = files.filter(file => file.endsWith('.pdf'));
        res.json(pdfFiles);
    });
};

// Logic to serve a single PDF file
exports.servePdf = (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(MEDIA_DIR, 'pdfs', filename);
    console.log(`Request received for PDF: ${filename}`);

    fs.stat(filePath, (err, stats) => {
        if (err) {
            return err.code === 'ENOENT'
                ? res.status(404).send('File not found.')
                : res.status(500).send(err.message);
        }
        const head = {
            'Content-Length': stats.size,
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
    });
};