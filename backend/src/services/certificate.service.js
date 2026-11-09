const crypto = require('crypto');

/**
 * Calculates overall course progress across lessons and quizzes
 */
function calculateCourseProgress(userId, courseId, data) {
  const sectionIds = (data.course_sections || []).filter(s => s.course_id === courseId).map(s => s.id);
  const totalLessons = (data.lessons || []).filter(l => l.course_id === courseId || sectionIds.includes(l.section_id));
  const completedLessons = (data.lesson_progress || []).filter(
    p => p.user_id === userId && p.is_completed && totalLessons.some(tl => tl.id === p.lesson_id)
  );

  const courseQuizzes = (data.quizzes || []).filter(
    q => q.course_id === courseId && q.is_published !== false
  );
  const passedQuizzes = courseQuizzes.filter(q =>
    (data.quiz_attempts || []).some(a => a.quiz_id === q.id && a.user_id === userId && a.is_passed)
  );

  const totalItems = totalLessons.length + courseQuizzes.length;
  const completedItems = completedLessons.length + passedQuizzes.length;

  const progressPercentage = totalItems > 0
    ? Math.round((completedItems / totalItems) * 100)
    : 0;

  return {
    totalLessons: totalLessons.length,
    completedLessons: completedLessons.length,
    totalQuizzes: courseQuizzes.length,
    passedQuizzes: passedQuizzes.length,
    totalItems,
    completedItems,
    progressPercentage: Math.min(100, progressPercentage)
  };
}

/**
 * Checks if 100% progress has been attained, and automatically unlocks a verifiable certificate
 */
function checkAndUnlockCertificate(userId, courseId, data, currentUser = null) {
  if (!data) return { progress: 0, certificate: null, isNew: false };

  const stats = calculateCourseProgress(userId, courseId, data);
  const course = (data.courses || []).find(c => c.id === courseId);
  const student = (data.users || []).find(u => u.id === userId) || currentUser;

  let enrolment = (data.enrolments || []).find(
    e => e.course_id === courseId && e.user_id === userId
  );

  if (enrolment) {
    enrolment.progress_percentage = stats.progressPercentage;
  }

  let certificate = (data.certificates || []).find(
    c => c.course_id === courseId && c.user_id === userId
  );

  let isNew = false;

  if (stats.progressPercentage >= 100) {
    if (enrolment) {
      enrolment.status = 'completed';
      if (!enrolment.completed_at) {
        enrolment.completed_at = new Date().toISOString();
      }
    }

    if (!certificate) {
      if (!data.certificates) data.certificates = [];

      const orgId = enrolment ? enrolment.organization_id : (course ? course.organization_id : 'org-apex-01');
      const org = (data.organizations || []).find(o => o.id === orgId);
      const certNum = 'ZEN-' + new Date().getFullYear() + '-CERT-' + Math.floor(10000 + Math.random() * 90000);
      const secret = process.env.JWT_SECRET || 'zenora-lms-super-secret-jwt-key-2026-prod';

      const cryptoHash = crypto.createHmac('sha256', secret)
        .update(`${certNum}:${userId}:${courseId}:${orgId}`)
        .digest('hex');

      const verificationCode = `ZEN-VERIFY-${certNum.replace(/[^0-9]/g, '')}-${cryptoHash.substring(0, 8).toUpperCase()}`;

      certificate = {
        id: 'cert-' + Date.now() + Math.floor(Math.random() * 1000),
        certificate_number: certNum,
        verification_code: verificationCode,
        crypto_hash: cryptoHash,
        organization_id: orgId,
        user_id: userId,
        course_id: courseId,
        enrolment_id: enrolment ? enrolment.id : 'enr-' + Date.now(),
        issue_date: new Date().toISOString().split('T')[0],
        template_data: JSON.stringify({
          student_name: student ? student.name : 'Student',
          student_email: student ? student.email : null,
          course_title: course ? course.title : 'Course',
          institution_name: org ? org.name : 'Zenora Global',
          grade: 'Certified (100% Complete)',
          crypto_signature: cryptoHash,
          issued_at: new Date().toISOString()
        }),
        file_url: `https://zenora.education/certificates/${certNum}.pdf`,
        created_at: new Date().toISOString()
      };

      data.certificates.push(certificate);
      isNew = true;

      // Create notification
      if (!data.notifications) data.notifications = [];
      data.notifications.push({
        id: 'notif-' + Date.now() + Math.floor(Math.random() * 1000),
        user_id: userId,
        organization_id: orgId,
        title: 'Course Completed & Certificate Earned!',
        message: `Congratulations! You reached 100% completion in "${course ? course.title : 'the course'}". Your verifiable credential is now unlocked. Verification ID: ${verificationCode}`,
        type: 'certificate',
        action_url: `/certificates/verify/${verificationCode}`,
        is_read: false,
        email_sent: true,
        created_at: new Date().toISOString()
      });
    }
  }

  return {
    progress: stats.progressPercentage,
    stats,
    certificate,
    isNew
  };
}

module.exports = {
  calculateCourseProgress,
  checkAndUnlockCertificate
};
