import { Routes } from '@angular/router';
import { trainerGuard } from './guards/trainer.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/home/home.component').then(m => m.HomeComponent),
    title: 'Запис на уроки',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
    title: 'Вхід тренера',
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [trainerGuard],
    title: 'Кабінет тренера',
  },
  { path: '**', redirectTo: '' },
];
