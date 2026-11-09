const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'zenora-lms-super-secret-jwt-key-2026-prod';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization_id: user.organization_id,
      department_id: user.department_id
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired authentication token.'
    });
  }
}

// Optional authentication - populates req.user if valid token provided, but doesn't block if not
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // ignore
    }
  }
  next();
}

/**
 * Role-Based Access Control (RBAC) Middleware
 * Verifies that the authenticated user possesses one of the allowed roles.
 * Normalizes equivalent roles (e.g. 'faculty' <-> 'instructor', 'super_admin' <-> 'institution_admin' / 'admin').
 *
 * @param {string|string[]} allowedRoles - Array or single string of allowed role names
 */
function verifyRole(allowedRoles = []) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  const normalize = (r) => {
    if (!r) return '';
    const lower = String(r).toLowerCase().trim();
    if (lower === 'instructor') return 'faculty';
    if (lower === 'institution_admin' || lower === 'admin') return 'super_admin';
    return lower;
  };

  const normalizedAllowed = new Set(rolesArray.map(normalize));
  if (normalizedAllowed.has('faculty')) normalizedAllowed.add('instructor');
  if (normalizedAllowed.has('super_admin')) {
    normalizedAllowed.add('institution_admin');
    normalizedAllowed.add('admin');
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No user context found.'
      });
    }

    const userRole = req.user.role ? String(req.user.role).toLowerCase().trim() : '';
    const userRoleNorm = normalize(userRole);

    const isAuthorized = normalizedAllowed.has(userRole) || normalizedAllowed.has(userRoleNorm);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role "${req.user.role || 'user'}" does not have permission to perform this action.`
      });
    }

    next();
  };
}

const requireRoles = verifyRole;

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticateToken,
  optionalAuth,
  verifyRole,
  requireRoles
};
