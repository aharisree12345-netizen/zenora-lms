# ZENORA LMS – Enterprise Learning Management System

Zenora LMS is a production-grade, multi-tenant Software-as-a-Service (SaaS) Learning Management System engineered with a **MySQL Relational Database** backend and a cross-platform **React Native (Expo)** frontend supporting Web, iOS, and Android.

---

## 🌟 Key Capabilities & Features

### 1. Role-Based Access Control (RBAC) & Multi-Tenancy
- **Super Administrator:** Global platform management, tenant organization onboarding, platform usage metrics, global course categories, system audit logging.
- **Institution Administrator:** Organization profile, departments and batches, instructor assignments, student directory, CSV bulk import, institutional performance reports.
- **Instructor:** Course creation & editing, hierarchical curriculum building (Sections → Lessons → Materials), quiz and assignment creation, student submission evaluation and grading, course announcements.
- **Student:** Catalog discovery, self-enrolment, multimedia lesson player (Video, Text, Audio, PDF, Attachments), timed assessment examinations, assignment submissions with resubmissions, digital certificate verification, notifications.

### 2. Course & Curriculum Management
- Dynamic course statuses: `Draft`, `Published`, `Archived`.
- Hierarchical structure: **Course → Sections → Lessons → Learning Materials**.
- Supported learning media: Recorded video streams, Markdown text modules, Audio podcasts/lectures, PDF slide decks, and downloadable attachments.
- Interactive Lesson Player with navigation controls, previous/next stepper, progress indicator, and personal bookmark notes.

### 3. Examination & Assessment Engine
- Supports **5 Question Types**:
  1. Multiple-Choice Questions (MCQ)
  2. Multiple-Select Questions
  3. True / False
  4. Short-Answer Questions
  5. Descriptive / Essay Questions
- Server-side countdown timer enforcement.
- Automatic grading for objective questions and manual rubric grading for descriptive answers.
- Instant score publication with comprehensive explanation breakdown.

### 4. Assignment Workflow
- Instructions, rubric guidelines, reference files, due dates, late submission penalties.
- Student file upload & text executive summary submission.
- Instructor evaluation with marks award, constructive feedback, and resubmission requests.

### 5. Verifiable Digital Certifications
- Automatically issued upon 100% curriculum completion and passing assessments.
- Unique certificate identifier (e.g., `ZEN-2026-CERT-98421`).
- Public verification tool (`/api/certificates/verify/:code`) validating authentic credentials against the registry.

### 6. Analytics, Reports & CSV Export
- Enrolment velocity and completion comparison tables.
- Student cohort tracking with grade averages and progress bars.
- Instant CSV export for enrolment records and gradebooks.

---

## 🚀 Running the Platform Locally

### Prerequisites
- Node.js LTS (v20+ / v24+) & npm

### 1. Start Backend API Server
```bash
cd backend
npm install
npm run seed     # Seeds realistic demo data for all 4 roles
npm start        # Starts on http://localhost:5000
```
- Health Check: `http://localhost:5000/api/health`

### 2. Start Frontend (React Native Expo Web)
```bash
cd frontend
npm install
npx expo start --web --port 8081
```
Open **`http://localhost:8081`** in your browser.

---

## 🔑 Demo Role Credentials

The platform features a **One-Click Role Switcher** on the top navigation bar, allowing immediate switching between roles:

| Role | Email | Password | Organization |
| :--- | :--- | :--- | :--- |
| **Super Administrator** | `admin@zenora.com` | `Admin@123` | Zenora Global SaaS |
| **Institution Administrator** | `admin@apex.edu` | `Admin@123` | Apex Institute of Technology |
| **Instructor** | `instructor@apex.edu` | `Instructor@123` | Apex Institute of Technology |
| **Student** | `student@apex.edu` | `Student@123` | Apex Institute of Technology |

---

## 🗄️ Database Architecture (MySQL)

The relational schema covers all 25 tables in `backend/src/migrations/schema.sql`:
- `organizations`, `subscription_plans`, `organization_subscriptions`
- `users`, `departments`, `course_categories`
- `courses`, `course_sections`, `lessons`, `learning_materials`
- `enrolments`, `lesson_progress`
- `quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts`, `quiz_answers`
- `assignments`, `assignment_submissions`
- `certificates`, `notifications`, `announcements`, `discussions`, `audit_logs`

---

## 🧪 Automated End-to-End Tests
To execute the automated test suite covering all critical workflows:
```bash
cd backend
node tests/e2e.test.js
```
**Results:** `18 PASSED, 0 FAILED`
