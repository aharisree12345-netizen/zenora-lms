const db = require('../config/db');

/**
 * Validates tenant subscription limits (max_students, max_courses)
 */
async function getOrgSubscription(organizationId) {
  const data = db.getFallbackData();
  const sub = (data.organization_subscriptions || []).find(
    s => s.organization_id === organizationId && s.status === 'active'
  );

  const defaultPlan = (data.subscription_plans || []).find(p => p.id === 'plan-enterprise') || {
    id: 'plan-enterprise',
    name: 'Enterprise SaaS Pro',
    max_students: 5000,
    max_courses: 500
  };

  if (!sub) {
    return defaultPlan;
  }

  const plan = (data.subscription_plans || []).find(p => p.id === sub.plan_id);
  return plan || defaultPlan;
}

/**
 * Check if organization can create another course
 */
async function checkCourseQuota(organizationId) {
  const plan = await getOrgSubscription(organizationId);
  const data = db.getFallbackData();
  const currentCourses = (data.courses || []).filter(
    c => c.organization_id === organizationId && c.status !== 'archived'
  );

  if (currentCourses.length >= plan.max_courses) {
    return {
      allowed: false,
      current: currentCourses.length,
      max: plan.max_courses,
      planName: plan.name,
      message: `Subscription limit reached: Organization has reached the maximum limit of ${plan.max_courses} courses on the "${plan.name}" plan. Please upgrade your subscription tier.`
    };
  }

  return {
    allowed: true,
    current: currentCourses.length,
    max: plan.max_courses,
    planName: plan.name
  };
}

/**
 * Check if organization can add more students
 */
async function checkStudentQuota(organizationId, incomingCount = 1) {
  const plan = await getOrgSubscription(organizationId);
  const data = db.getFallbackData();
  const currentStudents = (data.users || []).filter(
    u => u.organization_id === organizationId && u.role === 'student' && u.status === 'active'
  );

  if (currentStudents.length + incomingCount > plan.max_students) {
    return {
      allowed: false,
      current: currentStudents.length,
      incoming: incomingCount,
      max: plan.max_students,
      planName: plan.name,
      message: `Subscription limit reached: Adding ${incomingCount} student(s) would exceed your organization limit of ${plan.max_students} students (Current active: ${currentStudents.length}) on the "${plan.name}" plan. Please upgrade your subscription tier.`
    };
  }

  return {
    allowed: true,
    current: currentStudents.length,
    incoming: incomingCount,
    max: plan.max_students,
    planName: plan.name
  };
}

module.exports = {
  getOrgSubscription,
  checkCourseQuota,
  checkStudentQuota
};
