const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in the .env file.');
    process.exit(1);
}

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).send('Access Denied: No token provided.');
    }

    try {
        // Verify the token and check if it's expired
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Optional: pass decoded info to the next handler
        next(); // Token is valid, proceed!
    } catch (err) {
        return res.status(403).send('Access Denied: Invalid or expired token.');
    }
};

module.exports = { verifyToken };