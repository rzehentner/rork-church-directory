import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { TZDate } from 'date-fns/tz';

const CHURCH_TZ = 'America/Chicago';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET = 'event-images';

export function storageUrl(path: string | null): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export function formatEventDate(startAt: string, endAt: string, isAllDay: boolean): string {
  const start = new TZDate(parseISO(startAt), CHURCH_TZ);
  const end = new TZDate(parseISO(endAt), CHURCH_TZ);

  if (isAllDay) {
    if (isToday(start)) return 'Today — All Day';
    if (isTomorrow(start)) return 'Tomorrow — All Day';
    return `${format(start, 'EEEE, MMMM d, yyyy')} — All Day`;
  }

  const dateStr = isToday(start)
    ? 'Today'
    : isTomorrow(start)
      ? 'Tomorrow'
      : format(start, 'EEEE, MMMM d, yyyy');

  const startTime = format(start, 'h:mm a');
  const endTime = format(end, 'h:mm a');

  return `${dateStr} · ${startTime} – ${endTime}`;
}

export function formatShortDate(dateStr: string): { month: string; day: string } {
  const date = new TZDate(parseISO(dateStr), CHURCH_TZ);
  return {
    month: format(date, 'MMM').toUpperCase(),
    day: format(date, 'd'),
  };
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function renderMarkdown(text: string): string {
  if (!text) return '';
  let html = text
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-navy underline hover:text-navy-light">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="my-2 space-y-1">$&</ul>');

  // Wrap remaining plain text lines in paragraphs
  html = html
    .split('\n\n')
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<')) return trimmed;
      return `<p class="mb-4 leading-relaxed">${trimmed}</p>`;
    })
    .join('\n');

  return html;
}
