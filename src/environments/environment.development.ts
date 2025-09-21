export const environment = {
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },

  timezone: 'Europe/Kyiv',
  booking: { start: '15:00', end: '20:00', slotMinutes: 30 },

  // EmailJS (заміни на свої дані)
  emailjs: {
    publicKey: '',
    serviceId: '',
    templates: {
      received: , // шаблон "Заявку отримано"
      status: '',     // шаблон "Зміна статусу"
    },
  },
};
