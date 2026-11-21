const crypto = require('node:crypto');
const db = require('../config/db');

const COOKIE_NAME = 'simula_session';

function sessionCookie(token, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

function readCookie(request, name) {
  const cookieHeader = request.headers.cookie || '';
  const entry = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : '';
}

async function requireOwner(request, response, next) {
  try {
    const token = readCookie(request, COOKIE_NAME);
    if (!token) {
      return response.status(401).json({ success: false, message: 'Please sign in to continue.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await db.query(
      `SELECT owner_id, display_name, email
       FROM owner_session
       JOIN owner_account USING (owner_id)
       WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
      [tokenHash]
    );

    if (!rows.length) {
      response.setHeader('Set-Cookie', sessionCookie('', 0));
      return response.status(401).json({ success: false, message: 'Your session has expired. Please sign in again.' });
    }

    request.owner = rows[0];
    request.sessionTokenHash = tokenHash;
    return next();
  } catch (error) {
    console.error('Owner session lookup error:', error);
    return response.status(500).json({ success: false, message: 'Unable to verify your session.' });
  }
}

module.exports = { COOKIE_NAME, readCookie, requireOwner, sessionCookie };
