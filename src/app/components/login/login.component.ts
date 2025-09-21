import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private auth = inject(AuthService);

  email = signal('');
  password = signal('');
  loading = signal(false);
  error = signal<string | null>(null);

  private mapAuthError(e: any): string {
    const code = e?.code || '';
    switch (code) {
      case 'auth/user-not-found':
        return 'Користувача з таким email не існує.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'Неправильний пароль.';
      case 'auth/invalid-email':
        return 'Невірний формат email.';
      case 'auth/too-many-requests':
        return 'Забагато спроб. Спробуйте пізніше.';
      case 'auth/network-request-failed':
        return 'Проблема з мережею. Перевірте інтернет.';
      default:
        return 'Невідома помилка.';
    }
  }

  async login() {
    this.error.set(null);
    try {
      await this.auth.login(this.email(), this.password());
      location.assign('/admin');
    } catch (e: any) {
      const code = e?.code || '';
      let msg = 'Невідома помилка.';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') msg = 'Невірний email або пароль.';
      else if (code === 'auth/user-not-found') msg = 'Користувача з таким email не знайдено.';
      else if (code === 'auth/invalid-email') msg = 'Невірний формат email.';
      else if (code === 'auth/too-many-requests') msg = 'Забагато спроб. Спробуйте пізніше.';
      this.error.set(msg);
    }
  }
}
