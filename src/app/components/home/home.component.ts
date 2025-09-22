import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import dayjs from 'dayjs';

import { environment } from '../../../environments/environment';
import { BookingsService, Booking } from '../../services/bookings.service';
import { EmailService } from '../../services/email.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatDatepickerModule, MatNativeDateModule, MatSnackBarModule,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  private bookings = inject(BookingsService);
  private snack = inject(MatSnackBar);
  private emailSvc = inject(EmailService);

  private subs = new Subscription();

  // === НОВЕ: мінімальна дата — ЗАВТРА ===
  private tomorrow = dayjs().add(1, 'day').startOf('day').toDate();

  // модель/стан
  dateModel: Date = this.tomorrow;                       // стартово завтра
  date = signal<Date>(this.tomorrow);                    // сигнал теж завтра
  minDate = signal<Date>(this.tomorrow);                 // використовується в шаблоні

  name = signal('');
  wantEmail = signal(false);
  email = signal('');

  items = signal<Booking[]>([]);
  loading = signal(false);
  message = signal<string | null>(null);

  selectedSlot = signal<string | null>(null);
  optimistic = signal<Record<string, 'pending'>>({});

  // формати
  dateStr = computed(() => dayjs(this.date()).format('YYYY-MM-DD'));

  // допоміжне: обрана дата — сьогодні?
  private isSelectedToday = computed(() =>
    dayjs(this.date()).isSame(dayjs(), 'day')
  );

  // слоти робочого дня
  // === НОВЕ: якщо обрано сьогодні — повертаємо порожній список (нічого не показуємо) ===
  slots = computed(() => {
    if (this.isSelectedToday()) return [];
    const { start, end, slotMinutes } = environment.booking;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startM = sh * 60 + sm, endM = eh * 60 + em;
    const out: string[] = [];
    for (let m = startM; m < endM; m += slotMinutes) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      out.push(`${hh}:${mm}`);
    }
    return out;
  });

  ngOnInit() {
    // стартова підписка на обрану дату
    this.subscribeForDate(this.dateStr());
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  /** Перепідписка на іншу дату */
  private subscribeForDate(d: string) {
    this.subs.unsubscribe();
    this.subs = new Subscription();

    this.loading.set(true);
    this.subs.add(
      this.bookings.streamByDate(d).subscribe((list) => {
        this.items.set(list);
        // прибираємо оптимістичний статус, якщо документ уже прийшов зі стріму
        const cur = { ...this.optimistic() };
        for (const b of list) delete cur[b.id];
        this.optimistic.set(cur);

        this.loading.set(false);
      })
    );
  }

  /** Викликається з (dateChange) у HTML */
  onDateChange(value: Date | null) {
    if (!value) return;
    this.dateModel = value;
    this.date.set(value);
    this.selectedSlot.set(null);
    this.subscribeForDate(this.dateStr());
  }

  // ---- допоміжні ----
  private idOf(slot: string) { return `${this.dateStr()}_${slot}`; }
  private bookingFor(slot: string) { return this.items().find((i) => i.id === this.idOf(slot)); }

  nameOf(slot: string) {
    const b = this.bookingFor(slot);
    return b && (b.status === 'pending' || b.status === 'confirmed') ? b.studentName : '';
  }

  isPastSlot(slot: string) {
    // Якщо обрано сьогодні — все минуле (ми взагалі не показуємо слоти, але залишимо захист)
    const selected = dayjs(this.date()).startOf('day');
    const now = dayjs();
    if (selected.isBefore(now.startOf('day'))) return true;
    if (selected.isSame(now.startOf('day'))) return true; // бронювання на сьогодні заборонене
    const [hh, mm] = slot.split(':').map(Number);
    return selected.hour(hh).minute(mm).isBefore(now);
  }

  statusOf(slot: string) {
    const id = this.idOf(slot);
    if (this.optimistic()[id]) return this.optimistic()[id];
    return this.bookingFor(slot)?.status;
  }

  // Лейбл: Вільно / В обробці — Ім’я / Зайнято — Ім’я / Минуло
  statusLabel(slot: string) {
    const s = this.statusOf(slot);
    const who = this.nameOf(slot);
    if (s === 'pending') return who ? `В обробці — ${who}` : 'В обробці';
    if (s === 'confirmed') return who ? `Зайнято — ${who}` : 'Зайнято';
    return this.isPastSlot(slot) ? 'Минуло' : 'Вільно';
  }

  slotClass(slot: string) {
    if (this.isPastSlot(slot)) return 'past';
    const s = this.statusOf(slot);
    if (!s || s === 'canceled') return this.selectedSlot() === slot ? 'selected' : 'free';
    return s; // 'pending' | 'confirmed'
  }

  selectSlot(slot: string) {
    // Заборона для сьогоднішньої дати
    if (this.isSelectedToday()) return;
    if (this.isPastSlot(slot)) return;
    const s = this.statusOf(slot);
    if (s === 'pending' || s === 'confirmed') return; // зайнято
    this.selectedSlot.set(slot === this.selectedSlot() ? null : slot);
  }

  private validEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }

  async bookSelected() {
    this.message.set(null);
    const slot = this.selectedSlot();
    const studentName = this.name().trim();
    const email =
      this.wantEmail() && this.validEmail(this.email()) ? this.email().trim() : undefined;

    if (!slot) { this.message.set('Оберіть час'); return; }
    if (!studentName) { this.message.set('Вкажіть ім’я'); return; }
    if (this.wantEmail() && !email) { this.message.set('Вкажіть коректний e-mail або вимкніть опцію'); return; }
    // Захист: взагалі не бронюємо сьогодні
    if (dayjs(this.date()).isSame(dayjs(), 'day')) { this.message.set('Бронювання на сьогодні недоступне'); return; }
    if (this.isPastSlot(slot)) { this.message.set('Не можна бронювати минулий час'); return; }

    const id = this.idOf(slot);
    // оптимістично показуємо “В обробці”
    this.optimistic.set({ ...this.optimistic(), [id]: 'pending' });

    try {
      await this.bookings.createPending(this.dateStr(), slot, studentName, email);
      if (email) await this.emailSvc.sendReceived(email, studentName, this.dateStr(), slot);
      this.snack.open('Заявку надіслано. Очікуйте підтвердження тренера.', 'OK', { duration: 3000 });
      this.selectedSlot.set(null);
    } catch (e: any) {
      const cur = { ...this.optimistic() }; delete cur[id]; this.optimistic.set(cur);
      const msg = e?.message ?? 'Помилка бронювання';
      this.message.set(msg);
      this.snack.open(msg, 'OK', { duration: 3000 });
    }
  }
}
