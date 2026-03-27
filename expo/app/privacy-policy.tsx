import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

const EFFECTIVE_DATE = 'February 25, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bullet}>{'\u2022'}</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Privacy Policy',
          headerStyle: { backgroundColor: Colors.warmWhite },
          headerTintColor: Colors.navyDark,
          headerTitleStyle: { fontWeight: '600', color: Colors.navyDark },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Privacy Policy</Text>
        <Text style={styles.subtitle}>EBC Connect — Edna Baptist Church</Text>
        <Text style={styles.effectiveDate}>Effective date: {EFFECTIVE_DATE}</Text>

        <Section title="Introduction">
          <Paragraph>
            EBC Connect ("the App") is a private community application built for and operated by
            Edna Baptist Church ("the Church", "we", "us", "our"). This Privacy Policy explains
            what information we collect, how we use it, and your rights regarding your data.
          </Paragraph>
          <Paragraph>
            By creating an account or using the App, you agree to the collection and use of
            information as described in this policy.
          </Paragraph>
        </Section>

        <Section title="Information We Collect">
          <Paragraph>
            We collect the following categories of personal information when you register and use
            the App:
          </Paragraph>
          <Text style={styles.subheading}>Account Information</Text>
          <BulletList items={[
            'Email address (used for login and account recovery)',
            'Password (stored securely via Supabase Auth; we never have access to your plaintext password)',
          ]} />
          <Text style={styles.subheading}>Profile Information</Text>
          <BulletList items={[
            'First and last name',
            'Phone number (optional)',
            'Mailing address (optional)',
            'Profile photo (optional)',
            'Family group membership',
          ]} />
          <Text style={styles.subheading}>Content You Create</Text>
          <BulletList items={[
            'Prayer requests and prayer activity',
            'Event RSVPs and attendance',
            'Signup form responses',
            'Potluck item commitments',
            'Announcements (if you have posting privileges)',
          ]} />
          <Text style={styles.subheading}>Device and Usage Information</Text>
          <BulletList items={[
            'Push notification tokens (for delivering notifications to your device)',
            'Device platform (iOS, Android, or web) for platform-specific functionality',
          ]} />
        </Section>

        <Section title="How We Use Your Information">
          <Paragraph>Your information is used exclusively to operate the App and serve the church community:</Paragraph>
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
          <Paragraph>
            EBC Connect is a private, membership-based application. Access to the App requires
            account approval by a church administrator.
          </Paragraph>
          <BulletList items={[
            'Your profile information (name, phone, address, photo) is visible to other approved church members through the directory',
            'Prayer requests you submit are visible to other approved members',
            'Church administrators and leaders have additional access to manage users, events, and content',
            'Your email address is not displayed to other members',
          ]} />
        </Section>

        <Section title="Data Storage and Security">
          <Paragraph>
            Your data is stored securely using Supabase, a cloud database platform with
            industry-standard security practices including:
          </Paragraph>
          <BulletList items={[
            'Encrypted data transmission (HTTPS/TLS)',
            'Row-level security policies that restrict data access at the database level',
            'Secure password hashing (bcrypt)',
            'Biometric authentication support (Face ID / Touch ID) for additional device-level security',
            'Photos and files are stored in Supabase Storage with access controls',
          ]} />
          <Paragraph>
            While we implement reasonable security measures, no method of electronic storage or
            transmission is 100% secure. We cannot guarantee absolute security of your data.
          </Paragraph>
        </Section>

        <Section title="Third-Party Services">
          <Paragraph>The App uses the following third-party services:</Paragraph>
          <BulletList items={[
            'Supabase — Authentication, database, and file storage',
            'Expo / EAS — App distribution and over-the-air updates',
            'Apple Push Notification Service (APNs) — Push notifications on iOS',
            'Firebase Cloud Messaging (FCM) — Push notifications on Android',
          ]} />
          <Paragraph>
            These services have their own privacy policies governing how they handle data. We do
            not sell, rent, or share your personal information with third parties for marketing
            purposes.
          </Paragraph>
        </Section>

        <Section title="Data Retention">
          <Paragraph>
            We retain your personal data for as long as your account is active and you are a
            member of the church community. If you leave the church or request account deletion,
            we will delete your account and associated personal data within 30 days.
          </Paragraph>
          <Paragraph>
            Some information may be retained in anonymized or aggregated form for church
            record-keeping purposes (e.g., event attendance counts).
          </Paragraph>
        </Section>

        <Section title="Your Rights">
          <Paragraph>You have the right to:</Paragraph>
          <BulletList items={[
            'Access the personal information we hold about you',
            'Update or correct your profile information at any time through the App',
            'Request deletion of your account and associated data',
            'Opt out of push notifications through your device settings or the App\'s notification preferences',
            'Request a copy of your data by contacting the church office',
          ]} />
          <Paragraph>
            To exercise any of these rights, please contact the church office or a church
            administrator through the App.
          </Paragraph>
        </Section>

        <Section title="Children's Privacy">
          <Paragraph>
            The App is intended for use by members of Edna Baptist Church and their families.
            We do not knowingly collect personal information from children under 13 without
            parental consent. Family accounts may include information about minors as part of
            family group membership, which is managed by a parent or guardian.
          </Paragraph>
        </Section>

        <Section title="Changes to This Policy">
          <Paragraph>
            We may update this Privacy Policy from time to time. When we make changes, we will
            update the "Effective date" at the top of this page and notify users through the App.
            Your continued use of the App after changes are posted constitutes your acceptance
            of the updated policy.
          </Paragraph>
        </Section>

        <Section title="Contact Us">
          <Paragraph>
            If you have questions or concerns about this Privacy Policy or your personal data,
            please contact us:
          </Paragraph>
          <Paragraph>
            Edna Baptist Church{'\n'}
            Email: office@ednabc.org{'\n'}
            Website: ednabaptist.church
          </Paragraph>
        </Section>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmWhite,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.navyDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.steelBlue,
    marginBottom: 4,
  },
  effectiveDate: {
    fontSize: 13,
    color: Colors.text.muted,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.navyDark,
    marginBottom: 10,
  },
  subheading: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 22,
    marginBottom: 10,
  },
  bulletList: {
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: 4,
    marginBottom: 6,
  },
  bullet: {
    fontSize: 14,
    color: Colors.steelBlue,
    marginRight: 8,
    lineHeight: 22,
  },
  bulletText: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 22,
    flex: 1,
  },
  bottomSpacing: {
    height: 40,
  },
});
