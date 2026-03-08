import type { Metadata } from 'next';
import { getStaff } from '@/lib/data';
import SectionHeading from '@/components/SectionHeading';

export const metadata: Metadata = { title: 'Our Staff' };
export const revalidate = 300;

function StaffPhotoPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(part => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full aspect-square bg-navy/10 flex items-center justify-center rounded-xl">
      <svg
        className="absolute inset-0 w-full h-full text-navy/5"
        fill="currentColor"
        viewBox="0 0 200 200"
        aria-hidden="true"
      >
        <circle cx="100" cy="100" r="100" />
      </svg>
      <span className="relative text-4xl font-bold text-navy/40 select-none">
        {initials || (
          <svg className="w-16 h-16 text-navy/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        )}
      </span>
    </div>
  );
}

export default async function StaffPage() {
  const staff = await getStaff();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <>
      <section
        className="py-16 sm:py-20 text-center"
        style={{ background: 'linear-gradient(135deg, #1A2744 0%, #2B4C7E 100%)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">Our Staff</h1>
          <div className="w-16 h-1 bg-gold mx-auto mt-4 rounded-full" />
          <p className="text-white/70 mt-4 text-lg">
            Meet the dedicated team serving Edna Baptist Church
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {staff.length === 0 ? (
            <div className="text-center py-16">
              <svg
                className="w-16 h-16 mx-auto text-cream"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="text-steel mt-4 text-lg">Staff information coming soon.</p>
            </div>
          ) : (
            <>
              <SectionHeading
                title="Meet Our Team"
                subtitle="Our staff is committed to serving God and our community with love and dedication."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {staff.map(member => {
                  const fullName = [member.first_name, member.last_name]
                    .filter(Boolean)
                    .join(' ');
                  const photoUrl = member.photo_path
                    ? `${supabaseUrl}/storage/v1/object/public/staff-photos/${member.photo_path}`
                    : null;

                  return (
                    <div
                      key={member.id}
                      className="bg-white rounded-2xl border border-cream overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="relative aspect-square bg-cream/50 overflow-hidden">
                        {photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoUrl}
                            alt={fullName || 'Staff member'}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <StaffPhotoPlaceholder name={fullName} />
                        )}
                      </div>

                      <div className="p-5">
                        {fullName && (
                          <h3 className="text-lg font-bold text-navy-dark">{fullName}</h3>
                        )}
                        {member.title && (
                          <p className="text-gold text-sm font-medium mt-0.5">{member.title}</p>
                        )}

                        {member.bio && (
                          <p className="text-steel text-sm mt-3 leading-relaxed line-clamp-4">
                            {member.bio}
                          </p>
                        )}

                        {(member.public_email || member.public_phone) && (
                          <div className="mt-4 pt-4 border-t border-cream space-y-1.5">
                            {member.public_email && (
                              <a
                                href={`mailto:${member.public_email}`}
                                className="flex items-center gap-2 text-sm text-navy hover:text-gold transition-colors"
                              >
                                <svg
                                  className="w-4 h-4 shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                  />
                                </svg>
                                <span className="truncate">{member.public_email}</span>
                              </a>
                            )}
                            {member.public_phone && (
                              <a
                                href={`tel:${member.public_phone}`}
                                className="flex items-center gap-2 text-sm text-navy hover:text-gold transition-colors"
                              >
                                <svg
                                  className="w-4 h-4 shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                  />
                                </svg>
                                <span>{member.public_phone}</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
