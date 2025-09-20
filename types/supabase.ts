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
    };
  };
}