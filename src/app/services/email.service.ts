import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';
import { environment } from '../../environments/environment';

type EmailJsConfig = {
  publicKey: string;
  serviceId: string;
  templates: {
    received: string;
    status: string;
  };
  adminEmail?: string; // <-- опційне
};

@Injectable({ providedIn: 'root' })
export class EmailService {
  private cfg: EmailJsConfig = environment.emailjs as EmailJsConfig;

  constructor() {
    if (this.cfg?.publicKey) {
      try { emailjs.init({ publicKey: this.cfg.publicKey }); } catch { /* ignore */ }
    }
  }

  private enabled(): boolean {
    return !!this.cfg?.publicKey && !!this.cfg?.serviceId;
  }

  private async send(templateId: string, params: Record<string, any>) {
    if (!this.enabled()) return;
    await emailjs.send(this.cfg.serviceId, templateId, params, {
      publicKey: this.cfg.publicKey,
    });
  }

  /** 1) Лист "Заявку отримано" */
  async sendReceived(toEmail: string, studentName: string, date: string, time: string) {
    const subject = `Заявку отримано — ${date} о ${time}`;
    await this.send(this.cfg.templates.received, {
      to_email: toEmail,
      student_name: studentName,
      date,
      time,
      subject,
      admin_email: this.cfg.adminEmail ?? ''  // безпечно, якщо не задано
    });
  }

  /** 2) Лист "Зміна статусу" */
  async sendStatus(
    toEmail: string,
    studentName: string,
    date: string,
    time: string,
    status: 'confirmed' | 'canceled'
  ) {
    const status_title = status === 'confirmed' ? 'Підтверджено' : 'Скасовано';
    const subject = `Статус запису: ${status_title} — ${date} о ${time}`;
    await this.send(this.cfg.templates.status, {
      to_email: toEmail,
      student_name: studentName,
      date,
      time,
      status,
      status_title,
      subject,
      admin_email: this.cfg.adminEmail ?? ''
    });
  }
}
