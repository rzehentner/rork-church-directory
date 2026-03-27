import { getAllContent } from '@/lib/data';
import ContentEditor from '@/components/admin/ContentEditor';

export default async function AdminContentPage() {
  const items = await getAllContent();

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-dark mb-6">Content Blocks</h1>
      <p className="text-sm text-steel mb-6">
        Edit the text content that appears on the public website. Changes take effect within a few minutes.
      </p>
      <ContentEditor items={items} />
    </div>
  );
}
