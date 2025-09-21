export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'pending' | 'member' | 'leader' | 'admin';
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: 'pending' | 'member' | 'leader' | 'admin';
          approved_at?: string | null;
          approved_by?: string | null;
        };
        Update: {
          role?: 'pending' | 'member' | 'leader' | 'admin';
          approved_at?: string | null;
          approved_by?: string | null;
        };
      };
      persons: {
        Row: {
          id: string;
          user_id: string | null;
          family_id: string | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          date_of_birth: string | null;
          is_head_of_family: boolean;
          is_spouse: boolean;
          photo_url: string | null;
          created_at: string;
        };
        Insert: {
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          is_head_of_family?: boolean;
          is_spouse?: boolean;
          photo_url?: string | null;
          user_id?: string | null;
          family_id?: string | null;
        };
        Update: {
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          is_head_of_family?: boolean;
          is_spouse?: boolean;
          photo_url?: string | null;
          family_id?: string | null;
        };
      };
      families: {
        Row: {
          id: string;
          family_name: string;
          family_name_display: string | null;
          address_street: string | null;
          address_city: string | null;
          address_state: string | null;
          address_zip: string | null;
          home_phone: string | null;
          family_join_token: string;
          photo_path: string | null;
          created_at: string;
        };
        Insert: {
          family_name: string;
          address_street?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_zip?: string | null;
          home_phone?: string | null;
        };
        Update: {
          family_name?: string;
          address_street?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_zip?: string | null;
          home_phone?: string | null;
        };
      };
      tags: {
        Row: {
          id: string;
          name: string;
          namespace: string | null;
          color: string | null;
          description: string | null;
          self_assignable: boolean;
          assign_min_role: 'member' | 'leader' | 'admin';
          is_active: boolean;
          parent_id: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          name: string;
          namespace?: string | null;
          color?: string | null;
          description?: string | null;
          self_assignable?: boolean;
          assign_min_role?: 'member' | 'leader' | 'admin';
          is_active?: boolean;
          parent_id?: string | null;
        };
        Update: {
          name?: string;
          namespace?: string | null;
          color?: string | null;
          description?: string | null;
          self_assignable?: boolean;
          assign_min_role?: 'member' | 'leader' | 'admin';
          is_active?: boolean;
          parent_id?: string | null;
          updated_at?: string | null;
        };
      };
      person_tags: {
        Row: {
          person_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          person_id: string;
          tag_id: string;
        };
        Update: {};
      };
      event_audience_tags: {
        Row: {
          event_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          event_id: string;
          tag_id: string;
        };
        Update: {};
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          start_at: string;
          end_at: string;
          is_all_day: boolean;
          location: string | null;
          image_path: string | null;
          is_public: boolean;
          roles_allowed: ('admin'|'leader'|'member'|'visitor')[] | null;
          created_by: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          title: string;
          description?: string | null;
          start_at: string;
          end_at: string;
          is_all_day?: boolean;
          location?: string | null;
          image_path?: string | null;
          is_public?: boolean;
          roles_allowed?: ('admin'|'leader'|'member'|'visitor')[] | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          start_at?: string;
          end_at?: string;
          is_all_day?: boolean;
          location?: string | null;
          image_path?: string | null;
          is_public?: boolean;
          roles_allowed?: ('admin'|'leader'|'member'|'visitor')[] | null;
          updated_at?: string | null;
        };
      };
      event_rsvps: {
        Row: {
          event_id: string;
          person_id: string;
          status: 'going' | 'maybe' | 'declined';
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          event_id: string;
          person_id: string;
          status: 'going' | 'maybe' | 'declined';
        };
        Update: {
          status?: 'going' | 'maybe' | 'declined';
          updated_at?: string | null;
        };
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          is_urgent: boolean;
          created_by: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          title: string;
          content: string;
          is_urgent?: boolean;
        };
        Update: {
          title?: string;
          content?: string;
          is_urgent?: boolean;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      family_directory_display: {
        Row: {
          family_id: string | null;
          family_name_display: string | null;
          address_street: string | null;
          address_city: string | null;
          address_state: string | null;
          address_zip: string | null;
          home_phone: string | null;
          person_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          is_head_of_family: boolean;
          is_spouse: boolean;
          photo_url: string | null;
        };
      };
      pending_approvals: {
        Row: {
          user_id: string;
          email: string | null;
          created_at: string;
          person_id: string | null;
          first_name: string | null;
          last_name: string | null;
        };
      };
      person_with_tags: {
        Row: {
          id: string;
          user_id: string | null;
          family_id: string | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          date_of_birth: string | null;
          is_head_of_family: boolean;
          is_spouse: boolean;
          photo_url: string | null;
          created_at: string;
          tag_names: string[] | null;
        };
      };
      events_for_me: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          start_at: string;
          end_at: string;
          is_all_day: boolean;
          location: string | null;
          image_path: string | null;
          is_public: boolean;
          roles_allowed: ('admin'|'leader'|'member'|'visitor')[] | null;
          created_by: string;
          created_at: string;
          updated_at: string | null;
          my_rsvp: 'going' | 'maybe' | 'declined' | null;
          audience_tags: {
            id: string;
            name: string;
            color: string | null;
          }[] | null;
        };
      };
    };
    Functions: {
      create_family_for_self: {
        Args: {
          p_family_name: string;
          p_address_street?: string | null;
          p_address_city?: string | null;
          p_address_state?: string | null;
          p_address_zip?: string | null;
          p_home_phone?: string | null;
        };
        Returns: string;
      };
      join_family_with_token: {
        Args: {
          p_token: string;
        };
        Returns: string;
      };
      tag_subject: {
        Args: {
          p_kind: string;
          p_subject_id: string;
          p_tag_name: string;
        };
        Returns: boolean;
      };
      untag_subject: {
        Args: {
          p_kind: string;
          p_subject_id: string;
          p_tag_name: string;
        };
        Returns: boolean;
      };
      get_subjects_by_tags: {
        Args: {
          p_kind: string;
          p_tag_names: string[];
          p_match_all: boolean;
        };
        Returns: {
          subject_id: string;
        }[];
      };
      rsvp_event: {
        Args: {
          p_event_id: string;
          p_status: 'going' | 'maybe' | 'declined';
        };
        Returns: boolean;
      };
      get_event_ics: {
        Args: {
          p_event_id: string;
        };
        Returns: string;
      };
    };
  };
}