export const environment = {
  firebase: {
    apiKey: 'AIzaSyBmyqcFGk_JFFRIlgH603JOzYb7iLgBpy4',
    authDomain: 'lesson-booking-fea5b.firebaseapp.com',
    projectId: 'lesson-booking-fea5b',
    storageBucket: 'lesson-booking-fea5b.firebasestorage.app',
    messagingSenderId: '12811495842',
    appId: '1:12811495842:web:eac5b5a9250ee9e4a1aafb',
  },

  timezone: 'Europe/Kyiv',
  booking: { start: '15:00', end: '20:00', slotMinutes: 30 },

  // EmailJS (заміни на свої дані)
  emailjs: {
    publicKey: 'xmz00v0tQp-JHr0-F',
    serviceId: 'service_ohctoic',
    templates: {
      received: 'tmpl_received', // шаблон "Заявку отримано"
      status: 'tmpl_status',     // шаблон "Зміна статусу"
    },
  },
};
