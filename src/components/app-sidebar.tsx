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
import ThemeToggle from './theme-toggle'

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
    <Sidebar collapsible="icon">
      {/* ===== Header ===== */}
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-transparent cursor-default"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-white">
                <GraduationCap className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold text-foreground">Sankalp</span>
                <span className="truncate text-xs text-muted-foreground">Result Management</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* ===== Navigation ===== */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-[10px] uppercase tracking-widest">
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
                          ? 'bg-accent text-primary font-semibold hover:bg-accent/80'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <Icon className={`size-4 ${isActive ? 'text-primary' : ''}`} />
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
              <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-foreground">{userName}</span>
                <span className="truncate text-xs text-muted-foreground">{ROLE_LABELS[role]}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Theme Toggle */}
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>

          {/* Change Password */}
          <SidebarMenuItem>
            <ChangePasswordDialog userId={userId}>
              <SidebarMenuButton tooltip="Change Password" className="cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent">
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
              className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
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
