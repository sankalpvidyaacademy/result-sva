'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import AppSidebar from '@/components/app-sidebar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  GraduationCap,
  Users,
  BookOpen,
  ClipboardList,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  TrendingDown,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { authAPI, classesAPI, subjectsAPI, studentsAPI, teachersAPI, testsAPI, resultsAPI, reportsAPI } from '@/lib/api'
import { toast } from 'sonner'
import ReportView from './report-view'

// ===== Types =====
interface ClassItem { id: string; name: string; subjects?: { id: string; name: string; classId: string }[] }
interface StudentItem { id: string; rollNo: string; user: { id: string; name: string; username: string }; class: { id: string; name: string } }
interface TeacherItem { id: string; userId: string; user: { id: string; name: string; username: string }; subjects: { id: string; subjectId: string; subjectName: string; classId: string; className: string }[] }
interface TestItem { id: string; name: string; date: string; maxMarks: number; status: string; subject: { id: string; name: string }; class: { id: string; name: string }; teacher: { id: string; name: string }; marksCount: number }

// ===== Page Title Mapping =====
const PAGE_TITLES: Record<string, string> = {
  overview: 'Overview',
  students: 'Students',
  teachers: 'Teachers',
  tests: 'Tests',
  results: 'Results',
  reports: 'Reports',
}

export default function AdminDashboard() {
  const { user, setUser, setCurrentPage } = useAppStore()
  const [activeTab, setActiveTab] = useState('overview')

  // Data states
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [students, setStudents] = useState<StudentItem[]>([])
  const [teachers, setTeachers] = useState<TeacherItem[]>([])
  const [tests, setTests] = useState<TestItem[]>([])
  const [subjects, setSubjects] = useState<{ id: string; name: string; classId: string; class: { id: string; name: string } }[]>([])

  // Filter states
  const [studentClassFilter, setStudentClassFilter] = useState('all')
  const [testClassFilter, setTestClassFilter] = useState('all')

  // Loading states
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const [loadingTests, setLoadingTests] = useState(false)
  const [loadingResults, setLoadingResults] = useState(false)

  // Dialog states
  const [showStudentDialog, setShowStudentDialog] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null)
  const [showTeacherDialog, setShowTeacherDialog] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<TeacherItem | null>(null)

  // Results state
  const [selectedResultClass, setSelectedResultClass] = useState('')
  const [classResults, setClassResults] = useState<{
    class: { id: string; name: string }
    subjects: { id: string; name: string }[]
    tests: { id: string; name: string; date: string; maxMarks: number; subject: { id: string; name: string } }[]
    totalMaxMarks: number
    students: {
      studentId: string; rollNo: string; name: string; totalMarks: number; totalMaxMarks: number; percentage: number; rank: number; weakSubject: { subjectName: string; percentage: number } | null; subjectMarks: Record<string, { marks: number; maxMarks: number; testName: string }>
    }[]
  } | null>(null)

  // Report state
  const [reportType, setReportType] = useState('student')
  const [reportStudentId, setReportStudentId] = useState('')
  const [reportClassId, setReportClassId] = useState('')
  const [reportSubjectId, setReportSubjectId] = useState('')
  const [reportDateFrom, setReportDateFrom] = useState('')
  const [reportDateTo, setReportDateTo] = useState('')
  const [reportData, setReportData] = useState<unknown>(null)
  const [loadingReport, setLoadingReport] = useState(false)

  // Clear report data when report type changes to prevent type mismatch crashes
  const handleReportTypeChange = (newType: string) => {
    setReportType(newType)
    setReportData(null)
    setReportStudentId('')
    setReportClassId('')
    setReportSubjectId('')
  }

  // Form states for student dialog
  const [studentForm, setStudentForm] = useState({ username: '', password: '', name: '', classId: '', rollNo: '' })
  // Form states for teacher dialog
  const [teacherForm, setTeacherForm] = useState({ username: '', password: '', name: '', subjectAssignments: [{ classId: '', subjectId: '' }] })

  // Fetch classes on mount
  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const data = await classesAPI.getAll(true)
      setClasses(data.classes)
      // Also load all subjects for teacher assignment
      const allSubjects: { id: string; name: string; classId: string; class: { id: string; name: string } }[] = []
      for (const cls of data.classes) {
        if (cls.subjects) {
          for (const sub of cls.subjects) {
            allSubjects.push({ ...sub, class: { id: cls.id, name: cls.name } })
          }
        }
      }
      setSubjects(allSubjects)
    } catch {
      toast.error('Failed to load classes')
    }
  }

  // Load data based on tab
  useEffect(() => {
    if (activeTab === 'students' || activeTab === 'overview') loadStudents()
    if (activeTab === 'teachers' || activeTab === 'overview') loadTeachers()
    if (activeTab === 'tests' || activeTab === 'overview') loadTests()
  }, [activeTab, studentClassFilter, testClassFilter])

  const loadStudents = async () => {
    setLoadingStudents(true)
    try {
      const classFilter = studentClassFilter !== 'all' ? studentClassFilter : undefined
      const data = await studentsAPI.getAll(classFilter)
      setStudents(data.students)
    } catch {
      toast.error('Failed to load students')
    } finally {
      setLoadingStudents(false)
    }
  }

  const loadTeachers = async () => {
    setLoadingTeachers(true)
    try {
      const data = await teachersAPI.getAll()
      setTeachers(data.teachers)
    } catch {
      toast.error('Failed to load teachers')
    } finally {
      setLoadingTeachers(false)
    }
  }

  const loadTests = async () => {
    setLoadingTests(true)
    try {
      const filters: { classId?: string } = {}
      if (testClassFilter !== 'all') filters.classId = testClassFilter
      const data = await testsAPI.getAll(filters)
      setTests(data.tests)
    } catch {
      toast.error('Failed to load tests')
    } finally {
      setLoadingTests(false)
    }
  }

  const loadClassResults = useCallback(async (classId: string) => {
    if (!classId) return
    setLoadingResults(true)
    try {
      const data = await resultsAPI.getClassResults(classId)
      setClassResults(data)
    } catch {
      toast.error('Failed to load results')
    } finally {
      setLoadingResults(false)
    }
  }, [])

  // Logout
  const handleLogout = async () => {
    try {
      await authAPI.logout()
      setUser(null)
      setCurrentPage('login')
      toast.success('Logged out successfully')
    } catch {
      setUser(null)
      setCurrentPage('login')
    }
  }

  // ===== Student CRUD =====
  const openStudentDialog = (student?: StudentItem) => {
    if (student) {
      setEditingStudent(student)
      setStudentForm({ username: student.user.username, password: '', name: student.user.name, classId: student.class.id, rollNo: student.rollNo })
    } else {
      setEditingStudent(null)
      setStudentForm({ username: '', password: '', name: '', classId: '', rollNo: '' })
    }
    setShowStudentDialog(true)
  }

  const handleSaveStudent = async () => {
    if (!studentForm.name || !studentForm.classId || !studentForm.rollNo) {
      toast.error('Please fill all required fields')
      return
    }
    try {
      if (editingStudent) {
        await studentsAPI.update(editingStudent.id, { name: studentForm.name, classId: studentForm.classId, rollNo: studentForm.rollNo })
        toast.success('Student updated successfully')
      } else {
        if (!studentForm.username || !studentForm.password) {
          toast.error('Username and password are required for new students')
          return
        }
        await studentsAPI.create(studentForm)
        toast.success('Student created successfully')
      }
      setShowStudentDialog(false)
      loadStudents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save student')
    }
  }

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return
    try {
      await studentsAPI.delete(id)
      toast.success('Student deleted')
      loadStudents()
    } catch {
      toast.error('Failed to delete student')
    }
  }

  // ===== Teacher CRUD =====
  const openTeacherDialog = (teacher?: TeacherItem) => {
    if (teacher) {
      setEditingTeacher(teacher)
      setTeacherForm({
        username: teacher.user.username,
        password: '',
        name: teacher.user.name,
        subjectAssignments: teacher.subjects.length > 0
          ? teacher.subjects.map(s => ({ classId: s.classId, subjectId: s.subjectId }))
          : [{ classId: '', subjectId: '' }],
      })
    } else {
      setEditingTeacher(null)
      setTeacherForm({ username: '', password: '', name: '', subjectAssignments: [{ classId: '', subjectId: '' }] })
    }
    setShowTeacherDialog(true)
  }

  const handleSaveTeacher = async () => {
    if (!teacherForm.name) {
      toast.error('Name is required')
      return
    }
    const validAssignments = teacherForm.subjectAssignments.filter(a => a.classId && a.subjectId)
    if (!editingTeacher && (!teacherForm.username || !teacherForm.password)) {
      toast.error('Username and password are required for new teachers')
      return
    }
    if (validAssignments.length === 0) {
      toast.error('At least one subject assignment is required')
      return
    }
    try {
      if (editingTeacher) {
        await teachersAPI.update(editingTeacher.id, {
          name: teacherForm.name,
          subjects: validAssignments,
        })
        toast.success('Teacher updated successfully')
      } else {
        await teachersAPI.create({
          username: teacherForm.username,
          password: teacherForm.password,
          name: teacherForm.name,
          subjects: validAssignments,
        })
        toast.success('Teacher created successfully')
      }
      setShowTeacherDialog(false)
      loadTeachers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save teacher')
    }
  }

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return
    try {
      await teachersAPI.delete(id)
      toast.success('Teacher deleted')
      loadTeachers()
    } catch {
      toast.error('Failed to delete teacher')
    }
  }

  // ===== Report Generation =====
  const handleGenerateReport = async () => {
    setLoadingReport(true)
    setReportData(null)
    try {
      let data
      const dateParams: { fromDate?: string; toDate?: string } = {}
      if (reportDateFrom) dateParams.fromDate = reportDateFrom
      if (reportDateTo) dateParams.toDate = reportDateTo

      if (reportType === 'student' && reportStudentId) {
        data = await reportsAPI.getStudentReport(reportStudentId, dateParams)
      } else if (reportType === 'class' && reportClassId) {
        data = await reportsAPI.getClassReport(reportClassId, dateParams)
      } else if (reportType === 'subject' && reportSubjectId) {
        data = await reportsAPI.getSubjectReport(reportSubjectId, dateParams)
      } else {
        toast.error('Please select the required filters')
        setLoadingReport(false)
        return
      }
      setReportData(data.report)
      toast.success('Report generated')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setLoadingReport(false)
    }
  }

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Upcoming': return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">{status}</Badge>
      case 'Today': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{status}</Badge>
      case 'Completed': return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">{status}</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const filteredSubjects = (classId: string) => subjects.filter(s => s.classId === classId)

  return (
    <SidebarProvider>
      <AppSidebar
        role="ADMIN"
        activePage={activeTab}
        onNavigate={setActiveTab}
        userName={user?.name || ''}
        userId={user?.id || ''}
        onLogout={handleLogout}
      />
      <SidebarInset>
        {/* Top Header Bar */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-white px-4 sticky top-0 z-40">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-sm font-semibold text-slate-800">{PAGE_TITLES[activeTab] || 'Overview'}</h1>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <main className="flex-1 px-4 py-4 md:px-6">
            {/* ===== OVERVIEW PAGE ===== */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Students</p>
                        <p className="text-2xl font-bold text-teal-600">{students.length}</p>
                      </div>
                      <Users className="w-8 h-8 text-teal-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Teachers</p>
                        <p className="text-2xl font-bold text-emerald-600">{teachers.length}</p>
                      </div>
                      <BookOpen className="w-8 h-8 text-emerald-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Tests</p>
                        <p className="text-2xl font-bold text-amber-600">{tests.length}</p>
                      </div>
                      <ClipboardList className="w-8 h-8 text-amber-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Classes</p>
                        <p className="text-2xl font-bold text-rose-600">{classes.length}</p>
                      </div>
                      <GraduationCap className="w-8 h-8 text-rose-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'overview' && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Recent Tests</CardTitle>
                </CardHeader>
                <CardContent>
                  {tests.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No tests found</p>
                  ) : (
                    <div className="space-y-3">
                      {tests.slice(0, 5).map(test => (
                        <div key={test.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                          <div>
                            <p className="font-medium text-sm">{test.name}</p>
                            <p className="text-xs text-slate-500">{test.subject.name} • {test.class.name} • {test.date}</p>
                          </div>
                          {getStatusBadge(test.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ===== STUDENTS PAGE ===== */}
            {activeTab === 'students' && (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Select value={studentClassFilter} onValueChange={setStudentClassFilter}>
                      <SelectTrigger className="w-[180px] h-10">
                        <SelectValue placeholder="Filter by class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => openStudentDialog()} className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Student
                  </Button>
                </div>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    {loadingStudents ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                      </div>
                    ) : students.length === 0 ? (
                      <p className="text-slate-400 text-center py-12">No students found</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Roll No</TableHead>
                              <TableHead>Class</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {students.map(student => (
                              <TableRow key={student.id}>
                                <TableCell className="font-medium">{student.user.name}</TableCell>
                                <TableCell>{student.rollNo}</TableCell>
                                <TableCell>{student.class.name}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => openStudentDialog(student)}>
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => handleDeleteStudent(student.id)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ===== TEACHERS PAGE ===== */}
            {activeTab === 'teachers' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-800">Teachers</h2>
                  <Button onClick={() => openTeacherDialog()} className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Teacher
                  </Button>
                </div>

                {loadingTeachers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                  </div>
                ) : teachers.length === 0 ? (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="py-12">
                      <p className="text-slate-400 text-center">No teachers found</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teachers.map(teacher => (
                      <Card key={teacher.id} className="border-0 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-slate-800">{teacher.user.name}</h3>
                              <p className="text-xs text-slate-500">@{teacher.user.username}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openTeacherDialog(teacher)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => handleDeleteTeacher(teacher.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {teacher.subjects.map(sub => (
                              <div key={sub.id} className="flex items-center gap-2 text-sm text-slate-600">
                                <Badge variant="secondary" className="text-xs bg-teal-50 text-teal-700">
                                  {sub.className}
                                </Badge>
                                <span>{sub.subjectName}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ===== TESTS PAGE ===== */}
            {activeTab === 'tests' && (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <Select value={testClassFilter} onValueChange={setTestClassFilter}>
                    <SelectTrigger className="w-[180px] h-10">
                      <SelectValue placeholder="Filter by class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    {loadingTests ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                      </div>
                    ) : tests.length === 0 ? (
                      <p className="text-slate-400 text-center py-12">No tests found</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Subject</TableHead>
                              <TableHead>Class</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Max</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tests.map(test => (
                              <TableRow key={test.id}>
                                <TableCell className="font-medium">{test.name}</TableCell>
                                <TableCell>{test.subject.name}</TableCell>
                                <TableCell>{test.class.name}</TableCell>
                                <TableCell>{test.date}</TableCell>
                                <TableCell>{test.maxMarks}</TableCell>
                                <TableCell>{getStatusBadge(test.status)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ===== RESULTS PAGE ===== */}
            {activeTab === 'results' && (
              <>
                <Card className="border-0 shadow-sm mb-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Class Results</CardTitle>
                    <CardDescription>Select a class to view results</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Select value={selectedResultClass} onValueChange={(val) => { setSelectedResultClass(val); loadClassResults(val) }}>
                        <SelectTrigger className="w-[220px] h-10">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {loadingResults ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                  </div>
                ) : classResults && classResults.students.length > 0 ? (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Rank</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Roll No</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Percentage</TableHead>
                              <TableHead>Weak Subject</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classResults.students.map(student => (
                              <TableRow key={student.studentId}>
                                <TableCell className="font-bold">
                                  {student.rank <= 3 ? (
                                    <Badge className={student.rank === 1 ? 'bg-amber-100 text-amber-700' : student.rank === 2 ? 'bg-slate-100 text-slate-600' : 'bg-orange-100 text-orange-700'}>
                                      #{student.rank}
                                    </Badge>
                                  ) : `#${student.rank}`}
                                </TableCell>
                                <TableCell className="font-medium">{student.name}</TableCell>
                                <TableCell>{student.rollNo}</TableCell>
                                <TableCell>{student.totalMarks}/{student.totalMaxMarks}</TableCell>
                                <TableCell>
                                  <span className={student.percentage >= 60 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                                    {student.percentage}%
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {student.weakSubject ? (
                                    <div className="flex items-center gap-1">
                                      <TrendingDown className="w-3 h-3 text-rose-500" />
                                      <span className="text-rose-600 text-xs">{student.weakSubject.subjectName} ({student.weakSubject.percentage}%)</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs">N/A</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ) : selectedResultClass ? (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="py-12">
                      <p className="text-slate-400 text-center">No results available for this class</p>
                    </CardContent>
                  </Card>
                ) : null}
              </>
            )}

            {/* ===== REPORTS PAGE ===== */}
            {activeTab === 'reports' && (
              <>
                <Card className="border-0 shadow-sm mb-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Generate Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Report Type</Label>
                        <Select value={reportType} onValueChange={handleReportTypeChange}>
                          <SelectTrigger className="w-full sm:w-[220px] h-10 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student Report</SelectItem>
                            <SelectItem value="class">Class Report</SelectItem>
                            <SelectItem value="subject">Subject Report</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>From Date</Label>
                          <Input
                            type="date"
                            value={reportDateFrom}
                            onChange={(e) => setReportDateFrom(e.target.value)}
                            className="h-10 mt-1"
                          />
                        </div>
                        <div>
                          <Label>To Date</Label>
                          <Input
                            type="date"
                            value={reportDateTo}
                            onChange={(e) => setReportDateTo(e.target.value)}
                            className="h-10 mt-1"
                          />
                        </div>
                      </div>

                      {reportType === 'student' && (
                        <div>
                          <Label>Select Student</Label>
                          <Select value={reportStudentId} onValueChange={setReportStudentId}>
                            <SelectTrigger className="w-full sm:w-[280px] h-10 mt-1">
                              <SelectValue placeholder="Choose a student" />
                            </SelectTrigger>
                            <SelectContent>
                              {students.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.user.name} ({s.class.name})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {reportType === 'class' && (
                        <div>
                          <Label>Select Class</Label>
                          <Select value={reportClassId} onValueChange={setReportClassId}>
                            <SelectTrigger className="w-full sm:w-[220px] h-10 mt-1">
                              <SelectValue placeholder="Choose a class" />
                            </SelectTrigger>
                            <SelectContent>
                              {classes.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {reportType === 'subject' && (
                        <div>
                          <Label>Select Subject</Label>
                          <Select value={reportSubjectId} onValueChange={setReportSubjectId}>
                            <SelectTrigger className="w-full sm:w-[280px] h-10 mt-1">
                              <SelectValue placeholder="Choose a subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name} ({s.class.name})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Button onClick={handleGenerateReport} disabled={loadingReport} className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white">
                        {loadingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                        Generate Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Report Display */}
                {reportData && (
                  <ReportView type={reportType as 'student' | 'class' | 'subject'} data={reportData} />
                )}
              </>
            )}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-100 py-3 mt-auto">
            <p className="text-center text-xs text-slate-400">© 2024 Sankalp Result Management System</p>
          </footer>
        </div>

        {/* ===== STUDENT DIALOG ===== */}
        <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingStudent ? 'Edit Student' : 'Add Student'}</DialogTitle>
              <DialogDescription>
                {editingStudent ? 'Update student details' : 'Create a new student account'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!editingStudent && (
                <>
                  <div className="space-y-2">
                    <Label>Username *</Label>
                    <Input value={studentForm.username} onChange={(e) => setStudentForm(f => ({ ...f, username: e.target.value }))} required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input type="password" value={studentForm.password} onChange={(e) => setStudentForm(f => ({ ...f, password: e.target.value }))} required className="h-11" />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={studentForm.name} onChange={(e) => setStudentForm(f => ({ ...f, name: e.target.value }))} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Class *</Label>
                <Select value={studentForm.classId} onValueChange={(val) => setStudentForm(f => ({ ...f, classId: val }))}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Roll No *</Label>
                <Input value={studentForm.rollNo} onChange={(e) => setStudentForm(f => ({ ...f, rollNo: e.target.value }))} required className="h-11" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStudentDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveStudent} className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white">
                {editingStudent ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== TEACHER DIALOG ===== */}
        <Dialog open={showTeacherDialog} onOpenChange={setShowTeacherDialog}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTeacher ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle>
              <DialogDescription>
                {editingTeacher ? 'Update teacher details and subject assignments' : 'Create a new teacher account'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!editingTeacher && (
                <>
                  <div className="space-y-2">
                    <Label>Username *</Label>
                    <Input value={teacherForm.username} onChange={(e) => setTeacherForm(f => ({ ...f, username: e.target.value }))} required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input type="password" value={teacherForm.password} onChange={(e) => setTeacherForm(f => ({ ...f, password: e.target.value }))} required className="h-11" />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={teacherForm.name} onChange={(e) => setTeacherForm(f => ({ ...f, name: e.target.value }))} required className="h-11" />
              </div>

              {/* Subject Assignments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Subject Assignments *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setTeacherForm(f => ({ ...f, subjectAssignments: [...f.subjectAssignments, { classId: '', subjectId: '' }] }))}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
                {teacherForm.subjectAssignments.map((assignment, idx) => (
                  <div key={idx} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-slate-500">Class</Label>
                      <Select value={assignment.classId} onValueChange={(val) => {
                        const updated = [...teacherForm.subjectAssignments]
                        updated[idx] = { classId: val, subjectId: '' }
                        setTeacherForm(f => ({ ...f, subjectAssignments: updated }))
                      }}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-slate-500">Subject</Label>
                      <Select value={assignment.subjectId} onValueChange={(val) => {
                        const updated = [...teacherForm.subjectAssignments]
                        updated[idx] = { ...updated[idx], subjectId: val }
                        setTeacherForm(f => ({ ...f, subjectAssignments: updated }))
                      }}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredSubjects(assignment.classId).map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {teacherForm.subjectAssignments.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="text-rose-500 h-10" onClick={() => {
                        setTeacherForm(f => ({ ...f, subjectAssignments: f.subjectAssignments.filter((_, i) => i !== idx) }))
                      }}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTeacherDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveTeacher} className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white">
                {editingTeacher ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
