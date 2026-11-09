function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const userRole = req.user.role;

    // Super admin has universal clearance across administrative and instructor operations
    if (userRole === 'super_admin') {
      return next();
    }

    // Expand role synonyms and hierarchy:
    // - 'faculty' and 'instructor' are equivalent teaching/staff roles
    // - 'institution_admin' and 'admin' are administrative roles
    const effectiveRoles = new Set(allowedRoles);
    if (allowedRoles.includes('instructor') || allowedRoles.includes('faculty')) {
      effectiveRoles.add('faculty');
      effectiveRoles.add('instructor');
    }
    if (allowedRoles.includes('admin') || allowedRoles.includes('institution_admin')) {
      effectiveRoles.add('institution_admin');
      effectiveRoles.add('admin');
      effectiveRoles.add('super_admin');
    }

    if (!effectiveRoles.has(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${userRole}' is not authorized to access this resource. Required: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

module.exports = {
  requireRoles
};
