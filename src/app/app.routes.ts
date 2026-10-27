import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'capture' },
  {
    path: 'capture',
    title: 'Capture · E-Container',
    loadComponent: () =>
      import('./features/capture/capture.component').then((m) => m.CaptureComponent),
  },
  {
    path: 'review',
    title: 'Review queue · E-Container',
    loadComponent: () =>
      import('./features/review/review-queue.component').then((m) => m.ReviewQueueComponent),
  },
  {
    path: 'register',
    title: 'Register · E-Container',
    loadComponent: () =>
      import('./features/register/register.component').then((m) => m.RegisterComponent),
  },
  { path: '**', redirectTo: 'capture' },
];
