# Changelog

All notable changes to EBC Connect will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-03-03

### Added
- "View Responses" button on signup form cards for admins and leaders
- Privacy policy screen accessible from Settings

### Fixed
- Directory modal scroll and keyboard handling improvements
- Biometric authentication dynamic import fix
- Supabase client no longer crashes on missing env vars during build

## [1.0.1] - 2026-02-26

### Added
- ProGuard/R8 deobfuscation mapping included in Android App Bundle for better crash reporting
- Privacy policy screen

### Changed
- Removed unnecessary Android media permissions (READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_MEDIA_AUDIO, READ_MEDIA_VISUAL_USER_SELECTED) in favor of Android photo picker
- Removed deprecated READ_EXTERNAL_STORAGE and WRITE_EXTERNAL_STORAGE permissions

### Fixed
- Supabase client configuration improvements

## [1.0.0] - 2026-02-26

### Added
- Initial release of EBC Connect
- Dashboard with personalized greeting, stats, and quick actions
- Event management with interactive calendar, RSVP, and device calendar export
- Prayer request feed with pray tracking and status management
- Announcements with tag-based organization and read status
- Church member and family directory with search and filtering
- Family group creation, join via token, and member management
- Signup forms and potluck coordination
- Push notifications with per-category preferences
- Biometric authentication (fingerprint/Face ID) on mobile
- Email and magic link authentication
- Role-based access control (Visitor, Member, Leader, Admin)
- Admin panel with member approval queue, tag management, and church settings
- Cross-platform support (iOS, Android, Web)
- OTA updates via EAS Update
