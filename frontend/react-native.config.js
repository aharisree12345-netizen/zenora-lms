/**
 * React Native Configuration for Universal Targets
 * Registers Windows desktop platform alongside iOS, Android, and Web.
 */

module.exports = {
  project: {
    windows: {
      sourceDir: 'windows',
      solutionFile: 'zenora_lms_frontend.sln',
      project: {
        projectFile: 'zenora_lms_frontend/zenora_lms_frontend.vcxproj'
      }
    }
  }
};

