import { format } from 'date-fns';

interface BulletinConfig {
  churchName: string;
  pastorName: string;
  churchAddress: string;
  churchPhone: string;
  churchWebsite: string;
  bulletinDate: string;
  includePrayers: boolean;
  includeEvents: boolean;
  includeAnnouncements: boolean;
  prayers: Array<{ subject: string; details?: string | null }>;
  events: Array<{ title: string; start_at: string; is_all_day?: boolean; location?: string | null; description?: string | null }>;
  announcements: Array<{ title: string; body?: string | null }>;
  scheduleItems: Array<{ day: string; time: string; activity: string }>;
  customSections: Array<{ enabled: boolean; title: string; content: string }>;
}

const BULLETIN_CSS = `@page{size:5.5in 8.5in;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;font-size:10pt;line-height:1.35;background:#fff;width:100%;margin:0;padding:0}.page{width:100%;min-height:100vh;padding:.4in .45in;overflow:hidden;position:relative;page-break-after:always;box-sizing:border-box}.bulletin-header{text-align:center;padding-bottom:8px;margin-bottom:12px;border-bottom:2.5px solid #2c2c2c}.bulletin-header h1{font-size:18pt;font-weight:700;letter-spacing:1px;margin-bottom:3px;color:#1a1a1a}.bulletin-header .pastor{font-size:9.5pt;color:#444;margin-bottom:1px}.bulletin-header .address{font-size:8.5pt;color:#666;margin-bottom:1px}.bulletin-header .contact{font-size:8.5pt;color:#666;margin-bottom:3px}.bulletin-header .date{font-size:10.5pt;color:#555;font-style:italic;margin-top:4px}.back-header{text-align:center;padding-bottom:8px;margin-bottom:12px;border-bottom:2.5px solid #2c2c2c}.back-header h1{font-size:14pt;font-weight:700;letter-spacing:1px;margin-bottom:2px;color:#1a1a1a}.back-header .subtitle{font-size:12pt;color:#444;font-style:italic;font-weight:600}.front-content{columns:2;column-gap:16px;column-rule:1px solid #d0d0d0}.section{margin-bottom:12px;break-inside:avoid}.section h2{font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #999;padding-bottom:3px;margin-bottom:6px;color:#2c2c2c}.prayer-list{list-style:none;padding:0;columns:2;column-gap:20px}.prayer-list li{padding:2.5px 0 2.5px 12px;position:relative;font-size:9.5pt;line-height:1.4;break-inside:avoid}.prayer-list li::before{content:"\\2022";position:absolute;left:0;color:#666}.prayer-detail{color:#555;font-style:italic;font-size:8.5pt}.event-item{margin-bottom:7px;padding-left:7px;border-left:2.5px solid #999}.event-item strong{font-size:9.5pt;display:block}.event-meta{font-size:8pt;color:#666;display:block}.event-desc{font-size:8pt;color:#555;margin-top:2px}.announcement-item{margin-bottom:7px}.announcement-item h3{font-size:9.5pt;font-weight:700;margin-bottom:2px}.announcement-item p{font-size:9pt;color:#444;line-height:1.35}.schedule-table{width:100%;border-collapse:collapse}.schedule-day-row td{padding-top:4px}.schedule-day{font-weight:700;font-size:9.5pt;color:#2c2c2c;border-bottom:1px dotted #aaa;padding-bottom:2px}.schedule-time{width:70px;font-size:9pt;color:#555;padding:2px 6px 2px 8px;vertical-align:top}.schedule-activity{font-size:9.5pt;padding:2px 0}.custom-content{font-size:9.5pt;line-height:1.4}@media print{body{-webkit-print-color-adjust:exact;width:100%;margin:0;padding:0}.page{width:100%;height:100vh;page-break-after:always;padding:.4in .45in;box-sizing:border-box}}`;

export function generateBulletinHTML(config: BulletinConfig): string {
  const {
    churchName, pastorName, churchAddress, churchPhone, churchWebsite,
    bulletinDate, includePrayers, includeEvents, includeAnnouncements,
    prayers, events, announcements, scheduleItems, customSections,
  } = config;

  const dateStr = bulletinDate || format(new Date(), 'MMMM d, yyyy');

  let prayerListHTML = '';
  if (includePrayers && prayers.length > 0) {
    const items = prayers.map(p =>
      `<li>${p.subject}${p.details ? ` — <span class="prayer-detail">${p.details}</span>` : ''}</li>`
    ).join('');
    prayerListHTML = `<div class="section prayer-section"><h2>Prayer List</h2><ul class="prayer-list">${items}</ul></div>`;
  }

  let eventsHTML = '';
  if (includeEvents && events.length > 0) {
    const items = events.map(e => {
      const d = new Date(e.start_at);
      const df = format(d, 'EEE, MMM d');
      const tf = e.is_all_day ? 'All Day' : format(d, 'h:mm a');
      return `<div class="event-item"><strong>${e.title}</strong><span class="event-meta">${df} · ${tf}${e.location ? ` · ${e.location}` : ''}</span>${e.description ? `<p class="event-desc">${e.description}</p>` : ''}</div>`;
    }).join('');
    eventsHTML = `<div class="section events-section"><h2>Upcoming Events</h2>${items}</div>`;
  }

  let announcementsHTML = '';
  if (includeAnnouncements && announcements.length > 0) {
    const items = announcements.map(a =>
      `<div class="announcement-item"><h3>${a.title}</h3>${a.body ? `<p>${a.body}</p>` : ''}</div>`
    ).join('');
    announcementsHTML = `<div class="section announcements-section"><h2>Announcements</h2>${items}</div>`;
  }

  let scheduleHTML = '';
  if (scheduleItems.length > 0) {
    const grouped: Record<string, { time: string; activity: string }[]> = {};
    scheduleItems.forEach(item => {
      if (!item.day && !item.activity) return;
      const day = item.day || 'Other';
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push({ time: item.time, activity: item.activity });
    });
    if (Object.keys(grouped).length > 0) {
      const rows = Object.entries(grouped).map(([day, items]) => {
        const ir = items.map(i => `<tr><td class="schedule-time">${i.time}</td><td class="schedule-activity">${i.activity}</td></tr>`).join('');
        return `<tr class="schedule-day-row"><td colspan="2" class="schedule-day">${day}</td></tr>${ir}`;
      }).join('');
      scheduleHTML = `<div class="section schedule-section"><h2>Weekly Schedule</h2><table class="schedule-table">${rows}</table></div>`;
    }
  }

  let customHTML = '';
  const enabled = customSections.filter(s => s.enabled && (s.title || s.content));
  if (enabled.length > 0) {
    customHTML = enabled.map(s =>
      `<div class="section custom-section">${s.title ? `<h2>${s.title}</h2>` : ''}<div class="custom-content">${s.content.replace(/\n/g, '<br/>')}</div></div>`
    ).join('');
  }

  const contactParts = [churchPhone, churchWebsite].filter(Boolean).join(' · ');
  const header = `<div class="bulletin-header"><h1>${churchName}</h1>${pastorName ? `<div class="pastor">Pastor ${pastorName}</div>` : ''}${churchAddress ? `<div class="address">${churchAddress}</div>` : ''}${contactParts ? `<div class="contact">${contactParts}</div>` : ''}<div class="date">${dateStr}</div></div>`;

  const frontPage = `<div class="page front-page">${header}<div class="front-content">${scheduleHTML}${announcementsHTML}${eventsHTML}${customHTML}</div></div>`;
  const backPage = includePrayers && prayers.length > 0
    ? `<div class="page back-page"><div class="back-header"><h1>${churchName}</h1><div class="subtitle">Prayer List</div></div>${prayerListHTML}</div>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${BULLETIN_CSS}</style></head><body>${frontPage}${backPage}</body></html>`;
}
