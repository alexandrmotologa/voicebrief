export function getGoogleCalendarUrl(task: string, deadline?: string, noteTitle?: string): string {
  const title = encodeURIComponent(`[VoiceBrief] ${task}`);
  const details = encodeURIComponent(
    `Action item from audio sync: ${noteTitle || 'Voice Note'}\nTask: ${task}${
      deadline ? `\nDeadline: ${deadline}` : ''
    }`
  );

  // Default to tomorrow 10:00 AM UTC if deadline cannot be strictly parsed
  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  startDate.setUTCHours(9, 0, 0, 0);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const formatIso = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
  const dates = `${formatIso(startDate)}/${formatIso(endDate)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`;
}

export function downloadIcsFile(task: string, deadline?: string, noteTitle?: string): void {
  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  startDate.setUTCHours(9, 0, 0, 0);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const formatIcsDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';

  const uid = `voicebrief-${Date.now()}@voicebrief.local`;
  const summary = `[VoiceBrief] ${task}`;
  const description = `Action item from: ${noteTitle || 'Voice Note'}\\nTask: ${task}\\nDeadline: ${deadline || 'N/A'}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VoiceBrief//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `task-${task.toLowerCase().slice(0, 20).replace(/[^a-z0-9]/g, '-')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
