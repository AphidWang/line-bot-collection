const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { verifyIdToken } = require('../services/firebaseService');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('[AUTH] Missing Authorization header for', req.method, req.originalUrl);
      }
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    const secret = process.env.JWT_SECRET || process.env.SECRET_KEY || 'fallback-secret-key';
    let decoded;
    let usedStrategy = 'jwt';
    try {
      decoded = jwt.verify(token, secret);
    } catch (e) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('[AUTH] JWT verify failed:', e.message);
      }
      // Fallback: try Firebase ID token (RS256) to reduce friction if client still sends it
      try {
        const firebaseDecoded = await verifyIdToken(token);
        usedStrategy = 'firebase';
        decoded = { userId: undefined, firebaseUid: firebaseDecoded.uid };
      } catch (e2) {
        if (process.env.DEBUG_AUTH === 'true') {
          console.warn('[AUTH] Firebase verify failed:', e2.message);
        }
        throw e; // keep original error semantics
      }
    }
    
    // Get user from database
    const where = usedStrategy === 'jwt'
      ? { id: decoded.userId }
      : { firebaseUid: decoded.firebaseUid };
    const user = await prisma.user.findUnique({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        firebaseUid: true
      }
    });

    if (!user) {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('[AUTH] User not found for', usedStrategy === 'jwt' ? `userId: ${decoded.userId}` : `firebaseUid: ${decoded.firebaseUid}`);
      }
      return res.status(401).json({
        error: 'Access denied',
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('[AUTH] JsonWebTokenError:', error.message);
      }
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      if (process.env.DEBUG_AUTH === 'true') {
        console.warn('[AUTH] TokenExpiredError');
      }
      return res.status(401).json({
        error: 'Token expired',
        message: 'The provided token has expired'
      });
    }

    if (process.env.DEBUG_AUTH === 'true') {
      console.error('[AUTH] Unexpected auth error:', error);
    }
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Failed to authenticate token'
    });
  }
};

module.exports = { authenticateToken };
