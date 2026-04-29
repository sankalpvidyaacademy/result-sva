'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  GraduationCap,
  LogOut,
  ClipboardList,
  PenLine,
  Trophy,
  Loader2,
  Clock,
  CheckCircle2,
  CalendarDays,
  KeyRound,
  TrendingDown,
  Award,
  BarChart3,
  BookOpen,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { authAPI, studentsAPI, testsAPI, marksAPI, resultsAPI } from '@/lib/api'
import { toast } from 'sonner'
import ChangePasswordDialog from './change-password-dialog'

interface TestItem { id: string; name: string; date: string; maxMarks: number; status: string; subject: { id: string; name: string }; class: { id: string; name: string }; teacher: { id: string; name: string } }
interface MarkItem { id: string; marks: number; test: { id: string; name: string; date: string; maxMarks: number; subject: { id: string; name: string }; class: { id: string; name: string } } }

export default function StudentDashboard() {
  const { user, setUser, setCurrentPage } = useAppStore()
  const [activeTab, setActiveTab] = useState('tests')

  // Data states
  const [studentData, setStudentData] = useState<{ id: string; rollNo: string; class: { id: string; name: string } } | null>(null)
  const [tests, setTests] = useState<TestItem[]>([])
  const [marks, setMarks] = useState<MarkItem[]>([])
  const [studentResults, setStudentResults] = useState<{
    student: { id: string; name: string; rollNo: string; class: { id: string; name: string } }
    subjectWise: { subjectId: string; subjectName: string; tests: { testId: string; testName: string; date: string; marks: number; maxMarks: number }[]; totalMarks: number; totalMaxMarks: number; percentage: number }[]
    totalMarks: number
    totalMaxMarks: number
    percentage: number
    rank: number
    totalStudents: number
    weakSubject: { subjectId: string; subjectName: string; percentage: number } | null
  } | null>(null)

  const [loadingTests, setLoadingTests] = useState(false)
  const [loadingMarks, setLoadingMarks] = useState(false)
  const [loadingResults, setLoadingResults] = useState(false)

  // Load student data
  useEffect(() => {
    loadStudentData()
  }, [])

  const loadStudentData = async () => {
    if (!user?.id) return
    try {
      const data = await studentsAPI.getAll()
      const me = data.students.find((s: { user: { id: string } }) => s.user.id === user.id)
      if (me) {
        setStudentData({ id: me.id, rollNo: me.rollNo, class: me.class })
        loadTests(me.class.id)
        loadMarks(me.id)
        loadResults(me.id)
      }
    } catch {
      toast.error('Failed to load student data')
    }
  }

  const loadTests = async (classId: string) => {
    setLoadingTests(true)
    try {
      const data = await testsAPI.getAll({ classId })
      setTests(data.tests)
    } catch {
      toast.error('Failed to load tests')
    } finally {
      setLoadingTests(false)
    }
  }

  const loadMarks = async (studentId: string) => {
    setLoadingMarks(true)
    try {
      const data = await marksAPI.getByStudent(studentId)
      setMarks(data.marks)
    } catch {
      toast.error('Failed to load marks')
    } finally {
      setLoadingMarks(false)
    }
  }

  const loadResults = async (studentId: string) => {
    setLoadingResults(true)
    try {
      const data = await resultsAPI.getStudentResults(studentId)
      setStudentResults(data)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Upcoming': return <Clock className="w-4 h-4 text-sky-500" />
      case 'Today': return <CalendarDays className="w-4 h-4 text-emerald-500" />
      case 'Completed': return <CheckCircle2 className="w-4 h-4 text-slate-400" />
      default: return null
    }
  }

  // Categorize tests
  const upcomingTests = tests.filter(t => t.status === 'Upcoming')
  const todayTests = tests.filter(t => t.status === 'Today')
  const completedTests = tests.filter(t => t.status === 'Completed')

  // Group marks by subject
  const marksBySubject: Record<string, { subjectName: string; entries: { testName: string; marks: number; maxMarks: number; date: string }[] }> = {}
  for (const m of marks) {
    const subjectId = m.test.subject.id
    if (!marksBySubject[subjectId]) {
      marksBySubject[subjectId] = { subjectName: m.test.subject.name, entries: [] }
    }
    marksBySubject[subjectId].entries.push({
      testName: m.test.name,
      marks: m.marks,
      maxMarks: m.test.maxMarks,
      date: m.test.date,
    })
  }

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
            {studentData && (
              <Badge className="bg-white/20 text-white border-0 text-xs">
                {studentData.class.name} • Roll #{studentData.rollNo}
              </Badge>
            )}
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
              <TabsTrigger value="tests" className="flex-1 min-w-0 data-[state=active]:bg-teal-600 data-[state=active]:text-white text-xs sm:text-sm">
                <ClipboardList className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">My Tests</span>
              </TabsTrigger>
              <TabsTrigger value="marks" className="flex-1 min-w-0 data-[state=active]:bg-teal-600 data-[state=active]:text-white text-xs sm:text-sm">
                <PenLine className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">My Marks</span>
              </TabsTrigger>
              <TabsTrigger value="results" className="flex-1 min-w-0 data-[state=active]:bg-teal-600 data-[state=active]:text-white text-xs sm:text-sm">
                <Trophy className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">My Results</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ===== MY TESTS TAB ===== */}
          <TabsContent value="tests">
            {loadingTests ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Today's Tests */}
                {todayTests.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                      <CalendarDays className="w-5 h-5" />
                      Today&apos;s Tests
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {todayTests.map(test => (
                        <Card key={test.id} className="border-l-4 border-l-emerald-500 border-0 shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-slate-800">{test.name}</h3>
                                <p className="text-sm text-slate-500">{test.subject.name}</p>
                                <p className="text-xs text-slate-400 mt-1">Max Marks: {test.maxMarks}</p>
                              </div>
                              {getStatusBadge(test.status)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Tests */}
                {upcomingTests.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-sky-700 mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Upcoming Tests
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {upcomingTests.map(test => (
                        <Card key={test.id} className="border-l-4 border-l-sky-500 border-0 shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-slate-800">{test.name}</h3>
                                <p className="text-sm text-slate-500">{test.subject.name}</p>
                                <p className="text-xs text-slate-400 mt-1">Date: {test.date} • Max: {test.maxMarks}</p>
                              </div>
                              {getStatusIcon(test.status)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Tests */}
                {completedTests.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-slate-600 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      Completed Tests
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {completedTests.map(test => (
                        <Card key={test.id} className="border-l-4 border-l-slate-400 border-0 shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-slate-700">{test.name}</h3>
                                <p className="text-sm text-slate-500">{test.subject.name}</p>
                                <p className="text-xs text-slate-400 mt-1">Date: {test.date} • Max: {test.maxMarks}</p>
                              </div>
                              {getStatusIcon(test.status)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {tests.length === 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="py-12">
                      <p className="text-slate-400 text-center">No tests scheduled yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ===== MY MARKS TAB ===== */}
          <TabsContent value="marks">
            {loadingMarks ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              </div>
            ) : Object.keys(marksBySubject).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(marksBySubject).map(([subjectId, data]) => (
                  <Card key={subjectId} className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-teal-600" />
                        {data.subjectName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data.entries.map((entry, idx) => {
                          const pct = entry.maxMarks > 0 ? Math.round((entry.marks / entry.maxMarks) * 100) : 0
                          return (
                            <div key={idx} className="p-2 rounded-md bg-slate-50">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-slate-700">{entry.testName}</span>
                                <span className={`text-sm font-semibold ${pct >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {entry.marks}/{entry.maxMarks}
                                </span>
                              </div>
                              <Progress value={pct} className="h-1.5" />
                              <p className="text-xs text-slate-400 mt-1">{entry.date}</p>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12">
                  <p className="text-slate-400 text-center">No marks available yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== MY RESULTS TAB ===== */}
          <TabsContent value="results">
            {loadingResults ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              </div>
            ) : studentResults ? (
              <div className="space-y-4">
                {/* Overall Performance Card */}
                <Card className="border-0 shadow-sm bg-gradient-to-r from-teal-50 to-emerald-50">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <Award className="w-6 h-6 text-teal-600" />
                        </div>
                        <p className="text-2xl font-bold text-teal-700">#{studentResults.rank}</p>
                        <p className="text-xs text-slate-500">Rank (of {studentResults.totalStudents})</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <BarChart3 className="w-6 h-6 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-bold text-emerald-700">{studentResults.percentage}%</p>
                        <p className="text-xs text-slate-500">Overall</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-700">{studentResults.totalMarks}</p>
                        <p className="text-xs text-slate-500">Total Obtained</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-500">{studentResults.totalMaxMarks}</p>
                        <p className="text-xs text-slate-500">Total Maximum</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Weak Subject Alert */}
                {studentResults.weakSubject && (
                  <Card className="border-0 shadow-sm bg-rose-50 border-l-4 border-l-rose-400">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <TrendingDown className="w-5 h-5 text-rose-500 shrink-0" />
                        <div>
                          <p className="font-semibold text-rose-700 text-sm">Weak Subject</p>
                          <p className="text-rose-600 text-xs">{studentResults.weakSubject.subjectName} — {studentResults.weakSubject.percentage}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Subject-wise Breakdown */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Subject-wise Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {studentResults.subjectWise.map(subject => {
                        const isWeak = studentResults.weakSubject?.subjectId === subject.subjectId
                        return (
                          <div
                            key={subject.subjectId}
                            className={`p-4 rounded-lg border ${isWeak ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-sm text-slate-800">{subject.subjectName}</h4>
                              {isWeak && (
                                <Badge className="bg-rose-100 text-rose-700 text-xs">Weak</Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-slate-500">
                                {subject.totalMarks}/{subject.totalMaxMarks}
                              </span>
                              <span className={`text-sm font-semibold ${subject.percentage >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {subject.percentage}%
                              </span>
                            </div>
                            <Progress value={subject.percentage} className="h-2" />

                            {/* Individual test marks */}
                            <div className="mt-3 space-y-1">
                              {subject.tests.map(test => (
                                <div key={test.testId} className="flex items-center justify-between text-xs text-slate-500">
                                  <span>{test.testName}</span>
                                  <span>{test.marks}/{test.maxMarks}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12">
                  <p className="text-slate-400 text-center">No results available yet</p>
                </CardContent>
              </Card>
            )}
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
