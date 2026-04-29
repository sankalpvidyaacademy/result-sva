'use client'

import { Printer, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ===== Type Definitions =====
interface StudentReportData {
  student: {
    id: string
    name: string
    username: string
    rollNo: string
    class: { id: string; name: string }
  }
  academicSummary: {
    totalMarks: number
    totalMaxMarks: number
    percentage: number
    grade: string
    rank: number
    totalStudents: number
    testsCompleted: number
    weakSubject: { subjectId: string; subjectName: string; percentage: number } | null
  }
  subjectSummary: {
    subjectId: string
    subjectName: string
    testsTaken: number
    totalMarks: number
    totalMaxMarks: number
    percentage: number
    grade: string
  }[]
  testDetails: {
    testId: string
    testName: string
    date: string
    subject: { id: string; name: string }
    maxMarks: number
    marksObtained: number
    percentage: number
    grade: string
  }[]
  dateRange?: { from: string | null; to: string | null } | null
}

interface ClassReportData {
  class: { id: string; name: string }
  subjects: { id: string; name: string }[]
  tests: { id: string; name: string; date: string; maxMarks: number; subject: { id: string; name: string } }[]
  totalMaxMarks: number
  statistics: {
    totalStudents: number
    totalTests: number
    averagePercentage: number
    highestMarks: number
    lowestMarks: number
    gradeDistribution: Record<string, number>
  }
  subjectAverages: {
    subjectId: string
    subjectName: string
    totalTests: number
    maxMarks: number
    averageMarks: number
    averagePercentage: number
  }[]
  students: {
    studentId: string
    rollNo: string
    name: string
    totalMarks: number
    percentage: number
    rank: number
    subjectMarks?: Record<string, number>
  }[]
  dateRange?: { from: string | null; to: string | null } | null
}

interface SubjectReportData {
  subject: { id: string; name: string; class: { id: string; name: string } }
  totalTests: number
  totalMaxMarks: number
  statistics: {
    totalStudents: number
    averageMarks: number
    averagePercentage: number
    highestMarks: number
    lowestMarks: number
    gradeDistribution: Record<string, number>
  }
  testStatistics: {
    testId: string
    testName: string
    date: string
    maxMarks: number
    averageMarks: number
    highestMarks: number
    lowestMarks: number
    studentsAttempted: number
    passCount: number
    passPercentage: number
  }[]
  students: {
    studentId: string
    rollNo: string
    name: string
    totalMarks: number
    totalMaxMarks: number
    percentage: number
    rank: number
    testMarks: { testId: string; testName: string; date: string; marks: number; maxMarks: number }[]
  }[]
  dateRange?: { from: string | null; to: string | null } | null
}

interface DateRangeInfo {
  from: string | null
  to: string | null
}

interface ReportViewProps {
  type: 'student' | 'class' | 'subject'
  data: unknown
}

// ===== Helper Functions =====
function formatDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+': return '#059669'
    case 'A': return '#10b981'
    case 'B+': return '#0d9488'
    case 'B': return '#0891b2'
    case 'C': return '#d97706'
    case 'D': return '#ea580c'
    case 'F': return '#dc2626'
    default: return '#64748b'
  }
}

function getPercentageColor(pct: number): string {
  if (pct >= 80) return '#059669'
  if (pct >= 60) return '#0891b2'
  if (pct >= 40) return '#d97706'
  return '#dc2626'
}

// ===== Date Range Badge =====
function DateRangeBadge({ dateRange }: { dateRange?: DateRangeInfo | null }) {
  if (!dateRange || (!dateRange.from && !dateRange.to)) return null
  const from = dateRange.from ? new Date(dateRange.from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Start'
  const to = dateRange.to ? new Date(dateRange.to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Present'
  return (
    <div style={{
      background: '#f0fdfa',
      border: '1px solid #99f6e4',
      borderRadius: '6px',
      padding: '8px 14px',
      fontSize: '12px',
      color: '#0d9488',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    }}>
      <span style={{ fontWeight: 600 }}>Date Range:</span>
      <span>{from} — {to}</span>
    </div>
  )
}

// ===== Shared Header =====
function ReportHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
      color: 'white',
      padding: '24px 32px',
      borderRadius: '8px 8px 0 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
        }}>
          🎓
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '0.5px' }}>
            Sankalp Result Management System
          </h1>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.9, marginTop: '2px' }}>
            {subtitle}
          </p>
        </div>
      </div>
      <div style={{ textAlign: 'right', fontSize: '12px', opacity: 0.85 }}>
        <div>Generated: {formatDate()}</div>
        <div style={{ marginTop: '2px' }}>Academic Report</div>
      </div>
    </div>
  )
}

// ===== Shared Footer =====
function ReportFooter() {
  return (
    <div style={{
      borderTop: '1px solid #e2e8f0',
      padding: '12px 32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '11px',
      color: '#94a3b8',
    }}>
      <span>© 2024 Sankalp Result Management System</span>
      <span>Confidential — For internal use only</span>
    </div>
  )
}

// ===== Section Title =====
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: '14px',
      fontWeight: 700,
      color: '#0f172a',
      margin: '0 0 12px 0',
      paddingBottom: '6px',
      borderBottom: '2px solid #0d9488',
      display: 'inline-block',
    }}>
      {children}
    </h2>
  )
}

// ===== Student Report =====
function StudentReport({ data }: { data: StudentReportData }) {
  const { student, academicSummary, subjectSummary, testDetails, dateRange } = data

  return (
    <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <ReportHeader title="Student Report" subtitle={`Student Performance Report — ${student.name}`} />

      <div style={{ padding: '24px 32px' }}>
        <DateRangeBadge dateRange={dateRange} />
        {/* Student Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <InfoBox label="Student Name" value={student.name} />
          <InfoBox label="Roll Number" value={student.rollNo} />
          <InfoBox label="Class" value={student.class.name} />
          <InfoBox label="Rank" value={`#${academicSummary.rank} of ${academicSummary.totalStudents}`} highlight />
        </div>

        {/* Academic Summary */}
        <SectionTitle>Academic Summary</SectionTitle>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <StatCard label="Total Marks" value={`${academicSummary.totalMarks} / ${academicSummary.totalMaxMarks}`} />
          <StatCard label="Percentage" value={`${academicSummary.percentage}%`} color={getPercentageColor(academicSummary.percentage)} />
          <StatCard label="Grade" value={academicSummary.grade} color={getGradeColor(academicSummary.grade)} />
          <StatCard label="Tests Completed" value={String(academicSummary.testsCompleted)} />
          {academicSummary.weakSubject && (
            <StatCard label="Weak Subject" value={`${academicSummary.weakSubject.subjectName} (${academicSummary.weakSubject.percentage}%)`} color="#dc2626" />
          )}
        </div>

        {/* Subject-wise Summary */}
        <SectionTitle>Subject-wise Performance</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={thStyle}>Subject</th>
              <th style={thStyle}>Tests Taken</th>
              <th style={thStyle}>Marks Obtained</th>
              <th style={thStyle}>Max Marks</th>
              <th style={thStyle}>Percentage</th>
              <th style={thStyle}>Grade</th>
            </tr>
          </thead>
          <tbody>
            {subjectSummary.map((subject, idx) => (
              <tr key={subject.subjectId} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                <td style={tdStyle}>{subject.subjectName}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{subject.testsTaken}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{subject.totalMarks}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{subject.totalMaxMarks}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: getPercentageColor(subject.percentage) }}>
                  {subject.percentage}%
                </td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: getGradeColor(subject.grade) }}>
                  {subject.grade}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Detailed Test Marks */}
        {testDetails.length > 0 && (
          <>
            <SectionTitle>Detailed Test Marks</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={thStyle}>Test Name</th>
                  <th style={thStyle}>Subject</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Max Marks</th>
                  <th style={thStyle}>Marks Obtained</th>
                  <th style={thStyle}>Percentage</th>
                  <th style={thStyle}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {testDetails.map((test, idx) => (
                  <tr key={test.testId} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <td style={tdStyle}>{test.testName}</td>
                    <td style={tdStyle}>{test.subject.name}</td>
                    <td style={tdStyle}>{test.date}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{test.maxMarks}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{test.marksObtained}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: getPercentageColor(test.percentage) }}>{test.percentage}%</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: getGradeColor(test.grade) }}>{test.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <ReportFooter />
    </div>
  )
}

// ===== Class Report =====
function ClassReport({ data }: { data: ClassReportData }) {
  const { class: classInfo, subjects, statistics, subjectAverages, students, totalMaxMarks, dateRange } = data
  const gradeOrder = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F']

  return (
    <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <ReportHeader title="Class Report" subtitle={`Class Performance Report — ${classInfo.name}`} />

      <div style={{ padding: '24px 32px' }}>
        <DateRangeBadge dateRange={dateRange} />
        {/* Class Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <InfoBox label="Class" value={classInfo.name} />
          <InfoBox label="Total Students" value={String(statistics.totalStudents)} />
          <InfoBox label="Total Tests" value={String(statistics.totalTests)} />
          <InfoBox label="Total Max Marks" value={String(totalMaxMarks)} />
        </div>

        {/* Statistics */}
        <SectionTitle>Class Statistics</SectionTitle>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <StatCard label="Average Percentage" value={`${statistics.averagePercentage}%`} color={getPercentageColor(statistics.averagePercentage)} />
          <StatCard label="Highest Marks" value={`${statistics.highestMarks} / ${totalMaxMarks}`} color="#059669" />
          <StatCard label="Lowest Marks" value={`${statistics.lowestMarks} / ${totalMaxMarks}`} color="#dc2626" />
          <StatCard label="Subjects" value={String(subjects.length)} />
        </div>

        {/* Grade Distribution */}
        <SectionTitle>Grade Distribution</SectionTitle>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {gradeOrder.map((grade) => {
            const count = statistics.gradeDistribution[grade] || 0
            const total = statistics.totalStudents || 1
            const pct = Math.round((count / total) * 100)
            return (
              <div key={grade} style={{
                flex: '1 1 80px',
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '10px 12px',
                textAlign: 'center',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: getGradeColor(grade) }}>{grade}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '2px 0' }}>{count}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{pct}%</div>
              </div>
            )
          })}
        </div>

        {/* Subject Averages */}
        {subjectAverages.length > 0 && (
          <>
            <SectionTitle>Subject Averages</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={thStyle}>Subject</th>
                  <th style={thStyle}>Tests</th>
                  <th style={thStyle}>Max Marks</th>
                  <th style={thStyle}>Avg Marks</th>
                  <th style={thStyle}>Avg Percentage</th>
                </tr>
              </thead>
              <tbody>
                {subjectAverages.map((subject, idx) => (
                  <tr key={subject.subjectId} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <td style={tdStyle}>{subject.subjectName}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{subject.totalTests}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{subject.maxMarks}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{subject.averageMarks}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: getPercentageColor(subject.averagePercentage) }}>
                      {subject.averagePercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Student Rankings */}
        <SectionTitle>Student Rankings</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={thStyle}>Rank</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Roll No</th>
              <th style={thStyle}>Total Marks</th>
              <th style={thStyle}>Percentage</th>
              {subjects.map((sub) => (
                <th key={sub.id} style={thStyle}>{sub.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => (
              <tr key={student.studentId} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                  {student.rank <= 3 ? ['🥇', '🥈', '🥉'][student.rank - 1] : `#${student.rank}`}
                </td>
                <td style={{ ...tdStyle, fontWeight: 500 }}>{student.name}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{student.rollNo}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{student.totalMarks} / {totalMaxMarks}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: getPercentageColor(student.percentage) }}>
                  {student.percentage}%
                </td>
                {subjects.map((sub) => (
                  <td key={sub.id} style={{ ...tdStyle, textAlign: 'center' }}>
                    {student.subjectMarks?.[sub.id] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReportFooter />
    </div>
  )
}

// ===== Subject Report =====
function SubjectReport({ data }: { data: SubjectReportData }) {
  const { subject, totalTests, totalMaxMarks, statistics, testStatistics, students, dateRange } = data
  const gradeOrder = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F']

  return (
    <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <ReportHeader title="Subject Report" subtitle={`${subject.name} — ${subject.class.name}`} />

      <div style={{ padding: '24px 32px' }}>
        <DateRangeBadge dateRange={dateRange} />
        {/* Subject Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <InfoBox label="Subject" value={subject.name} />
          <InfoBox label="Class" value={subject.class.name} />
          <InfoBox label="Total Tests" value={String(totalTests)} />
          <InfoBox label="Total Max Marks" value={String(totalMaxMarks)} />
        </div>

        {/* Statistics */}
        <SectionTitle>Subject Statistics</SectionTitle>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <StatCard label="Total Students" value={String(statistics.totalStudents)} />
          <StatCard label="Average Marks" value={`${statistics.averageMarks} / ${totalMaxMarks}`} color={getPercentageColor(statistics.averagePercentage)} />
          <StatCard label="Average Percentage" value={`${statistics.averagePercentage}%`} color={getPercentageColor(statistics.averagePercentage)} />
          <StatCard label="Highest Marks" value={String(statistics.highestMarks)} color="#059669" />
          <StatCard label="Lowest Marks" value={String(statistics.lowestMarks)} color="#dc2626" />
        </div>

        {/* Grade Distribution */}
        <SectionTitle>Grade Distribution</SectionTitle>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {gradeOrder.map((grade) => {
            const count = statistics.gradeDistribution[grade] || 0
            const total = statistics.totalStudents || 1
            const pct = Math.round((count / total) * 100)
            return (
              <div key={grade} style={{
                flex: '1 1 80px',
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '10px 12px',
                textAlign: 'center',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: getGradeColor(grade) }}>{grade}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '2px 0' }}>{count}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{pct}%</div>
              </div>
            )
          })}
        </div>

        {/* Test-wise Statistics */}
        {testStatistics.length > 0 && (
          <>
            <SectionTitle>Test-wise Statistics</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={thStyle}>Test Name</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Max Marks</th>
                  <th style={thStyle}>Avg Marks</th>
                  <th style={thStyle}>Highest</th>
                  <th style={thStyle}>Lowest</th>
                  <th style={thStyle}>Attempted</th>
                  <th style={thStyle}>Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {testStatistics.map((test, idx) => (
                  <tr key={test.testId} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <td style={tdStyle}>{test.testName}</td>
                    <td style={tdStyle}>{test.date}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{test.maxMarks}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{test.averageMarks}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#059669' }}>{test.highestMarks}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#dc2626' }}>{test.lowestMarks}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{test.studentsAttempted}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: getPercentageColor(test.passPercentage) }}>
                      {test.passPercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Student Rankings */}
        <SectionTitle>Student Rankings</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={thStyle}>Rank</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Roll No</th>
              <th style={thStyle}>Total Marks</th>
              <th style={thStyle}>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => (
              <tr key={student.studentId} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                  {student.rank <= 3 ? ['🥇', '🥈', '🥉'][student.rank - 1] : `#${student.rank}`}
                </td>
                <td style={{ ...tdStyle, fontWeight: 500 }}>{student.name}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{student.rollNo}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{student.totalMarks} / {student.totalMaxMarks}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: getPercentageColor(student.percentage) }}>
                  {student.percentage}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReportFooter />
    </div>
  )
}

// ===== Reusable Micro-Components =====
function InfoBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? '#f0fdfa' : '#f8fafc',
      borderRadius: '8px',
      padding: '12px 16px',
      border: highlight ? '1px solid #99f6e4' : '1px solid #e2e8f0',
    }}>
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: highlight ? '#0d9488' : '#0f172a' }}>{value}</div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: '#f8fafc',
      borderRadius: '8px',
      padding: '14px 16px',
      textAlign: 'center',
      border: '1px solid #e2e8f0',
    }}>
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 800, color: color || '#0f172a' }}>{value}</div>
    </div>
  )
}

// ===== Table Style Constants =====
const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '2px solid #e2e8f0',
}

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #f1f5f9',
  color: '#334155',
}

// ===== Main ReportView Component =====
export default function ReportView({ type, data }: ReportViewProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div>
      {/* Print Button — hidden during print */}
      <div className="no-print flex items-center justify-end gap-2 mb-4">
        <Button
          onClick={handlePrint}
          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="border-teal-200 text-teal-700 hover:bg-teal-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Save as PDF
        </Button>
      </div>

      {/* Report Content — visible during print */}
      <div className="print-area" style={{
        maxWidth: '210mm',
        margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        {type === 'student' && <StudentReport data={data as StudentReportData} />}
        {type === 'class' && <ClassReport data={data as ClassReportData} />}
        {type === 'subject' && <SubjectReport data={data as SubjectReportData} />}
      </div>
    </div>
  )
}
