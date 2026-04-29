'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  LogOut,
  BookOpen,
  CalendarPlus,
  PenLine,
  Trophy,
  Loader2,
  Clock,
  CheckCircle2,
  KeyRound,
  TrendingDown,
  AlertCircle,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { authAPI, teachersAPI, classesAPI, testsAPI, studentsAPI, marksAPI, resultsAPI } from '@/lib/api'
import { toast } from 'sonner'
import ChangePasswordDialog from './change-password-dialog'

interface TeacherSubject { id: string; subjectId: string; subjectName: string; classId: string; className: string }
interface ClassItem { id: string; name: string; subjects?: { id: string; name: string; classId: string }[] }
interface TestItem { id: string; name: string; date: string; maxMarks: number; status: string; subject: { id: string; name: string }; class: { id: string; name: string }; teacher: { id: string; name: string }; marksCount: number }
interface StudentItem { id: string; rollNo: string; user: { id: string; name: string; username: string }; class: { id: string; name: string } }

export default function TeacherDashboard() {
  const { user, setUser, setCurrentPage } = useAppStore()
  const [activeTab, setActiveTab] = useState('subjects')

  // Data states
  const [teacherData, setTeacherData] = useState<{ id: string; subjects: TeacherSubject[] } | null>(null)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [teacherTests, setTeacherTests] = useState<TestItem[]>([])

  // Schedule Test form
  const [scheduleForm, setScheduleForm] = useState({ classId: '', subjectId: '', name: '', date: '', maxMarks: '' })
  const [scheduling, setScheduling] = useState(false)

  // Enter Marks states
  const [marksClassId, setMarksClassId] = useState('')
  const [marksSubjectId, setMarksSubjectId] = useState('')
  const [marksTestId, setMarksTestId] = useState('')
  const [filteredTests, setFilteredTests] = useState<TestItem[]>([])
  const [studentsInClass, setStudentsInClass] = useState<StudentItem[]>([])
  const [marksEntries, setMarksEntries] = useState<Record<string, string>>({})
  const [selectedTestMaxMarks, setSelectedTestMaxMarks] = useState(0)
  const [savingMarks, setSavingMarks] = useState(false)
  const [loadingMarksData, setLoadingMarksData] = useState(false)

  // View Results
  const [resultClassId, setResultClassId] = useState('')
  const [classResults, setClassResults] = useState<{
    class: { id: string; name: string }
    subjects: { id: string; name: string }[]
    totalMaxMarks: number
    students: {
      studentId: string; rollNo: string; name: string; totalMarks: number; totalMaxMarks: number; percentage: number; rank: number; weakSubject: { subjectName: string; percentage: number } | null
    }[]
  } | null>(null)
  const [loadingResults, setLoadingResults] = useState(false)

  // Load teacher data
  useEffect(() => {
    loadTeacherData()
    loadClasses()
  }, [])

  const loadTeacherData = async () => {
    if (!user?.id) return
    try {
      // Get all teachers and find the one matching this user
      const data = await teachersAPI.getAll()
      const me = data.teachers.find((t: { userId: string }) => t.userId === user.id)
      if (me) {
        setTeacherData(me)
        // Load tests for this teacher
        const testData = await testsAPI.getAll({ teacherId: me.id })
        setTeacherTests(testData.tests)
      }
    } catch {
      toast.error('Failed to load teacher data')
    }
  }

  const loadClasses = async () => {
    try {
      const data = await classesAPI.getAll(true)
      setClasses(data.classes)
    } catch {
      toast.error('Failed to load classes')
    }
  }

  // Get subjects for the selected class (from teacher's assignments)
  const getSubjectsForClass = (classId: string) => {
    if (!teacherData) return []
    return teacherData.subjects.filter(s => s.classId === classId)
  }

  // Filter tests when subject/class changes for marks entry
  useEffect(() => {
    if (marksClassId && marksSubjectId) {
      const filtered = teacherTests.filter(t => t.class.id === marksClassId && t.subject.id === marksSubjectId)
      setFilteredTests(filtered)
    } else {
      setFilteredTests([])
    }
    setMarksTestId('')
    setStudentsInClass([])
    setMarksEntries({})
  }, [marksClassId, marksSubjectId, teacherTests])

  // Load students when test is selected for marks entry
  useEffect(() => {
    if (marksTestId) {
      loadStudentsForMarks()
    }
  }, [marksTestId])

  const loadStudentsForMarks = async () => {
    if (!marksTestId) return
    setLoadingMarksData(true)
    try {
      const test = teacherTests.find(t => t.id === marksTestId)
      if (test) {
        setSelectedTestMaxMarks(test.maxMarks)
        const data = await studentsAPI.getAll(test.class.id)
        setStudentsInClass(data.students)

        // Load existing marks for this test
        try {
          const marksData = await marksAPI.getByTest(marksTestId)
          const existing: Record<string, string> = {}
          for (const m of marksData.marks) {
            existing[m.student.id] = String(m.marks)
          }
          setMarksEntries(existing)
        } catch {
          setMarksEntries({})
        }
      }
    } catch {
      toast.error('Failed to load students')
    } finally {
      setLoadingMarksData(false)
    }
  }

  // Schedule test
  const handleScheduleTest = async () => {
    if (!scheduleForm.classId || !scheduleForm.subjectId || !scheduleForm.name || !scheduleForm.date || !scheduleForm.maxMarks) {
      toast.error('Please fill all fields')
      return
    }
    if (!teacherData) {
      toast.error('Teacher data not loaded')
      return
    }
    setScheduling(true)
    try {
      await testsAPI.create({
        name: scheduleForm.name,
        classId: scheduleForm.classId,
        subjectId: scheduleForm.subjectId,
        teacherId: teacherData.id,
        date: scheduleForm.date,
        maxMarks: parseInt(scheduleForm.maxMarks),
      })
      toast.success('Test scheduled successfully')
      setScheduleForm({ classId: '', subjectId: '', name: '', date: '', maxMarks: '' })
      loadTeacherData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule test')
    } finally {
      setScheduling(false)
    }
  }

  // Save marks
  const handleSaveMarks = async () => {
    if (!marksTestId) return
    const entries = Object.entries(marksEntries)
      .filter(([, val]) => val !== '')
      .map(([studentId, marks]) => ({ studentId, marks: parseFloat(marks) }))

    if (entries.length === 0) {
      toast.error('Please enter marks for at least one student')
      return
    }

    // Validate marks
    for (const entry of entries) {
      if (entry.marks < 0) {
        toast.error('Marks cannot be negative')
        return
      }
      if (entry.marks > selectedTestMaxMarks) {
        toast.error(`Marks cannot exceed ${selectedTestMaxMarks}`)
        return
      }
    }

    setSavingMarks(true)
    try {
      await marksAPI.create(marksTestId, entries)
      toast.success(`Marks saved for ${entries.length} students`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save marks')
    } finally {
      setSavingMarks(false)
    }
  }

  // Load class results
  const handleLoadResults = async (classId: string) => {
    if (!classId) return
    setResultClassId(classId)
    setLoadingResults(true)
    try {
      const data = await resultsAPI.getClassResults(classId)
      setClassResults(data)
    } catch {
      toast.error('Failed to load results')
    } finally {
      setLoadingResults(false)
    }
  }

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Upcoming': return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">{status}</Badge>
      case 'Today': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{status}</Badge>
      case 'Completed': return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">{status}</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  // Only show classes that the teacher is assigned to
  const teacherClassIds = teacherData ? [...new Set(teacherData.subjects.map(s => s.classId))] : []
  const teacherClasses = classes.filter(c => teacherClassIds.includes(c.id))

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            <h1 className="text-lg font-bold hidden sm:block">Sankalp Result Management</h1>
            <h1 className="text-lg font-bold sm:hidden">Sankalp</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm hidden sm:block">Welcome, {user?.name}</span>
            <ChangePasswordDialog userId={user?.id || ''}>
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                <KeyRound className="w-4 h-4" />
              </Button>
            </ChangePasswordDialog>
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto mb-4 -mx-4 px-4">
            <TabsList className="w-full flex h-auto gap-0 bg-white shadow-sm rounded-lg p-1">
              <TabsTrigger value="subjects" className="flex-1 min-w-0 data-[state=active]:bg-teal-600 data-[state=active]:text-white text-xs sm:text-sm">
                <BookOpen className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">My Subjects</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex-1 min-w-0 data-[state=active]:bg-teal-600 data-[state=active]:text-white text-xs sm:text-sm">
                <CalendarPlus className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Schedule Test</span>
              </TabsTrigger>
              <TabsTrigger value="marks" className="flex-1 min-w-0 data-[state=active]:bg-teal-600 data-[state=active]:text-white text-xs sm:text-sm">
                <PenLine className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Enter Marks</span>
              </TabsTrigger>
              <TabsTrigger value="results" className="flex-1 min-w-0 data-[state=active]:bg-teal-600 data-[state=active]:text-white text-xs sm:text-sm">
                <Trophy className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">View Results</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ===== MY SUBJECTS TAB ===== */}
          <TabsContent value="subjects">
            {teacherData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacherData.subjects.map(sub => (
                  <Card key={sub.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800">{sub.subjectName}</h3>
                          <p className="text-sm text-slate-500">{sub.className}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {teacherData.subjects.length === 0 && (
                  <p className="text-slate-400 text-center col-span-full py-12">No subjects assigned</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              </div>
            )}

            {/* Recent tests by this teacher */}
            <Card className="border-0 shadow-sm mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">My Tests</CardTitle>
              </CardHeader>
              <CardContent>
                {teacherTests.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No tests scheduled yet</p>
                ) : (
                  <div className="space-y-3">
                    {teacherTests.map(test => (
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
          </TabsContent>

          {/* ===== SCHEDULE TEST TAB ===== */}
          <TabsContent value="schedule">
            <Card className="border-0 shadow-sm max-w-lg mx-auto">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarPlus className="w-5 h-5 text-teal-600" />
                  Schedule a Test
                </CardTitle>
                <CardDescription>Create a new test for your assigned class-subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Class *</Label>
                    <Select value={scheduleForm.classId} onValueChange={(val) => setScheduleForm(f => ({ ...f, classId: val, subjectId: '' }))}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Choose class" />
                      </SelectTrigger>
                      <SelectContent>
                        {teacherClasses.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Subject *</Label>
                    <Select value={scheduleForm.subjectId} onValueChange={(val) => setScheduleForm(f => ({ ...f, subjectId: val }))}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Choose subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSubjectsForClass(scheduleForm.classId).map(s => (
                          <SelectItem key={s.subjectId} value={s.subjectId}>{s.subjectName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Test Name *</Label>
                    <Input
                      value={scheduleForm.name}
                      onChange={(e) => setScheduleForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g., Monthly Test 1"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={scheduleForm.date}
                      onChange={(e) => setScheduleForm(f => ({ ...f, date: e.target.value }))}
                      className="h-11"
                    />
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Min 2 days gap between tests for the same class
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Maximum Marks *</Label>
                    <Input
                      type="number"
                      value={scheduleForm.maxMarks}
                      onChange={(e) => setScheduleForm(f => ({ ...f, maxMarks: e.target.value }))}
                      placeholder="e.g., 100"
                      className="h-11"
                      min="1"
                    />
                  </div>

                  <Button
                    onClick={handleScheduleTest}
                    disabled={scheduling}
                    className="w-full h-11 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                  >
                    {scheduling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      'Schedule Test'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== ENTER MARKS TAB ===== */}
          <TabsContent value="marks">
            <Card className="border-0 shadow-sm mb-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PenLine className="w-5 h-5 text-teal-600" />
                  Enter Marks
                </CardTitle>
                <CardDescription>Select class, subject, and test to enter marks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={marksClassId} onValueChange={setMarksClassId}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {teacherClasses.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select value={marksSubjectId} onValueChange={setMarksSubjectId}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSubjectsForClass(marksClassId).map(s => (
                          <SelectItem key={s.subjectId} value={s.subjectId}>{s.subjectName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Test</Label>
                    <Select value={marksTestId} onValueChange={setMarksTestId}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select test" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredTests.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name} ({t.date}) - {t.maxMarks} marks</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Marks Entry Table */}
            {marksTestId && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Student Marks</CardTitle>
                    <Badge variant="secondary" className="bg-teal-50 text-teal-700">
                      Max: {selectedTestMaxMarks}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingMarksData ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                    </div>
                  ) : studentsInClass.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No students in this class</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Roll No</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Marks (/{selectedTestMaxMarks})</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentsInClass.map(student => (
                              <TableRow key={student.id}>
                                <TableCell>{student.rollNo}</TableCell>
                                <TableCell className="font-medium">{student.user.name}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={selectedTestMaxMarks}
                                    value={marksEntries[student.id] || ''}
                                    onChange={(e) => setMarksEntries(prev => ({ ...prev, [student.id]: e.target.value }))}
                                    className="w-24 h-9"
                                    placeholder="0"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          onClick={handleSaveMarks}
                          disabled={savingMarks}
                          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                        >
                          {savingMarks ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save All Marks'
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== VIEW RESULTS TAB ===== */}
          <TabsContent value="results">
            <Card className="border-0 shadow-sm mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-teal-600" />
                  Class Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={resultClassId} onValueChange={handleLoadResults}>
                  <SelectTrigger className="w-full sm:w-[220px] h-10">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherClasses.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            ) : resultClassId ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12">
                  <p className="text-slate-400 text-center">No results available for this class</p>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-3 mt-auto">
        <p className="text-center text-xs text-slate-400">© 2024 Sankalp Result Management System</p>
      </footer>
    </div>
  )
}
