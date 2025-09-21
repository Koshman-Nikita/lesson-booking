import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  collectionData,
  runTransaction,
  updateDoc,
  deleteDoc,
  addDoc,
} from '@angular/fire/firestore';
import { Observable, firstValueFrom } from 'rxjs';

export type BookingStatus = 'pending' | 'confirmed' | 'canceled';

export interface Booking {
  id: string;               // YYYY-MM-DD_HH:mm
  date: string;             // YYYY-MM-DD
  slot: string;             // HH:mm
  studentName: string;
  status: BookingStatus;
  createdAt: number;
  updatedAt: number;
  email?: string;           // <-- опційно
}

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private db = inject(Firestore);
  private col = collection(this.db, 'bookings');

  private makeId(date: string, slot: string) { return `${date}_${slot}`; }

  // --------- Реал-тайм стріми ---------
  streamByDate(date: string): Observable<Booking[]> {
    const q = query(this.col, where('date', '==', date));
    return collectionData(q, { idField: 'id' }) as unknown as Observable<Booking[]>;
  }
  // PENDING по всіх датах
  streamPendingAll() {
    const q = query(
      this.col,
      where('status', '==', 'pending'),
      orderBy('date'),
      orderBy('slot')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Booking[]>;
  }

  // CONFIRMED по всіх датах
  streamConfirmedAll() {
    const q = query(
      this.col,
      where('status', '==', 'confirmed'),
      orderBy('date'),
      orderBy('slot')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Booking[]>;
  }


  // --------- Мутації ---------
  async createPending(date: string, slot: string, studentName: string, email?: string) {
    return this.createByTrainer(date, slot, studentName, 'pending', email);
  }

  /** Створення запису тренером; status за замовчуванням 'confirmed' */
  async createByTrainer(
    date: string,
    slot: string,
    studentName: string,
    status: BookingStatus = 'confirmed',
    email?: string
  ) {
    const id = this.makeId(date, slot);
    const ref = doc(this.db, 'bookings', id);

    await runTransaction(this.db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        const ex = snap.data() as Booking;
        if (ex.status !== 'canceled') throw new Error('Слот зайнятий');
      }
      const now = Date.now();
      const payload: Booking = {
        id, date, slot, studentName, status,
        createdAt: now, updatedAt: now,
        ...(email ? { email } : {})
      };
      tx.set(ref, payload);
    });
  }

  async setStatus(id: string, status: BookingStatus) {
    const ref = doc(this.db, 'bookings', id);
    await updateDoc(ref, { status, updatedAt: Date.now() });
  }

  async reschedule(oldId: string, newDate: string, newSlot: string) {
    const oldRef = doc(this.db, 'bookings', oldId);
    const newRef = doc(this.db, 'bookings', this.makeId(newDate, newSlot));

    await runTransaction(this.db, async (tx) => {
      const oldSnap = await tx.get(oldRef);
      if (!oldSnap.exists()) throw new Error('Запис не знайдено');
      const old = oldSnap.data() as Booking;

      const newSnap = await tx.get(newRef);
      if (newSnap.exists()) {
        const ex = newSnap.data() as Booking;
        if (ex.status !== 'canceled') throw new Error('Новий слот зайнятий');
      }

      const now = Date.now();
      tx.set(newRef, { ...old, id: this.makeId(newDate, newSlot), date: newDate, slot: newSlot, updatedAt: now });
      tx.delete(oldRef);
    });
  }

  async remove(id: string) {
    const ref = doc(this.db, 'bookings', id);
    await deleteDoc(ref);
  }

  // --------- E-mail (черга для Firebase Extension "Send Email") ---------
  private mailCol = collection(this.db, 'mail');

  /** Додати лист у чергу розсилки (працює з розширенням firebase/firestore-send-email) */
  async queueEmail(to: string, subject: string, text: string, html?: string) {
    await addDoc(this.mailCol, {
      to,
      message: { subject, text, html: html ?? text }
    });
  }

  /** Сповіщення про зміну статусу */
  async queueStatusEmail(b: Booking, newStatus: BookingStatus) {
    if (!b.email) return;
    const subj = newStatus === 'confirmed'
      ? 'Ваш урок підтверджено'
      : 'Ваш урок скасовано';
    const txt =
      `Статус вашого запису змінено: ${newStatus === 'confirmed' ? 'ПІДТВЕРДЖЕНО' : 'СКАСОВАНО'}.
Дата: ${b.date}
Час: ${b.slot}
Ім’я: ${b.studentName}`;
    await this.queueEmail(b.email, subj, txt);
  }
}
