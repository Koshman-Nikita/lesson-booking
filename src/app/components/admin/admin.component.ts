import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select'; // для <mat-select>
import { Subscription } from 'rxjs';
import dayjs from 'dayjs';

import { AuthService } from '../../services/auth.service';
import { BookingsService, Booking } from '../../services/bookings.service';
import { EmailService } from '../../services/email.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit, OnDestroy {
  private bookings = inject(BookingsService);
  private auth = inject(AuthService);
  private mail = inject(EmailService);

  private subs = new Subscription();

  pending = signal<Booking[]>([]);
  confirmed = signal<Booking[]>([]);
  loading = signal(false);
  message = signal<string | null>(null);

  createDate = signal<Date>(new Date());
  createSlot = signal('15:00');
  createName = signal('');
  createEmail = signal('');

  async ngOnInit() {
    const ok = await this.auth.isTrainerOnce();
    if (!ok) { location.assign('/login'); return; }

    this.loading.set(true);
    this.subs.add(this.bookings.streamPendingAll().subscribe(list => this.pending.set(list)));
    this.subs.add(this.bookings.streamConfirmedAll().subscribe(list => {
      this.confirmed.set(list);
      this.loading.set(false);
    }));
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  slots(): string[] {
    const { start, end, slotMinutes } = environment.booking;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const out: string[] = [];
    for (let m = sh * 60 + sm; m < eh * 60 + em; m += slotMinutes) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      out.push(`${hh}:${mm}`);
    }
    return out;
  }

  async confirm(b: Booking) {
    this.message.set(null);
    try {
      await this.bookings.setStatus(b.id, 'confirmed');
      if (b.email) await this.mail.sendStatus(b.email, b.studentName, b.date, b.slot, 'confirmed');
    } catch (e: any) { this.message.set(e?.message ?? 'Не вдалося підтвердити'); }
  }

  async cancel(b: Booking) {
    this.message.set(null);
    try {
      await this.bookings.setStatus(b.id, 'canceled');
      if (b.email) await this.mail.sendStatus(b.email, b.studentName, b.date, b.slot, 'canceled');
    } catch (e: any) { this.message.set(e?.message ?? 'Не вдалося скасувати'); }
  }

  async reschedule(b: Booking) {
    this.message.set(null);
    const newSlot = prompt('Новий час (HH:mm):', b.slot) || b.slot;
    const newDate = prompt('Нова дата (YYYY-MM-DD):', b.date) || b.date;
    try { await this.bookings.reschedule(b.id, newDate, newSlot); }
    catch (e: any) { this.message.set(e?.message ?? 'Не вдалося перенести (можливо, зайнято)'); }
  }

  async createManual() {
    this.message.set(null);
    const name = this.createName().trim();
    const email = this.createEmail().trim();
    if (!name) { this.message.set('Вкажіть ім’я'); return; }
    const date = dayjs(this.createDate()).format('YYYY-MM-DD');
    const slot = this.createSlot();

    try {
      await this.bookings.createByTrainer(date, slot, name, 'confirmed', email || undefined);
      if (email) await this.mail.sendStatus(email, name, date, slot, 'confirmed');
      this.createName.set(''); this.createEmail.set('');
    } catch (e: any) {
      this.message.set(e?.message ?? 'Не вдалося створити запис (можливо, зайнятий)');
    }
  }

  async logout() { await this.auth.logout(); }
}
