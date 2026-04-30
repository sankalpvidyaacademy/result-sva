'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  ClipboardList,
  PenLine,
  Trophy,
  Loader2,
  Clock,
  CheckCircle2,
  CalendarDays,
  TrendingDown,
  Award,
  BarChart3,
  BookOpen,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { authAPI, studentsAPI, testsAPI, marksAPI, resultsAPI } from '@/lib/api'
import { toast } from 'sonner'
import AppSidebar from './app-sidebar'

interface TestItem { id: string; name: string; date: string; maxMarks: number; status: string; subject: { id: string; name: string }; class: { id: string; name: string }; teacher: { id: string; name: string } }
interface MarkItem { id: string; marks: number; test: { id: string; name: string; date: string; maxMarks: number; subject: { id: string; name: string }; class: { id: string; name: string } } }

const PAGE_TITLES: Record<string, string> = {
  tests: 'My Tests',
  marks: 'My Marks',
  results: 'My Results',
}

export default function StudentDashboard() {
  const { user, setUser, setCurrentPage } = useAppStore()
  const [activeTab, setActiveTab] = useState('tests')

  // Data states
  const [studentData, setStudentData] = useState<{ id: string; rollNo: string; class: { id: string; name: string }; studentSubjects?: { subjectId: string; subject: { id: string; name: string; classId: string } }[] } | null>(null)
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
        setStudentData({ id: me.id, rollNo: me.rollNo, class: me.class, studentSubjects: me.studentSubjects })
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
      case 'Upcoming': return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100">{status}</Badge>
      case 'Today': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">{status}</Badge>
      case 'Completed': return <Badge className="bg-muted text-muted-foreground hover:bg-muted">{status}</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Upcoming': return <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
      case 'Today': return <CalendarDays className="w-4 h-4 text-primary" />
      case 'Completed': return <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
      default: return null
    }
  }

  // Filter by selected subjects
  const selectedSubjectIds = studentData?.studentSubjects?.map(ss => ss.subjectId)
  const hasSelectedSubjects = !!(selectedSubjectIds && selectedSubjectIds.length > 0)

  const filteredTests = hasSelectedSubjects
    ? tests.filter(t => selectedSubjectIds!.includes(t.subject.id))
    : tests
  const filteredMarks = hasSelectedSubjects
    ? marks.filter(m => selectedSubjectIds!.includes(m.test.subject.id))
    : marks

  // Categorize tests
  const upcomingTests = filteredTests.filter(t => t.status === 'Upcoming')
  const todayTests = filteredTests.filter(t => t.status === 'Today')
  const completedTests = filteredTests.filter(t => t.status === 'Completed')

  // Group marks by subject
  const marksBySubject: Record<string, { subjectName: string; entries: { testName: string; marks: number; maxMarks: number; date: string }[] }> = {}
  for (const m of filteredMarks) {
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

  // Filter results by selected subjects
  const filteredSubjectWise = hasSelectedSubjects && studentResults
    ? studentResults.subjectWise.filter(sw => selectedSubjectIds!.includes(sw.subjectId))
    : studentResults?.subjectWise
  const filteredTotalMarks = filteredSubjectWise
    ? filteredSubjectWise.reduce((sum, sw) => sum + sw.totalMarks, 0)
    : 0
  const filteredTotalMaxMarks = filteredSubjectWise
    ? filteredSubjectWise.reduce((sum, sw) => sum + sw.totalMaxMarks, 0)
    : 0
  const filteredPercentage = filteredTotalMaxMarks > 0
    ? Math.round((filteredTotalMarks / filteredTotalMaxMarks) * 100)
    : 0
  const filteredWeakSubject = filteredSubjectWise && filteredSubjectWise.length > 0
    ? filteredSubjectWise.reduce((min, sw) => sw.percentage < min.percentage ? sw : min, filteredSubjectWise[0])
    : null
  const displayWeakSubject = hasSelectedSubjects ? filteredWeakSubject : studentResults?.weakSubject
  const displayPercentage = hasSelectedSubjects ? filteredPercentage : studentResults?.percentage ?? 0
  const displayTotalMarks = hasSelectedSubjects ? filteredTotalMarks : studentResults?.totalMarks ?? 0
  const displayTotalMaxMarks = hasSelectedSubjects ? filteredTotalMaxMarks : studentResults?.totalMaxMarks ?? 0

  return (
    <SidebarProvider>
      <AppSidebar
        role="STUDENT"
        activePage={activeTab}
        onNavigate={setActiveTab}
        userName={user?.name || ''}
        userId={user?.id || ''}
        onLogout={handleLogout}
      />
      <SidebarInset>
        {/* Top header bar */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4 sticky top-0 z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-sm font-semibold text-foreground">{PAGE_TITLES[activeTab] || activeTab}</h1>
          {studentData && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge className="bg-accent text-primary border-primary/20 text-xs hover:bg-accent">
                {studentData.class.name} • Roll #{studentData.rollNo}
              </Badge>
            </>
          )}
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <main className="flex-1 p-4 bg-muted">
            {/* ===== MY TESTS ===== */}
            {activeTab === 'tests' && (
              loadingTests ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Today's Tests */}
                  {todayTests.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5" />
                        Today&apos;s Tests
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {todayTests.map(test => (
                          <Card key={test.id} className="border-l-4 border-l-green-500 border-0 shadow-sm">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-foreground">{test.name}</h3>
                                  <p className="text-sm text-muted-foreground">{test.subject.name}</p>
                                  <p className="text-xs text-muted-foreground mt-1">Max Marks: {test.maxMarks}</p>
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
                      <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Upcoming Tests
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {upcomingTests.map(test => (
                          <Card key={test.id} className="border-l-4 border-l-blue-500 border-0 shadow-sm">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-foreground">{test.name}</h3>
                                  <p className="text-sm text-muted-foreground">{test.subject.name}</p>
                                  <p className="text-xs text-muted-foreground mt-1">Date: {test.date} • Max: {test.maxMarks}</p>
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
                      <h2 className="text-lg font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Completed Tests
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {completedTests.map(test => (
                          <Card key={test.id} className="border-l-4 border-l-muted-foreground/40 border-0 shadow-sm">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-foreground">{test.name}</h3>
                                  <p className="text-sm text-muted-foreground">{test.subject.name}</p>
                                  <p className="text-xs text-muted-foreground mt-1">Date: {test.date} • Max: {test.maxMarks}</p>
                                </div>
                                {getStatusIcon(test.status)}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredTests.length === 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardContent className="py-12">
                        <p className="text-muted-foreground text-center">No tests scheduled yet</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )
            )}

            {/* ===== MY MARKS ===== */}
            {activeTab === 'marks' && (
              loadingMarks ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : Object.keys(marksBySubject).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(marksBySubject).map(([subjectId, data]) => (
                    <Card key={subjectId} className="border-0 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          {data.subjectName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {data.entries.map((entry, idx) => {
                            const pct = entry.maxMarks > 0 ? Math.round((entry.marks / entry.maxMarks) * 100) : 0
                            return (
                              <div key={idx} className="p-2 rounded-md bg-muted">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-foreground">{entry.testName}</span>
                                  <span className={`text-sm font-semibold ${pct >= 60 ? 'text-primary' : 'text-destructive'}`}>
                                    {entry.marks}/{entry.maxMarks}
                                  </span>
                                </div>
                                <Progress value={pct} className="h-1.5" />
                                <p className="text-xs text-muted-foreground mt-1">{entry.date}</p>
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
                    <p className="text-muted-foreground text-center">No marks available yet</p>
                  </CardContent>
                </Card>
              )
            )}

            {/* ===== MY RESULTS ===== */}
            {activeTab === 'results' && (
              loadingResults ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : studentResults ? (
                <div className="space-y-4">
                  {/* Overall Performance Card */}
                  <Card className="border-0 shadow-sm bg-accent">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            <Award className="w-6 h-6 text-primary" />
                          </div>
                          <p className="text-2xl font-bold text-primary">#{studentResults.rank}</p>
                          <p className="text-xs text-muted-foreground">Rank (of {studentResults.totalStudents})</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            <BarChart3 className="w-6 h-6 text-primary" />
                          </div>
                          <p className="text-2xl font-bold text-primary">{displayPercentage}%</p>
                          <p className="text-xs text-muted-foreground">Overall</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground">{displayTotalMarks}</p>
                          <p className="text-xs text-muted-foreground">Total Obtained</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-muted-foreground">{displayTotalMaxMarks}</p>
                          <p className="text-xs text-muted-foreground">Total Maximum</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Weak Subject Alert */}
                  {displayWeakSubject && (
                    <Card className="border-0 shadow-sm bg-destructive/10 border-l-4 border-l-destructive/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <TrendingDown className="w-5 h-5 text-destructive shrink-0" />
                          <div>
                            <p className="font-semibold text-destructive text-sm">Weak Subject</p>
                            <p className="text-destructive text-xs">{displayWeakSubject.subjectName} — {displayWeakSubject.percentage}%</p>
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
                        {(filteredSubjectWise ?? []).map(subject => {
                          const isWeak = displayWeakSubject?.subjectId === subject.subjectId
                          return (
                            <div
                              key={subject.subjectId}
                              className={`p-4 rounded-lg border ${isWeak ? 'bg-destructive/10 border-destructive/20' : 'bg-background border-border'}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-sm text-foreground">{subject.subjectName}</h4>
                                {isWeak && (
                                  <Badge className="bg-destructive/10 text-destructive text-xs">Weak</Badge>
                                )}
                              </div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-muted-foreground">
                                  {subject.totalMarks}/{subject.totalMaxMarks}
                                </span>
                                <span className={`text-sm font-semibold ${subject.percentage >= 60 ? 'text-primary' : 'text-destructive'}`}>
                                  {subject.percentage}%
                                </span>
                              </div>
                              <Progress value={subject.percentage} className="h-2" />

                              {/* Individual test marks */}
                              <div className="mt-3 space-y-1">
                                {subject.tests.map(test => (
                                  <div key={test.testId} className="flex items-center justify-between text-xs text-muted-foreground">
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
                    <p className="text-muted-foreground text-center">No results available yet</p>
                  </CardContent>
                </Card>
              )
            )}
          </main>

          {/* Footer */}
          <footer className="bg-background border-t border-border py-3 mt-auto">
            <p className="text-center text-xs text-muted-foreground">&copy; 2024 Sankalp Result Management System</p>
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
