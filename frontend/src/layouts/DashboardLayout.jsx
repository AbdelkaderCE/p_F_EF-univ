/*
  Intent: University staff/students navigating academic modules.
          Shell stays fixed — sidebar + topbar frame the workspace.
          Content scrolls independently. Feels like a well-organized office.
  Palette: canvas bg throughout — sidebar is NOT a different world.
  Depth: border-edge separates sidebar/topbar from content. No heavy shadows on shell.
  Surfaces: canvas (base) for shell, surface (white) for content cards within.
  Typography: Inter. Subheading in topbar, labels in sidebar.
  Spacing: 4px base.
*/

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../design-system/components/navigation/Sidebar';
import Topbar from '../design-system/components/navigation/Topbar';
import TeacherDashboard from '../pages/TeacherDashboard';
import StudentDashboard from '../pages/StudentDashboard';
import { useAuth } from '../contexts/AuthContext';

/* ── 11 Modules ─────────────────────────────────────────────── */
const ALL_MODULES = [
  { nameKey: 'nav.dashboard',     path: '/dashboard',                roles: ['etudiant', 'delegue', 'enseignant', 'chef_specialite', 'chef_departement', 'vice_doyen', 'admin'] },
  { nameKey: 'nav.actualites',    path: '/dashboard/actualites',     roles: ['etudiant', 'delegue', 'enseignant', 'chef_specialite', 'chef_departement', 'vice_doyen', 'admin'] },
  { nameKey: 'nav.projects',      path: '/dashboard/projects',       roles: ['etudiant', 'delegue', 'enseignant'] },
  { nameKey: 'nav.ai',            path: '/dashboard/ai',             roles: ['etudiant', 'delegue', 'enseignant'] },
  { nameKey: 'nav.documents',     path: '/dashboard/documents',      roles: ['etudiant', 'delegue', 'enseignant', 'vice_doyen', 'admin'] },
  { nameKey: 'nav.calendar',      path: '/dashboard/calendar',       roles: ['etudiant', 'delegue', 'enseignant', 'chef_specialite', 'chef_departement', 'vice_doyen', 'admin'] },
  { nameKey: 'nav.disciplinary',  path: '/dashboard/disciplinary',   roles: ['enseignant', 'president_conseil', 'vice_doyen', 'admin'] },
  { nameKey: 'nav.requests',      path: '/dashboard/requests',       roles: ['etudiant', 'delegue', 'enseignant', 'chef_specialite', 'chef_departement', 'vice_doyen', 'admin'] },
  { nameKey: 'nav.messages',      path: '/dashboard/messages',       roles: ['etudiant', 'delegue', 'enseignant', 'vice_doyen', 'admin'] },
  { nameKey: 'nav.notifications', path: '/dashboard/notifications',  roles: ['etudiant', 'delegue', 'enseignant', 'vice_doyen', 'admin'] },
  { nameKey: 'nav.settings',      path: '/dashboard/settings',       roles: ['etudiant', 'delegue', 'enseignant', 'chef_specialite', 'chef_departement', 'vice_doyen', 'admin'] },
  { nameKey: 'nav.support',       path: '/dashboard/support',        roles: ['etudiant', 'delegue', 'enseignant'] },
  { nameKey: 'nav.userManagement', path: '/dashboard/admin/users',   roles: ['vice_doyen', 'admin'] },
  { nameKey: 'nav.academicStructure', path: '/dashboard/admin/academic/management', roles: ['vice_doyen', 'admin'] },
  { nameKey: 'nav.academicAssignments', path: '/dashboard/admin/academic/assignments', roles: ['vice_doyen', 'admin'] },
];

/* Map DB roles to the UI role token used by children (student | teacher | admin) */
function uiRole(roles) {
  if (!roles || !roles.length) return 'student';
  const arr = Array.isArray(roles) ? roles : [roles];
  const upper = arr.map((r) => (r || '').toUpperCase());
  if (upper.some((r) => ['ADMIN', 'ADMIN_FACULTY', 'ADMIN_FACULTE', 'ADMIN_SUPER', 'VICE_DOYEN'].includes(r))) return 'admin';
  if (upper.some((r) => ['TEACHER', 'ENSEIGNANT'].includes(r))) return 'teacher';
  return 'student'; // etudiant, delegue, etc.
}

function dashboardHomeByRoles(roles) {
  if (!roles || !roles.length) return 'student';
  const arr = Array.isArray(roles) ? roles : [roles];
  const normalized = arr.map((r) => String(r || '').toLowerCase());

  if (normalized.some((r) => ['etudiant', 'delegue', 'student'].includes(r))) return 'student';
  if (normalized.some((r) => ['enseignant', 'teacher'].includes(r))) return 'teacher';
  return 'admin';
}

function AdminHomePanel({ onNavigate }) {
  return (
    <div className="rounded-2xl border border-edge bg-surface p-8 shadow-card">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Admin Dashboard</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        Welcome. Select a module to continue administration tasks.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onNavigate('/dashboard/admin/users')}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-hover"
        >
          Manage Users
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/dashboard/requests')}
          className="rounded-xl border border-edge bg-canvas px-4 py-2 text-sm font-medium text-ink transition hover:border-brand/30 hover:text-brand"
        >
          Open Requests
        </button>
      </div>
    </div>
  );
}

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  /* Derive activeKey from the current URL */
  const activeKey = location.pathname;

  const role = uiRole(user?.roles);
  const defaultHome = dashboardHomeByRoles(user?.roles);

  /* Filter modules by the user's actual DB roles and resolve translated names */
  const visibleModules = ALL_MODULES
    .filter((m) => user?.roles?.length ? user.roles.some(r => m.roles.includes(r)) : m.roles.includes('etudiant'))
    .map((m) => ({ ...m, name: t(m.nameKey) }));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  /* Navigate to the clicked module path */
  const handleNavigate = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-canvas overflow-hidden">
      {/* Sidebar — same canvas bg, separated by border only */}
      <Sidebar
        modules={visibleModules}
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={handleNavigate}
        activeKey={activeKey}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(v => !v)}
      />

      {/* Right column: topbar + content */}
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          role={role}
          user={user}
          onLogout={handleLogout}
          onHamburger={() => setSidebarOpen(true)}
          onNavigate={handleNavigate}
          activeKey={activeKey}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(v => !v)}
        />

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          {children
            ? React.Children.map(children, (child) =>
                React.isValidElement(child) ? React.cloneElement(child, { role }) : child
              )
            : (defaultHome === 'student'
                ? <StudentDashboard role={role} />
                : defaultHome === 'teacher'
                  ? <TeacherDashboard role={role} />
                  : <AdminHomePanel onNavigate={handleNavigate} />)
          }
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
