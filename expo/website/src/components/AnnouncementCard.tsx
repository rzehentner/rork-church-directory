import Image from 'next/image';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { PublicAnnouncement } from '@/types';
import { storageUrl } from '@/lib/utils';

interface AnnouncementCardProps {
  announcement: PublicAnnouncement;
}

export default function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const imageUrl = storageUrl(announcement.image_path);
  const timeAgo = formatDistanceToNow(parseISO(announcement.published_at), { addSuffix: true });

  return (
    <article className="bg-white rounded-xl overflow-hidden border border-cream shadow-sm hover:shadow-md transition-shadow">
      {imageUrl && (
        <div className="relative h-40">
          <Image src={imageUrl} alt={announcement.title} fill className="object-cover" />
        </div>
      )}
      <div className="p-5">
        <p className="text-xs text-steel uppercase tracking-wider">{timeAgo}</p>
        <h3 className="font-bold text-navy-dark text-lg mt-1">{announcement.title}</h3>
        {announcement.body && (
          <p className="text-navy-dark/60 text-sm mt-2 line-clamp-3">{announcement.body}</p>
        )}
      </div>
    </article>
  );
}
