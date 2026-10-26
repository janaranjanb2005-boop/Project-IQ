import crypto from 'crypto';

export function generateGoogleMeetLink(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const segment = (len: number) => {
    let s = '';
    for (let i = 0; i < len; i++) {
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return s;
  };
  return `https://meet.google.com/${segment(3)}-${segment(4)}-${segment(3)}`;
}

export function generateRandomReviewDate(minDays: number = 2, maxDays: number = 10): string {
  const d = new Date();
  const dayOffset = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
  d.setDate(d.getDate() + dayOffset);

  // If weekend, adjust to weekday
  const dayOfWeek = d.getDay();
  if (dayOfWeek === 6) {
    d.setDate(d.getDate() + 2);
  } else if (dayOfWeek === 0) {
    d.setDate(d.getDate() + 1);
  }

  // Pick realistic business meeting slots between 09:00 AM and 05:00 PM
  const possibleHours = [9, 10, 11, 13, 14, 15, 16];
  const possibleMinutes = [0, 15, 30, 45];

  const randomHour = possibleHours[Math.floor(Math.random() * possibleHours.length)];
  const randomMinute = possibleMinutes[Math.floor(Math.random() * possibleMinutes.length)];

  d.setHours(randomHour, randomMinute, 0, 0);
  return d.toISOString();
}

export function calculateReviewDate(daysFromNow?: number): string {
  if (daysFromNow !== undefined) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);

    // If weekend, shift to Monday
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 6) d.setDate(d.getDate() + 2);
    else if (dayOfWeek === 0) d.setDate(d.getDate() + 1);

    const possibleHours = [9, 10, 11, 13, 14, 15, 16];
    const possibleMinutes = [0, 15, 30, 45];
    const randomHour = possibleHours[Math.floor(Math.random() * possibleHours.length)];
    const randomMinute = possibleMinutes[Math.floor(Math.random() * possibleMinutes.length)];
    d.setHours(randomHour, randomMinute, 0, 0);
    return d.toISOString();
  }

  return generateRandomReviewDate(3, 9);
}

export function generateIcsCalendar(
  title: string,
  description: string,
  meetLink: string,
  startDateIso: string
): string {
  const start = new Date(startDateIso);
  const end = new Date(start.getTime() + 45 * 60 * 1000); // 45 min review

  const formatIcsTime = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Project IQ//Review Schedule Automation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@project-iq.app`,
    `DTSTAMP:${formatIcsTime(new Date())}`,
    `DTSTART:${formatIcsTime(start)}`,
    `DTEND:${formatIcsTime(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')} - Join Google Meet: ${meetLink}`,
    `LOCATION:${meetLink}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
