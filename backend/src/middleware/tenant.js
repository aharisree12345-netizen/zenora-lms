function enforceTenant(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  // Super administrators have platform-wide access
  if (req.user.role === 'super_admin') {
    req.tenantId = req.headers['x-organization-id'] || req.query.organization_id || req.user.organization_id;
    return next();
  }

  // All other roles are isolated strictly to their organization
  if (!req.user.organization_id) {
    return res.status(403).json({
      success: false,
      message: 'User is not assigned to any organization tenant.'
    });
  }

  req.tenantId = req.user.organization_id;
  next();
}

module.exports = {
  enforceTenant
};
