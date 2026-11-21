const crypto = require('node:crypto');
const db = require('../config/db');
const { sessionCookie } = require('../middleware/requireOwner');

const SESSION_HOURS = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash, encoded: `scrypt$${salt}$${hash}` };
}

function verifyPassword(password, encoded) {
  const [algorithm, salt, expected] = String(encoded).split('$');
  if (algorithm !== 'scrypt' || !salt || !expected) return false;
  const actual = Buffer.from(hashPassword(password, salt).hash, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

async function createSession(ownerId, response) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const sessionId = crypto.randomUUID();
  await db.query(
    `INSERT INTO owner_session (session_id, owner_id, token_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? HOUR))`,
    [sessionId, ownerId, tokenHash, SESSION_HOURS]
  );
  response.setHeader('Set-Cookie', sessionCookie(token, SESSION_HOURS * 60 * 60));
}

async function getAuthStatus(request, response) {
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS owner_count FROM owner_account');
    response.json({ success: true, setupRequired: Number(rows[0].owner_count) === 0 });
  } catch (error) {
    console.error('Auth status error:', error);
    response.status(500).json({ success: false, message: 'Unable to check owner access setup.' });
  }
}

function getCurrentOwner(request, response) {
  response.json({ success: true, data: request.owner });
}

async function initializeOwners(request, response) {
  const owners = request.body?.owners;
  if (!Array.isArray(owners) || owners.length !== 2) {
    return response.status(400).json({ success: false, message: 'Set up exactly two owner accounts.' });
  }

  const cleanOwners = owners.map((owner) => ({
    displayName: typeof owner.displayName === 'string' ? owner.displayName.trim() : '',
    email: typeof owner.email === 'string' ? owner.email.trim().toLowerCase() : '',
    password: typeof owner.password === 'string' ? owner.password : ''
  }));
  if (cleanOwners.some((owner) => !owner.displayName || owner.displayName.length > 120 || !EMAIL_PATTERN.test(owner.email) || owner.email.length > 190 || owner.password.length < 10)) {
    return response.status(400).json({ success: false, message: 'Each owner needs a name, valid email, and password with at least 10 characters.' });
  }
  if (cleanOwners[0].email === cleanOwners[1].email) {
    return response.status(400).json({ success: false, message: 'The two owner accounts must use different email addresses.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SELECT lock_id FROM owner_setup_lock WHERE lock_id = 1 FOR UPDATE');
    const [existing] = await connection.query('SELECT owner_id FROM owner_account LIMIT 1');
    if (existing.length) {
      await connection.rollback();
      return response.status(409).json({ success: false, message: 'Owner setup is already complete. Public sign-up is closed.' });
    }

    const ids = cleanOwners.map(() => crypto.randomUUID());
    for (let index = 0; index < cleanOwners.length; index += 1) {
      const owner = cleanOwners[index];
      await connection.query(
        'INSERT INTO owner_account (owner_id, display_name, email, password_hash) VALUES (?, ?, ?, ?)',
        [ids[index], owner.displayName, owner.email, hashPassword(owner.password).encoded]
      );
    }
    await connection.commit();
    await createSession(ids[0], response);
    response.status(201).json({ success: true, data: { owner_id: ids[0], display_name: cleanOwners[0].displayName, email: cleanOwners[0].email } });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({ success: false, message: 'That email is already assigned to an owner account.' });
    }
    console.error('Owner setup error:', error);
    response.status(500).json({ success: false, message: 'Unable to set up owner accounts.' });
  } finally {
    connection.release();
  }
}

async function signIn(request, response) {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';
  if (!EMAIL_PATTERN.test(email) || password.length === 0) {
    return response.status(400).json({ success: false, message: 'Enter a valid email address and password.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT owner_id, display_name, email, password_hash FROM owner_account WHERE email = ? LIMIT 1',
      [email]
    );
    const owner = rows[0];
    if (!owner || !verifyPassword(password, owner.password_hash)) {
      return response.status(401).json({ success: false, message: 'Email or password is incorrect.' });
    }
    await createSession(owner.owner_id, response);
    response.json({ success: true, data: { owner_id: owner.owner_id, display_name: owner.display_name, email: owner.email } });
  } catch (error) {
    console.error('Owner sign-in error:', error);
    response.status(500).json({ success: false, message: 'Unable to sign in right now.' });
  }
}

async function signOut(request, response) {
  try {
    await db.query('DELETE FROM owner_session WHERE token_hash = ?', [request.sessionTokenHash]);
    response.setHeader('Set-Cookie', sessionCookie('', 0));
    response.json({ success: true });
  } catch (error) {
    console.error('Owner sign-out error:', error);
    response.status(500).json({ success: false, message: 'Unable to sign out right now.' });
  }
}

function requestPasswordRecovery(request, response) {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim() : '';
  if (!EMAIL_PATTERN.test(email) || email.length > 190) {
    return response.status(400).json({ success: false, message: 'Enter a valid owner email address.' });
  }
  response.json({ success: true, message: 'If that email belongs to an owner account, recovery instructions will be arranged privately. No password was changed.' });
}

module.exports = {
  getAuthStatus,
  getCurrentOwner,
  initializeOwners,
  signIn,
  signOut,
  requestPasswordRecovery
};
