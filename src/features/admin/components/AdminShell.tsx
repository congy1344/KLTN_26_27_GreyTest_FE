import { Activity, ArrowLeft, Gauge, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { AppShell } from '../../../shared/components/AppShell';

export function AdminShell({ children }: { children: ReactNode }) {
  const item = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-default px-3 py-2 text-sm font-semibold ${isActive ? 'bg-brand-softer text-fg-brand-strong' : 'text-body hover:bg-neutral-secondary'}`;
  return (
    <AppShell maxWidth="wide" homeTo="/admin" logoutTo="/admin/login" showAdminShortcut={false}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-brand">GreyTest Operations</p>
          <h1 className="mt-1 text-3xl font-bold text-heading">Admin Dashboard</h1>
        </div>
        <NavLink to="/projects" className="btn btn-secondary"><ArrowLeft size={15} /> Giao diện người dùng</NavLink>
      </div>
      <nav className="mb-6 flex flex-wrap gap-2 rounded-base border border-border-default bg-neutral-primary-soft p-2 shadow-sm" aria-label="Admin navigation">
        <NavLink end to="/admin" className={item}><Gauge size={16} /> Tổng quan</NavLink>
        <NavLink to="/admin/users" className={item}><Users size={16} /> Người dùng</NavLink>
        <NavLink to="/admin/activity" className={item}><Activity size={16} /> Nhật ký hoạt động</NavLink>
      </nav>
      {children}
    </AppShell>
  );
}
