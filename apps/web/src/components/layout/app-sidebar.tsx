import {
  CalendarDays,
  Home,
  ListChecks,
  Plus,
  Tags,
  User,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router';
import logoFull from '@/assets/logo-full.png';
import { useTranslation } from '@/lib/i18n/use-translation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { key: 'today', to: '/', icon: Home },
  { key: 'myTasks', to: '/tasks', icon: ListChecks },
  { key: 'calendar', to: '/calendar', icon: CalendarDays },
  { key: 'categories', to: '/categories', icon: Tags },
  { key: 'groups', to: '/groups', icon: Users },
  { key: 'profile', to: '/profile', icon: User },
] as const;

export function AppSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();

  return (
    <>
      <div className="mb-10 flex h-20 items-center px-2">
        <img src={logoFull} alt="Task Master" className="h-[60px] w-auto" />
      </div>

      <ul className="flex grow flex-col gap-2">
        {NAV_ITEMS.map(({ key, to, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-4 rounded-lg px-4 py-3 transition-all duration-300 active:scale-95',
                  isActive
                    ? 'bg-primary-container/20 border-r-4 border-primary text-primary font-bold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50',
                )
              }
            >
              <Icon className="size-5 shrink-0" />
              <span className="text-title-md">{t(`sidebar.${key}`)}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <NavLink
        to="/tasks?new=1"
        onClick={onNavigate}
        className="bg-primary text-primary-foreground mt-auto flex items-center justify-center gap-2 rounded-lg py-3 transition-colors hover:opacity-90 active:scale-95 dark:shadow-[0_0_15px_rgba(255,45,120,0.4)]"
      >
        <Plus className="size-5" />
        <span className="text-title-md">{t('sidebar.newTask')}</span>
      </NavLink>
    </>
  );
}

export function AppSidebar() {
  return (
    <nav className="bg-surface-container border-outline-variant/40 fixed top-0 left-0 z-50 hidden h-screen w-64 flex-col border-r px-4 py-8 md:flex dark:border-transparent dark:shadow-[0_0_15px_rgba(255,45,120,0.1)]">
      <AppSidebarContent />
    </nav>
  );
}
