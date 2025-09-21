import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmailService {
  private cfg = environment.emailjs;

  private enabled(): boolean {
    return !!this.cfg?.publicKey && !!this.cfg?.serviceId;
  }

  private async send(templateId: string, params: Record<string, any>) {
    if (!this.enabled()) return; // не налаштовано — мовчки пропускаємо
    await emailjs.send(this.cfg.serviceId, templateId, params, {
      publicKey: this.cfg.publicKey,
    });
  }

  /** 1) Лист "Заявку отримано" */
  async sendReceived(to: string, studentName: string, date: string, slot: string) {
    const subject = `Заявку отримано — ${date} о ${slot}`;
    await this.send(this.cfg.templates.received, {
      to_email: to,
      studentName,
      date,
      slot,
      subject,
    });
  }

  /** 2) Лист "Зміна статусу" (підтверджено/скасовано) */
  async sendStatus(
    to: string,
    studentName: string,
    date: string,
    slot: string,
    status: 'confirmed' | 'canceled'
  ) {
    const status_title = status === 'confirmed' ? 'Підтверджено' : 'Скасовано';
    const subject = `Статус запису: ${status_title} — ${date} о ${slot}`;
    await this.send(this.cfg.templates.status, {
      to_email: to,
      studentName,
      date,
      slot,
      status,
      status_title,
      subject,
    });
  }
}
