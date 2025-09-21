import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { map, switchMap, take, of } from 'rxjs';

export const trainerGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(Auth);          // ⬅️ інʼєкції AngularFire
  const db = inject(Firestore);

  return authState(auth).pipe(
    take(1),
    switchMap(user => {
      if (!user) {
        router.navigate(['/login']);
        return of(false);
      }
      // читаємо свій документ ролі
      const ref = doc(db, 'roles', user.uid);
      return docData(ref).pipe(
        take(1),
        map((roleDoc: any) => {
          if (roleDoc?.role === 'trainer') return true;
          router.navigate(['/login']);
          return false;
        })
      );
    })
  );
};
