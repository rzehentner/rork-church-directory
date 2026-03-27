import PageEditor from '@/components/admin/PageEditor';

export default function AdminNewPagePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-dark mb-6">Create New Page</h1>
      <PageEditor isNew />
    </div>
  );
}
