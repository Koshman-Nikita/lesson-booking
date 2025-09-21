import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { map, switchMap, of, firstValueFrom, catchError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private db = inject(Firestore);
  private router = inject(Router);

  user$ = user(this.auth);

  /** isTrainer$ — true лише якщо в roles/{uid}.role == 'trainer' */
  isTrainer$ = this.user$.pipe(
    switchMap(u => {
      if (!u) return of(false);
      const ref = doc(this.db, 'roles', u.uid);
      return docData(ref).pipe(
        map((d: any) => d?.role === 'trainer'),
        catchError(() => of(false))
      );
    })
  );

  async isTrainerOnce() { return !!(await firstValueFrom(this.isTrainer$)); }

  async login(email: string, password: string) {
    await signInWithEmailAndPassword(this.auth, email, password);
    await this.router.navigateByUrl('/admin');
  }

  async logout() {
    await signOut(this.auth);
    await this.router.navigateByUrl('/');
  }
}
