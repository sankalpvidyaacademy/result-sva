'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Trophy,
  BarChart3,
  CalendarPlus,
  PenLine,
  LogOut,
  KeyRound,
} from 'lucide-react'
import ChangePasswordDialog from './change-password-dialog'

// ===== Menu Definitions per Role =====
interface MenuItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const ADMIN_MENU_ITEMS: MenuItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'teachers', label: 'Teachers', icon: BookOpen },
  { id: 'tests', label: 'Tests', icon: ClipboardList },
  { id: 'results', label: 'Results', icon: Trophy },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
]

const TEACHER_MENU_ITEMS: MenuItem[] = [
  { id: 'subjects', label: 'My Subjects', icon: BookOpen },
  { id: 'schedule', label: 'Schedule Test', icon: CalendarPlus },
  { id: 'marks', label: 'Enter Marks', icon: PenLine },
  { id: 'results', label: 'View Results', icon: Trophy },
]

const STUDENT_MENU_ITEMS: MenuItem[] = [
  { id: 'tests', label: 'My Tests', icon: ClipboardList },
  { id: 'marks', label: 'My Marks', icon: PenLine },
  { id: 'results', label: 'My Results', icon: Trophy },
]

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
}

function getMenuItems(role: string): MenuItem[] {
  switch (role) {
    case 'ADMIN': return ADMIN_MENU_ITEMS
    case 'TEACHER': return TEACHER_MENU_ITEMS
    case 'STUDENT': return STUDENT_MENU_ITEMS
    default: return []
  }
}

// ===== AppSidebar Component =====
interface AppSidebarProps {
  role: string
  activePage: string
  onNavigate: (page: string) => void
  userName: string
  userId: string
  onLogout: () => void
}

export default function AppSidebar({
  role,
  activePage,
  onNavigate,
  userName,
  userId,
  onLogout,
}: AppSidebarProps) {
  const menuItems = getMenuItems(role)

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200">
      {/* ===== Header ===== */}
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-transparent cursor-default"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-emerald-600 text-white">
                <GraduationCap className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold text-slate-800">Sankalp</span>
                <span className="truncate text-xs text-slate-500">Result Management</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* ===== Navigation ===== */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 text-[10px] uppercase tracking-widest">
            {ROLE_LABELS[role] || role}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = activePage === item.id
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => onNavigate(item.id)}
                      tooltip={item.label}
                      className={`cursor-pointer transition-all duration-150 ${
                        isActive
                          ? 'bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 font-semibold hover:from-teal-100 hover:to-emerald-100 hover:text-teal-800'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      <Icon className={`size-4 ${isActive ? 'text-teal-600' : ''}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      {/* ===== Footer ===== */}
      <SidebarFooter className="p-3">
        <SidebarMenu>
          {/* User Info */}
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent cursor-default">
              <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-xs font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-slate-700">{userName}</span>
                <span className="truncate text-xs text-slate-400">{ROLE_LABELS[role]}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Change Password */}
          <SidebarMenuItem>
            <ChangePasswordDialog userId={userId}>
              <SidebarMenuButton tooltip="Change Password" className="cursor-pointer text-slate-500 hover:text-slate-700 hover:bg-slate-100">
                <KeyRound className="size-4" />
                <span>Change Password</span>
              </SidebarMenuButton>
            </ChangePasswordDialog>
          </SidebarMenuItem>

          {/* Logout */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              onClick={onLogout}
              className="cursor-pointer text-rose-500 hover:text-rose-700 hover:bg-rose-50"
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
