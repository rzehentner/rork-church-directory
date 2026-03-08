export interface ChurchSettings {
  id: string;
  name: string | null;
  pastor: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  service_times: ServiceTime[] | null;
}

export interface ServiceTime {
  day: string;
  time: string;
  label: string;
}

export interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  image_path: string | null;
}

export interface PublicAnnouncement {
  id: string;
  title: string;
  body: string | null;
  image_path: string | null;
  published_at: string;
}

export interface WebsiteContent {
  id: string;
  key: string;
  value: string;
  content_type: string;
}

export interface HeroImage {
  id: string;
  image_path: string;
  alt_text: string | null;
  sort_order: number;
}

export interface WebsitePage {
  id: string;
  slug: string;
  title: string;
  body: string;
  is_published: boolean;
  show_in_nav: boolean;
  sort_order: number;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffMember {
  id: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  public_email: string | null;
  public_phone: string | null;
  bio: string | null;
  photo_path: string | null;
  sort_order: number;
}
