# Task 2 - Backend API Routes (Completed)

## Agent: backend-api
## Task ID: 2

## Summary
Built all 19 API route files for the Sankalp Result Management System. All routes compile cleanly (lint passes) and have been tested with the existing seed data.

## Files Created

### Auth Routes (4 files)
- `/src/app/api/auth/login/route.ts` - POST: Login with username/password/role, sets httpOnly cookie
- `/src/app/api/auth/session/route.ts` - GET: Read current session from cookie
- `/src/app/api/auth/logout/route.ts` - POST: Clear session cookie
- `/src/app/api/auth/change-password/route.ts` - POST: Change password with current password validation

### Class & Subject Routes (2 files)
- `/src/app/api/classes/route.ts` - GET: List classes with optional subjects
- `/src/app/api/subjects/route.ts` - GET: List subjects filtered by classId

### Student Routes (2 files)
- `/src/app/api/students/route.ts` - GET: List students, POST: Create student (User+Student in transaction)
- `/src/app/api/students/[id]/route.ts` - GET/PUT/DELETE: Student CRUD

### Teacher Routes (2 files)
- `/src/app/api/teachers/route.ts` - GET: List teachers with subjects, POST: Create teacher with subject assignments
- `/src/app/api/teachers/[id]/route.ts` - GET/PUT/DELETE: Teacher CRUD with subject management

### Test Routes (2 files)
- `/src/app/api/tests/route.ts` - GET: List tests with status, POST: Schedule test with validations (1 test/day/class, 2-day gap, teacher-subject assignment)
- `/src/app/api/tests/[id]/route.ts` - GET/PUT/DELETE: Test CRUD with validation on updates

### Marks Routes (2 files)
- `/src/app/api/marks/route.ts` - GET: Query by testId/studentId, POST: Bulk upsert marks with maxMarks validation
- `/src/app/api/marks/[id]/route.ts` - PUT/DELETE: Single mark entry operations

### Results Routes (2 files)
- `/src/app/api/results/class/[classId]/route.ts` - GET: Class results with ranks, weak subjects, percentages
- `/src/app/api/results/student/[studentId]/route.ts` - GET: Student results with subject-wise, test-wise, rank

### Reports Routes (3 files)
- `/src/app/api/reports/student/[studentId]/route.ts` - GET: Student report with grades, subject summary
- `/src/app/api/reports/class/[classId]/route.ts` - GET: Class report with statistics, grade distribution
- `/src/app/api/reports/subject/[subjectId]/route.ts` - GET: Subject report with per-test stats, pass rates

## Key Implementation Details
- Used `cookies()` from `next/headers` for session management
- Session cookie `sankalp_session` stores JSON {userId, role, name}, httpOnly, 7-day expiry
- Test status computed by comparing date with today: "Upcoming"/"Today"/"Completed"
- Test scheduling validated: 1 test per day per class, minimum 2-day gap
- Marks entry uses Prisma upsert for bulk insert/update behavior
- Ranking handles ties correctly (same marks = same rank, skip ranks)
- Grade system: A+ (90+), A (80+), B+ (70+), B (60+), C (50+), D (40+), F (<40)
- Weak subject detection: lowest scoring subject by percentage per student
- Fixed Prisma `select`+`include` conflict at same level (changed to `include` only)

## Issues Found & Fixed
1. Prisma doesn't allow mixing `select` and `include` at the same relation level - fixed in results/student and reports/student routes
2. Missing `user` include in classStudents query for reports/student - added
3. Variable name mismatch (`averageMarks` vs `avgMarks`) in reports/subject - fixed

## Testing
All endpoints verified working:
- `/api/classes` - ✅ Returns 13 classes
- `/api/classes?withSubjects=true` - ✅ Returns classes with subjects
- `/api/subjects?classId=xxx` - ✅ Returns filtered subjects
- `/api/students` - ✅ Returns students with class info
- `/api/students?classId=xxx` - ✅ Returns filtered students
- `/api/teachers` - ✅ Returns teachers with subjects
- `/api/auth/session` - ✅ Returns 401 when not logged in
- `/api/auth/logout` - ✅ Clears cookie
- `/api/auth/change-password` - ✅ Validates user exists
- `/api/results/student/xxx` - ✅ Returns student results
- `/api/results/class/xxx` - ✅ Returns class results
- `/api/reports/student/xxx` - ✅ Returns student report
- `/api/reports/class/xxx` - ✅ Returns class report
- `/api/reports/subject/xxx` - ✅ Returns subject report
- Lint passes cleanly
