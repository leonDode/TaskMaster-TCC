import { LogOut, Menu, Settings, User as UserIcon, X } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router';
import { AppSidebar, AppSidebarContent } from '@/components/layout/app-sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserQuery } from '@/features/profile/use-user-query';
import { useTranslation } from '@/lib/i18n/use-translation';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';

export function AppShell() {
  const { data: user } = useUserQuery();
  const { t } = useTranslation();
  const forceSignOut = useAuthStore((state) => state.forceSignOut);
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const navigate = useNavigate();

  const initials = (user?.displayName ?? user?.email ?? '?')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="min-h-screen">
      <AppSidebar />

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileNavOpen(false)}
          />
          <nav className="bg-surface-container relative z-10 flex h-full w-64 flex-col px-4 py-8">
            <button
              className="text-on-surface-variant absolute top-6 right-4"
              onClick={() => setMobileNavOpen(false)}
              aria-label={t('appShell.closeMenu')}
            >
              <X className="size-5" />
            </button>
            <AppSidebarContent onNavigate={() => setMobileNavOpen(false)} />
          </nav>
        </div>
      )}

      <header className="bg-background/80 border-outline-variant/10 fixed top-0 right-0 left-0 z-40 flex h-20 items-center justify-between border-b px-4 backdrop-blur-md md:left-64 md:px-gutter">
        <button
          className="text-on-surface-variant md:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label={t('appShell.openMenu')}
        >
          <Menu className="size-6" />
        </button>
        <div className="hidden md:block" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="border-outline-variant/30 hover:neon-border-secondary size-10 cursor-pointer overflow-hidden rounded-full border-2 transition-colors">
              <Avatar className="size-full rounded-none">
                <AvatarImage src={user?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-surface-container-high text-on-surface rounded-none">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserIcon />
              {t('appShell.profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings />
              {t('appShell.settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={forceSignOut} variant="destructive">
              <LogOut />
              {t('appShell.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-24 pb-section-margin md:ml-64 md:px-gutter">
        <Outlet />
      </main>
    </div>
  );
}
