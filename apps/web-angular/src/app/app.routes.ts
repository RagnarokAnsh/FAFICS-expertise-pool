import { Routes } from '@angular/router';

/**
 * Same URLs as the Next.js app (so emailed links keep working):
 *   /                          → /apply
 *   /apply, /apply/:draftId, /apply/resume/:token, /endorse/:token, /status
 *   /application/:token        → applicant's read-only view of their submitted application
 *   /admin                     → /admin/dashboard
 *   /admin/login, /admin/forgot-password, /admin/reset-password/:token
 *     (rendered without the dashboard shell, like PUBLIC_ADMIN_ROUTES)
 *   /admin/{dashboard,applications,applications/:id,roster,expiring,export,reports,users,account}
 *   anything else              → the Next.js-style 404 page
 *
 * Pages load on demand (one chunk per page, as Next.js splits per route), so an
 * applicant never downloads the officer dashboard.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'apply' },
  { path: 'apply', loadComponent: () => import('./pages/apply/apply.page').then((m) => m.ApplyPage) },
  {
    path: 'apply/resume/:token',
    loadComponent: () => import('./pages/apply/resume.page').then((m) => m.ResumePage),
  },
  { path: 'apply/:draftId', loadComponent: () => import('./pages/apply/draft.page').then((m) => m.DraftPage) },
  { path: 'endorse/:token', loadComponent: () => import('./pages/endorse/endorse.page').then((m) => m.EndorsePage) },
  { path: 'status', loadComponent: () => import('./pages/status/status.page').then((m) => m.StatusPage) },
  {
    path: 'application/:token',
    loadComponent: () => import('./pages/application/application-view.page').then((m) => m.ApplicationViewPage),
  },
  {
    path: 'admin',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'login', loadComponent: () => import('./pages/admin/login.page').then((m) => m.LoginPage) },
      {
        path: 'forgot-password',
        loadComponent: () => import('./pages/admin/forgot-password.page').then((m) => m.ForgotPasswordPage),
      },
      {
        path: 'reset-password/:token',
        loadComponent: () => import('./pages/admin/reset-password.page').then((m) => m.ResetPasswordPage),
      },
      {
        path: '',
        loadComponent: () => import('./pages/admin/admin-layout').then((m) => m.AdminLayout),
        children: [
          {
            path: 'dashboard',
            loadComponent: () => import('./pages/admin/dashboard.page').then((m) => m.DashboardPage),
          },
          {
            path: 'applications',
            loadComponent: () => import('./pages/admin/applications.page').then((m) => m.ApplicationsPage),
          },
          {
            path: 'applications/:id',
            loadComponent: () =>
              import('./pages/admin/application-detail.page').then((m) => m.ApplicationDetailPage),
          },
          { path: 'roster', loadComponent: () => import('./pages/admin/roster.page').then((m) => m.RosterPage) },
          { path: 'expiring', loadComponent: () => import('./pages/admin/expiring.page').then((m) => m.ExpiringPage) },
          { path: 'export', loadComponent: () => import('./pages/admin/export.page').then((m) => m.ExportPage) },
          { path: 'reports', loadComponent: () => import('./pages/admin/reports.page').then((m) => m.ReportsPage) },
          { path: 'users', loadComponent: () => import('./pages/admin/users.page').then((m) => m.UsersPage) },
          { path: 'account', loadComponent: () => import('./pages/admin/account.page').then((m) => m.AccountPage) },
          { path: 'emails', loadComponent: () => import('./pages/admin/emails.page').then((m) => m.EmailsPage) },
        ],
      },
    ],
  },
  { path: '**', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage) },
];
