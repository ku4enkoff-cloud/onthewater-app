const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

const generateToken = (payload) => {
    const expiresIn = process.env.JWT_EXPIRES_IN || '90d';
    return jwt.sign(payload, SECRET, { expiresIn });
};

const verifyToken = (token) => {
    return jwt.verify(token, SECRET);
};

module.exports = {
    generateToken,
    verifyToken,
};
