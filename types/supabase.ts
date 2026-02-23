export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcement_audience_tags: {
        Row: {
          announcement_id: string
          tag_id: string
        }
        Insert: {
          announcement_id: string
          tag_id: string
        }
        Update: {
          announcement_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_audience_tags_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_audience_tags_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements_for_me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_audience_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          person_id: string
          read_at: string
        }
        Insert: {
          announcement_id: string
          person_id: string
          read_at?: string
        }
        Update: {
          announcement_id?: string
          person_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements_for_me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_public: boolean
          is_published: boolean
          published_at: string | null
          roles_allowed: Database["public"]["Enums"]["user_role"][] | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_public?: boolean
          is_published?: boolean
          published_at?: string | null
          roles_allowed?: Database["public"]["Enums"]["user_role"][] | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_public?: boolean
          is_published?: boolean
          published_at?: string | null
          roles_allowed?: Database["public"]["Enums"]["user_role"][] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      church_settings: {
        Row: {
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          email: string | null
          id: string
          is_singleton: boolean
          name: string | null
          pastor: string | null
          phone: string | null
          service_times: Json | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          email?: string | null
          id?: string
          is_singleton?: boolean
          name?: string | null
          pastor?: string | null
          phone?: string | null
          service_times?: Json | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          email?: string | null
          id?: string
          is_singleton?: boolean
          name?: string | null
          pastor?: string | null
          phone?: string | null
          service_times?: Json | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          added_by: string | null
          event_id: string
          person_id: string
          responded_at: string
          status: Database["public"]["Enums"]["rsvp_status"]
        }
        Insert: {
          added_by?: string | null
          event_id: string
          person_id: string
          responded_at?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
        }
        Update: {
          added_by?: string | null
          event_id?: string
          person_id?: string
          responded_at?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_attendees_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "event_attendees_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_for_me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      event_audience_tags: {
        Row: {
          event_id: string
          tag_id: string
        }
        Insert: {
          event_id: string
          tag_id: string
        }
        Update: {
          event_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_audience_tags_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_audience_tags_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_for_me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_audience_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_at: string
          id: string
          image_path: string | null
          is_all_day: boolean
          is_public: boolean
          location: string | null
          roles_allowed: Database["public"]["Enums"]["user_role"][] | null
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_at: string
          id?: string
          image_path?: string | null
          is_all_day?: boolean
          is_public?: boolean
          location?: string | null
          roles_allowed?: Database["public"]["Enums"]["user_role"][] | null
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_at?: string
          id?: string
          image_path?: string | null
          is_all_day?: boolean
          is_public?: boolean
          location?: string | null
          roles_allowed?: Database["public"]["Enums"]["user_role"][] | null
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          created_at: string
          created_ip: unknown
          created_via: string | null
          family_join_token: string
          family_last_name: string | null
          family_name: string
          home_phone: string | null
          id: string
          last_name: string | null
          photo_path: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string
          created_ip?: unknown
          created_via?: string | null
          family_join_token?: string
          family_last_name?: string | null
          family_name: string
          home_phone?: string | null
          id?: string
          last_name?: string | null
          photo_path?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string
          created_ip?: unknown
          created_via?: string | null
          family_join_token?: string
          family_last_name?: string | null
          family_name?: string
          home_phone?: string | null
          id?: string
          last_name?: string | null
          photo_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_endpoints: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_seen: string
          platform: string | null
          provider: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen?: string
          platform?: string | null
          provider: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen?: string
          platform?: string | null
          provider?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_endpoints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_endpoints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notification_endpoints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          created_at: string
          email_enabled: boolean
          inapp_enabled: boolean
          mute_all: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          inapp_enabled?: boolean
          mute_all?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          inapp_enabled?: boolean
          mute_all?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_outbound: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          error: string | null
          id: string
          kind: Database["public"]["Enums"]["notif_kind"]
          scheduled_at: string
          status: Database["public"]["Enums"]["notif_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          error?: string | null
          id?: string
          kind: Database["public"]["Enums"]["notif_kind"]
          scheduled_at?: string
          status?: Database["public"]["Enums"]["notif_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          error?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notif_kind"]
          scheduled_at?: string
          status?: Database["public"]["Enums"]["notif_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_outbound_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_outbound_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_outbound_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      persons: {
        Row: {
          created_at: string
          created_ip: unknown
          created_via: string | null
          date_of_birth: string | null
          email: string | null
          family_id: string | null
          family_role: Database["public"]["Enums"]["family_role"]
          first_name: string
          id: string
          intake_status: string | null
          is_head_of_family: boolean
          is_spouse: boolean
          last_name: string
          phone: string | null
          photo_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_ip?: unknown
          created_via?: string | null
          date_of_birth?: string | null
          email?: string | null
          family_id?: string | null
          family_role?: Database["public"]["Enums"]["family_role"]
          first_name: string
          id?: string
          intake_status?: string | null
          is_head_of_family?: boolean
          is_spouse?: boolean
          last_name: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_ip?: unknown
          created_via?: string | null
          date_of_birth?: string | null
          email?: string | null
          family_id?: string | null
          family_role?: Database["public"]["Enums"]["family_role"]
          first_name?: string
          id?: string
          intake_status?: string | null
          is_head_of_family?: boolean
          is_spouse?: boolean
          last_name?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persons_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_prayed: {
        Row: {
          id: string
          prayed_at: string
          prayed_on: string
          prayer_id: string
          user_id: string
        }
        Insert: {
          id?: string
          prayed_at?: string
          prayed_on?: string
          prayer_id: string
          user_id: string
        }
        Update: {
          id?: string
          prayed_at?: string
          prayed_on?: string
          prayer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_prayed_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_prayed_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayer_requests_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_prayed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prayer_prayed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "prayer_prayed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_requests: {
        Row: {
          created_at: string
          created_by: string
          details: string | null
          for_person_id: string | null
          id: string
          is_anonymous: boolean
          status: Database["public"]["Enums"]["prayer_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          details?: string | null
          for_person_id?: string | null
          id?: string
          is_anonymous?: boolean
          status?: Database["public"]["Enums"]["prayer_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          details?: string | null
          for_person_id?: string | null
          id?: string
          is_anonymous?: boolean
          status?: Database["public"]["Enums"]["prayer_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prayer_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "prayer_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_for_person_id_fkey"
            columns: ["for_person_id"]
            isOneToOne: false
            referencedRelation: "person_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_for_person_id_fkey"
            columns: ["for_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          last_login: string | null
          person_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id: string
          last_login?: string | null
          person_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          last_login?: string | null
          person_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "person_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_form_fields: {
        Row: {
          field_key: string
          field_label: string
          field_type: Database["public"]["Enums"]["signup_field_type"]
          form_id: string
          id: string
          is_required: boolean
          is_standard: boolean
          options: Json | null
          placeholder: string | null
          sort_order: number
        }
        Insert: {
          field_key: string
          field_label: string
          field_type?: Database["public"]["Enums"]["signup_field_type"]
          form_id: string
          id?: string
          is_required?: boolean
          is_standard?: boolean
          options?: Json | null
          placeholder?: string | null
          sort_order?: number
        }
        Update: {
          field_key?: string
          field_label?: string
          field_type?: Database["public"]["Enums"]["signup_field_type"]
          form_id?: string
          id?: string
          is_required?: boolean
          is_standard?: boolean
          options?: Json | null
          placeholder?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "signup_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_form_summary"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "signup_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_forms: {
        Row: {
          allow_guest_signup: boolean
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          event_id: string | null
          form_type: Database["public"]["Enums"]["signup_form_type"]
          id: string
          is_active: boolean
          max_signups: number | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_guest_signup?: boolean
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          event_id?: string | null
          form_type?: Database["public"]["Enums"]["signup_form_type"]
          id?: string
          is_active?: boolean
          max_signups?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_guest_signup?: boolean
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          event_id?: string | null
          form_type?: Database["public"]["Enums"]["signup_form_type"]
          id?: string
          is_active?: boolean
          max_signups?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signup_forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "signup_forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "signup_forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events_for_me"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_item_claims: {
        Row: {
          claimant_name: string
          claimed_by: string | null
          created_at: string
          form_id: string
          id: string
          item_id: string
          note: string | null
          person_id: string | null
        }
        Insert: {
          claimant_name: string
          claimed_by?: string | null
          created_at?: string
          form_id: string
          id?: string
          item_id: string
          note?: string | null
          person_id?: string | null
        }
        Update: {
          claimant_name?: string
          claimed_by?: string | null
          created_at?: string
          form_id?: string
          id?: string
          item_id?: string
          note?: string | null
          person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signup_item_claims_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "signup_item_claims_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "signup_item_claims_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_item_claims_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_form_summary"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "signup_item_claims_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_item_claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "potluck_form_detail"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "signup_item_claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "signup_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_item_claims_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_item_claims_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_item_groups: {
        Row: {
          form_id: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          form_id: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          form_id?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "signup_item_groups_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_form_summary"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "signup_item_groups_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_items: {
        Row: {
          description: string | null
          form_id: string
          group_id: string
          id: string
          name: string
          quantity_needed: number
          sort_order: number
        }
        Insert: {
          description?: string | null
          form_id: string
          group_id: string
          id?: string
          name: string
          quantity_needed?: number
          sort_order?: number
        }
        Update: {
          description?: string | null
          form_id?: string
          group_id?: string
          id?: string
          name?: string
          quantity_needed?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "signup_items_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_form_summary"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "signup_items_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "potluck_form_detail"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "signup_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "signup_item_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_response_values: {
        Row: {
          field_id: string
          id: string
          response_id: string
          value: string | null
        }
        Insert: {
          field_id: string
          id?: string
          response_id: string
          value?: string | null
        }
        Update: {
          field_id?: string
          id?: string
          response_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signup_response_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "signup_form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_response_values_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "signup_response_detail"
            referencedColumns: ["response_id"]
          },
          {
            foreignKeyName: "signup_response_values_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "signup_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_responses: {
        Row: {
          created_at: string
          form_id: string
          id: string
          person_id: string | null
          respondent_email: string | null
          respondent_name: string
          respondent_phone: string | null
          status: Database["public"]["Enums"]["signup_status"]
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          person_id?: string | null
          respondent_email?: string | null
          respondent_name: string
          respondent_phone?: string | null
          status?: Database["public"]["Enums"]["signup_status"]
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          person_id?: string | null
          respondent_email?: string | null
          respondent_name?: string
          respondent_phone?: string | null
          status?: Database["public"]["Enums"]["signup_status"]
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signup_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_form_summary"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "signup_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_responses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_responses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_responses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "signup_responses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "signup_responses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      taggings: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          props: Json | null
          subject_id: string
          subject_kind: Database["public"]["Enums"]["tag_subject_kind"]
          tag_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          props?: Json | null
          subject_id: string
          subject_kind: Database["public"]["Enums"]["tag_subject_kind"]
          tag_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          props?: Json | null
          subject_id?: string
          subject_kind?: Database["public"]["Enums"]["tag_subject_kind"]
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taggings_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          assign_min_role: Database["public"]["Enums"]["user_role"]
          category: string | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          namespace: string | null
          parent_id: string | null
          self_assignable: boolean
          updated_at: string
        }
        Insert: {
          assign_min_role?: Database["public"]["Enums"]["user_role"]
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          namespace?: string | null
          parent_id?: string | null
          self_assignable?: boolean
          updated_at?: string
        }
        Update: {
          assign_min_role?: Database["public"]["Enums"]["user_role"]
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          namespace?: string | null
          parent_id?: string | null
          self_assignable?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      _is_approved: {
        Row: {
          user_id: string | null
        }
        Insert: {
          user_id?: string | null
        }
        Update: {
          user_id?: string | null
        }
        Relationships: []
      }
      announcements_for_me: {
        Row: {
          author_name: string | null
          body: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string | null
          is_public: boolean | null
          is_read: boolean | null
          person_tags: string[] | null
          published_at: string | null
          role_tags: Database["public"]["Enums"]["user_role"][] | null
          roles_allowed: Database["public"]["Enums"]["user_role"][] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events_for_me: {
        Row: {
          audience_tags: string[] | null
          author_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_at: string | null
          id: string | null
          image_path: string | null
          is_all_day: boolean | null
          is_attending: boolean | null
          is_public: boolean | null
          location: string | null
          my_rsvp: Database["public"]["Enums"]["rsvp_status"] | null
          roles_allowed: Database["public"]["Enums"]["user_role"][] | null
          start_at: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_directory_display: {
        Row: {
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          date_of_birth: string | null
          email: string | null
          family_id: string | null
          family_name_display: string | null
          family_role: Database["public"]["Enums"]["family_role"] | null
          first_name: string | null
          home_phone: string | null
          is_head_of_family: boolean | null
          is_spouse: boolean | null
          last_name: string | null
          person_id: string | null
          phone: string | null
          photo_url: string | null
        }
        Relationships: []
      }
      pending_approvals: {
        Row: {
          email: string | null
          family_name: string | null
          first_name: string | null
          last_name: string | null
          profile_id: string | null
          requested_at: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      person_with_tags: {
        Row: {
          email: string | null
          family_id: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          tag_names: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "persons_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      potluck_form_detail: {
        Row: {
          claim_count: number | null
          claims: Json | null
          deadline: string | null
          event_id: string | null
          form_id: string | null
          form_title: string | null
          group_id: string | null
          group_sort: number | null
          group_title: string | null
          is_active: boolean | null
          item_description: string | null
          item_id: string | null
          item_name: string | null
          item_sort: number | null
          quantity_needed: number | null
        }
        Relationships: [
          {
            foreignKeyName: "signup_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events_for_me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_items_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_form_summary"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "signup_items_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_requests_with_counts: {
        Row: {
          created_at: string | null
          created_by: string | null
          details: string | null
          for_person_id: string | null
          i_prayed_today: boolean | null
          id: string | null
          is_anonymous: boolean | null
          is_owner: boolean | null
          last_prayed_at: string | null
          status: Database["public"]["Enums"]["prayer_status"] | null
          subject: string | null
          total_prayers: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prayer_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prayer_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "prayer_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_for_person_id_fkey"
            columns: ["for_person_id"]
            isOneToOne: false
            referencedRelation: "person_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_for_person_id_fkey"
            columns: ["for_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_form_summary: {
        Row: {
          confirmed_count: number | null
          created_at: string | null
          deadline: string | null
          description: string | null
          event_end: string | null
          event_id: string | null
          event_location: string | null
          event_start: string | null
          event_title: string | null
          form_id: string | null
          form_type: Database["public"]["Enums"]["signup_form_type"] | null
          fully_claimed_items: number | null
          is_active: boolean | null
          max_signups: number | null
          title: string | null
          total_claims: number | null
          total_items: number | null
          waitlisted_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "signup_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events_for_me"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_response_detail: {
        Row: {
          created_at: string | null
          custom_fields: Json | null
          event_id: string | null
          family_last_name: string | null
          form_id: string | null
          form_title: string | null
          person_first_name: string | null
          person_id: string | null
          person_last_name: string | null
          person_photo_url: string | null
          respondent_email: string | null
          respondent_name: string | null
          respondent_phone: string | null
          response_id: string | null
          status: Database["public"]["Enums"]["signup_status"] | null
          submitted_by: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signup_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events_for_me"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_form_summary"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "signup_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "signup_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_responses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_responses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_responses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "_is_approved"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "signup_responses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "pending_approvals"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "signup_responses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_potluck_items: {
        Args: {
          p_form_id: string
          p_group_id?: string
          p_group_title?: string
          p_items?: Json
        }
        Returns: Json
      }
      admin_delete_family: { Args: { p_family_id: string }; Returns: undefined }
      admin_delete_person: { Args: { p_person_id: string }; Returns: undefined }
      admin_list_users: {
        Args: { p_roles?: string[] }
        Returns: {
          email: string
          family_id: string
          first_name: string
          last_name: string
          person_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      cancel_signup: { Args: { p_response_id: string }; Returns: Json }
      claim_potluck_item: {
        Args: {
          p_item_id: string
          p_manual_name?: string
          p_note?: string
          p_person_id?: string
        }
        Returns: Json
      }
      create_family_for_self: {
        Args: {
          p_address_city?: string
          p_address_state?: string
          p_address_street?: string
          p_address_zip?: string
          p_family_name: string
          p_home_phone?: string
        }
        Returns: string
      }
      create_potluck_form: {
        Args: {
          p_deadline?: string
          p_description?: string
          p_event_id: string
          p_groups?: Json
          p_title?: string
        }
        Returns: Json
      }
      create_signup_form: {
        Args: {
          p_deadline?: string
          p_description?: string
          p_event_id: string
          p_fields?: Json
          p_max_signups?: number
          p_title?: string
        }
        Returns: Json
      }
      enqueue_event_notifications: {
        Args: {
          p_action?: string
          p_event_id: string
          p_reminder_only_attendees?: boolean
          p_schedule?: string
        }
        Returns: number
      }
      enqueue_notification: {
        Args: {
          p_body: string
          p_copy_inapp?: boolean
          p_data: Json
          p_kind: Database["public"]["Enums"]["notif_kind"]
          p_schedule?: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      ensure_tag: {
        Args: {
          p_color?: string
          p_description?: string
          p_name: string
          p_namespace?: string
          p_parent_id?: string
        }
        Returns: string
      }
      get_event_audience_user_ids: {
        Args: { p_event_id: string; p_include_public?: boolean }
        Returns: {
          user_id: string
        }[]
      }
      get_event_ics: { Args: { p_event_id: string }; Returns: string }
      get_my_signup_forms: {
        Args: never
        Returns: {
          confirmed_count: number
          deadline: string
          event_end: string
          event_id: string
          event_location: string
          event_start: string
          event_title: string
          form_description: string
          form_id: string
          form_title: string
          max_signups: number
          my_signup_status: string
        }[]
      }
      get_subjects_by_tags: {
        Args: {
          p_kind: Database["public"]["Enums"]["tag_subject_kind"]
          p_match_all?: boolean
          p_tag_names: string[]
        }
        Returns: {
          subject_id: string
        }[]
      }
      has_role:
        | { Args: { p_roles: string[]; p_uid: string }; Returns: boolean }
        | {
            Args: {
              p_roles: Database["public"]["Enums"]["user_role"][]
              p_uid: string
            }
            Returns: boolean
          }
      is_staff: { Args: never; Returns: boolean }
      join_family_with_token: { Args: { p_token: string }; Returns: string }
      mark_announcement_read: {
        Args: { p_announcement_id: string }
        Returns: boolean
      }
      mark_prayed: { Args: { p_prayer_id: string }; Returns: boolean }
      public_intake_family: {
        Args: {
          p_address_city?: string
          p_address_state?: string
          p_address_street?: string
          p_address_zip?: string
          p_family_last_name: string
          p_home_phone?: string
          p_members?: Json
        }
        Returns: Json
      }
      refresh_computed_family_name: {
        Args: { p_family_id: string }
        Returns: undefined
      }
      rsvp_event: {
        Args: {
          p_event_id: string
          p_status: Database["public"]["Enums"]["rsvp_status"]
        }
        Returns: boolean
      }
      schedule_event_reminder: {
        Args: {
          p_attendees_only?: boolean
          p_event_id: string
          p_minutes_before?: number
        }
        Returns: number
      }
      submit_signup: {
        Args: {
          p_field_values?: Json
          p_form_id: string
          p_manual_email?: string
          p_manual_name?: string
          p_manual_phone?: string
          p_person_id?: string
        }
        Returns: Json
      }
      tag_subject: {
        Args: {
          p_kind: Database["public"]["Enums"]["tag_subject_kind"]
          p_subject_id: string
          p_tag_name: string
        }
        Returns: boolean
      }
      unclaim_potluck_item: { Args: { p_claim_id: string }; Returns: Json }
      unmark_prayed_today: { Args: { p_prayer_id: string }; Returns: boolean }
      untag_subject: {
        Args: {
          p_kind: Database["public"]["Enums"]["tag_subject_kind"]
          p_subject_id: string
          p_tag_name: string
        }
        Returns: boolean
      }
    }
    Enums: {
      family_role: "head" | "spouse" | "child" | "other"
      notif_kind: "push" | "email" | "inapp"
      notif_status: "queued" | "sent" | "error" | "canceled"
      prayer_status: "open" | "answered" | "archived"
      rsvp_status: "going" | "maybe" | "declined"
      signup_field_type:
        | "text"
        | "email"
        | "phone"
        | "boolean"
        | "select"
        | "textarea"
        | "date"
        | "number"
      signup_form_type: "event" | "general" | "potluck"
      signup_status: "confirmed" | "waitlisted" | "cancelled"
      tag_subject_kind:
        | "person"
        | "family"
        | "event"
        | "announcement"
        | "prayer"
        | "notification"
      user_role: "admin" | "leader" | "member" | "pending" | "visitor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      family_role: ["head", "spouse", "child", "other"],
      notif_kind: ["push", "email", "inapp"],
      notif_status: ["queued", "sent", "error", "canceled"],
      prayer_status: ["open", "answered", "archived"],
      rsvp_status: ["going", "maybe", "declined"],
      signup_field_type: [
        "text",
        "email",
        "phone",
        "boolean",
        "select",
        "textarea",
        "date",
        "number",
      ],
      signup_form_type: ["event", "general", "potluck"],
      signup_status: ["confirmed", "waitlisted", "cancelled"],
      tag_subject_kind: [
        "person",
        "family",
        "event",
        "announcement",
        "prayer",
        "notification",
      ],
      user_role: ["admin", "leader", "member", "pending", "visitor"],
    },
  },
} as const
