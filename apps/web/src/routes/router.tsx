import { BrowserRouter, Routes, Route } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { AuthCallbackPage } from '@/features/auth/auth-callback-page';
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page';
import { LoginPage } from '@/features/auth/login-page';
import { ResetPasswordPage } from '@/features/auth/reset-password-page';
import { CategoriesPage } from '@/features/categories/categories-page';
import { ChallengeDetailPage } from '@/features/challenges/challenge-detail-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { GroupDetailPage } from '@/features/groups/group-detail-page';
import { GroupsPage } from '@/features/groups/groups-page';
import { CalendarPage } from '@/features/occurrences/calendar-page';
import { ProfilePage } from '@/features/profile/profile-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { TasksPage } from '@/features/tasks/tasks-page';
import { NotFoundPage } from '@/routes/not-found-page';
import { ProtectedRoute } from '@/routes/protected-route';
import { PublicOnlyRoute } from '@/routes/public-only-route';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:groupId" element={<GroupDetailPage />} />
            <Route
              path="/groups/:groupId/challenges/:challengeId"
              element={<ChallengeDetailPage />}
            />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
