import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy' };
export const revalidate = 86400;

const EFFECTIVE_DATE = 'February 25, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-navy-dark mb-3">{title}</h2>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc ml-6 space-y-1.5 text-navy-dark/70 leading-relaxed">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <section
        className="py-16 sm:py-20 text-center"
        style={{ background: 'linear-gradient(135deg, #1A2744 0%, #2B4C7E 100%)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">Privacy Policy</h1>
          <div className="w-16 h-1 bg-gold mx-auto mt-4 rounded-full" />
          <p className="text-white/70 mt-4">EBC Connect — Edna Baptist Church</p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <p className="text-steel text-sm mb-10">Effective date: {EFFECTIVE_DATE}</p>

          <Section title="Introduction">
            <p className="text-navy-dark/70 leading-relaxed mb-3">
              EBC Connect (&ldquo;the App&rdquo;) is a private community application built for and operated by Edna Baptist Church (&ldquo;the Church&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.
            </p>
            <p className="text-navy-dark/70 leading-relaxed">
              By creating an account or using the App, you agree to the collection and use of information as described in this policy.
            </p>
          </Section>

          <Section title="Information We Collect">
            <p className="text-navy-dark/70 leading-relaxed mb-3">We collect the following categories of personal information when you register and use the App:</p>
            <h3 className="font-semibold text-navy mb-2 mt-4">Account Information</h3>
            <BulletList items={['Email address (used for login and account recovery)', 'Password (stored securely via Supabase Auth; we never have access to your plaintext password)']} />
            <h3 className="font-semibold text-navy mb-2 mt-4">Profile Information</h3>
            <BulletList items={['First and last name', 'Phone number (optional)', 'Mailing address (optional)', 'Profile photo (optional)', 'Family group membership']} />
            <h3 className="font-semibold text-navy mb-2 mt-4">Content You Create</h3>
            <BulletList items={['Prayer requests and prayer activity', 'Event RSVPs and attendance', 'Signup form responses', 'Potluck item commitments', 'Announcements (if you have posting privileges)']} />
            <h3 className="font-semibold text-navy mb-2 mt-4">Device and Usage Information</h3>
            <BulletList items={['Push notification tokens (for delivering notifications to your device)', 'Device platform (iOS, Android, or web) for platform-specific functionality']} />
          </Section>

          <Section title="How We Use Your Information">
            <p className="text-navy-dark/70 leading-relaxed mb-3">Your information is used exclusively to operate the App and serve the church community:</p>
            <BulletList items={[
              'Authenticate your identity and manage your account',
              'Display your name and photo in the church directory (visible only to approved members)',
              'Deliver push notifications about events, announcements, and prayer requests',
              'Enable event management, RSVPs, and attendance tracking',
              'Facilitate prayer request sharing within the church community',
              'Manage family groups and household connections',
              'Generate church bulletins and reports for church leadership',
            ]} />
          </Section>

          <Section title="Who Can See Your Information">
            <p className="text-navy-dark/70 leading-relaxed mb-3">EBC Connect is a private, membership-based application. Access to the App requires account approval by a church administrator.</p>
            <BulletList items={[
              'Your profile information (name, phone, address, photo) is visible to other approved church members through the directory',
              'Prayer requests you submit are visible to other approved members',
              'Church administrators and leaders have additional access to manage users, events, and content',
              'Your email address is not displayed to other members',
            ]} />
          </Section>

          <Section title="Data Storage and Security">
            <p className="text-navy-dark/70 leading-relaxed mb-3">Your data is stored securely using Supabase, a cloud database platform with industry-standard security practices including:</p>
            <BulletList items={[
              'Encrypted data transmission (HTTPS/TLS)',
              'Row-level security policies that restrict data access at the database level',
              'Secure password hashing (bcrypt)',
              'Biometric authentication support (Face ID / Touch ID) for additional device-level security',
              'Photos and files are stored in Supabase Storage with access controls',
            ]} />
            <p className="text-navy-dark/70 leading-relaxed mt-3">While we implement reasonable security measures, no method of electronic storage or transmission is 100% secure. We cannot guarantee absolute security of your data.</p>
          </Section>

          <Section title="Third-Party Services">
            <p className="text-navy-dark/70 leading-relaxed mb-3">The App uses the following third-party services:</p>
            <BulletList items={[
              'Supabase — Authentication, database, and file storage',
              'Expo / EAS — App distribution and over-the-air updates',
              'Apple Push Notification Service (APNs) — Push notifications on iOS',
              'Firebase Cloud Messaging (FCM) — Push notifications on Android',
            ]} />
            <p className="text-navy-dark/70 leading-relaxed mt-3">These services have their own privacy policies governing how they handle data. We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
          </Section>

          <Section title="Data Retention">
            <p className="text-navy-dark/70 leading-relaxed mb-3">We retain your personal data for as long as your account is active and you are a member of the church community. If you leave the church or request account deletion, we will delete your account and associated personal data within 30 days.</p>
            <p className="text-navy-dark/70 leading-relaxed">Some information may be retained in anonymized or aggregated form for church record-keeping purposes (e.g., event attendance counts).</p>
          </Section>

          <Section title="Your Rights">
            <p className="text-navy-dark/70 leading-relaxed mb-3">You have the right to:</p>
            <BulletList items={[
              'Access the personal information we hold about you',
              'Update or correct your profile information at any time through the App',
              'Request deletion of your account and associated data',
              'Opt out of push notifications through your device settings or the App\'s notification preferences',
              'Request a copy of your data by contacting the church office',
            ]} />
            <p className="text-navy-dark/70 leading-relaxed mt-3">To exercise any of these rights, please contact the church office or a church administrator through the App.</p>
          </Section>

          <Section title="Children's Privacy">
            <p className="text-navy-dark/70 leading-relaxed">The App is intended for use by members of Edna Baptist Church and their families. We do not knowingly collect personal information from children under 13 without parental consent. Family accounts may include information about minors as part of family group membership, which is managed by a parent or guardian.</p>
          </Section>

          <Section title="Changes to This Policy">
            <p className="text-navy-dark/70 leading-relaxed">We may update this Privacy Policy from time to time. When we make changes, we will update the &ldquo;Effective date&rdquo; at the top of this page and notify users through the App. Your continued use of the App after changes are posted constitutes your acceptance of the updated policy.</p>
          </Section>

          <Section title="Contact Us">
            <p className="text-navy-dark/70 leading-relaxed">If you have questions or concerns about this Privacy Policy or your personal data, please contact us:</p>
            <p className="text-navy-dark/70 leading-relaxed mt-2">
              Edna Baptist Church<br />
              Email: office@ednabc.org<br />
              Website: ednabaptist.church
            </p>
          </Section>
        </div>
      </section>
    </>
  );
}
