export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          event_code: string;
          event_name: string;
          category: string;
          description: string;
          team_size_min: number;
          team_size_max: number;
          registration_open: boolean;
          rules: Json;
          challenges: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_code: string;
          event_name: string;
          category: string;
          description: string;
          team_size_min?: number;
          team_size_max?: number;
          registration_open?: boolean;
          rules?: Json;
          challenges?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_code?: string;
          event_name?: string;
          category?: string;
          description?: string;
          team_size_min?: number;
          team_size_max?: number;
          registration_open?: boolean;
          rules?: Json;
          challenges?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          team_uid: string;
          team_name: string;
          event_id: string;
          selected_challenge: string | null;
          college_name: string;
          team_lead_name: string;
          team_lead_email: string;
          team_lead_phone: string;
          registration_status: 'REGISTERED' | 'CONFIRMED' | 'CANCELLED';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_uid: string;
          team_name: string;
          event_id: string;
          selected_challenge?: string | null;
          college_name: string;
          team_lead_name: string;
          team_lead_email: string;
          team_lead_phone: string;
          registration_status?: 'REGISTERED' | 'CONFIRMED' | 'CANCELLED';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          team_name?: string;
          selected_challenge?: string | null;
          college_name?: string;
          team_lead_name?: string;
          team_lead_email?: string;
          team_lead_phone?: string;
          registration_status?: 'REGISTERED' | 'CONFIRMED' | 'CANCELLED';
          updated_at?: string;
        };
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          team_id: string;
          participant_name: string;
          participant_email: string;
          participant_phone: string;
          member_position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          participant_name: string;
          participant_email: string;
          participant_phone: string;
          member_position: number;
          created_at?: string;
        };
        Update: {
          participant_name?: string;
          participant_email?: string;
          participant_phone?: string;
          member_position?: number;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          team_id: string;
          amount: number;
          currency: string;
          payment_gateway: string;
          gateway_order_id: string | null;
          gateway_payment_id: string | null;
          transaction_reference: string | null;
          payment_method: 'GATEWAY' | 'STATIC_QR';
          payment_status: 'NOT PAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          amount?: number;
          currency?: string;
          payment_gateway?: string;
          gateway_order_id?: string | null;
          gateway_payment_id?: string | null;
          transaction_reference?: string | null;
          payment_method?: 'GATEWAY' | 'STATIC_QR';
          payment_status?: 'NOT PAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          gateway_order_id?: string | null;
          gateway_payment_id?: string | null;
          transaction_reference?: string | null;
          payment_method?: 'GATEWAY' | 'STATIC_QR';
          payment_status?: 'NOT PAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
          paid_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_submissions: {
        Row: {
          id: string;
          team_id: string;
          utr_reference: string;
          screenshot_storage_path: string | null;
          verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
          verified_by: string | null;
          verification_timestamp: string | null;
          rejection_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          utr_reference: string;
          screenshot_storage_path?: string | null;
          verification_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
          verified_by?: string | null;
          verification_timestamp?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
        };
        Update: {
          verification_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
          verified_by?: string | null;
          verification_timestamp?: string | null;
          rejection_reason?: string | null;
        };
        Relationships: [];
      };
      email_logs: {
        Row: {
          id: string;
          team_id: string | null;
          recipient_email: string;
          email_type: 'ADMIN_NOTIFICATION' | 'PAYMENT_CONFIRMATION' | 'SYSTEM_NOTIFICATION';
          delivery_status: 'SENT' | 'FAILED' | 'PENDING';
          provider_message_id: string | null;
          failure_reason: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string | null;
          recipient_email: string;
          email_type: 'ADMIN_NOTIFICATION' | 'PAYMENT_CONFIRMATION' | 'SYSTEM_NOTIFICATION';
          delivery_status?: 'SENT' | 'FAILED' | 'PENDING';
          provider_message_id?: string | null;
          failure_reason?: string | null;
          sent_at?: string;
        };
        Update: {
          delivery_status?: 'SENT' | 'FAILED' | 'PENDING';
          failure_reason?: string | null;
        };
        Relationships: [];
      };
      admin_users: {
        Row: {
          id: string;
          auth_user_id: string | null;
          email: string;
          role: 'SUPER_ADMIN' | 'ADMIN' | 'COORDINATOR';
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          email: string;
          role?: 'SUPER_ADMIN' | 'ADMIN' | 'COORDINATOR';
          created_at?: string;
        };
        Update: {
          role?: 'SUPER_ADMIN' | 'ADMIN' | 'COORDINATOR';
        };
        Relationships: [];
      };
      admin_audit_logs: {
        Row: {
          id: string;
          admin_email: string;
          action: string;
          target_type: string;
          target_id: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_email: string;
          action: string;
          target_type: string;
          target_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          details?: Json | null;
        };
        Relationships: [];
      };
      visitor_analytics: {
        Row: {
          id: string;
          anonymous_visitor_id: string;
          page_path: string;
          referral_source: string | null;
          device_category: string | null;
          visited_at: string;
        };
        Insert: {
          id?: string;
          anonymous_visitor_id: string;
          page_path: string;
          referral_source?: string | null;
          device_category?: string | null;
          visited_at?: string;
        };
        Update: {
          page_path?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: number;
          hackathon_name: string;
          edition: string;
          institution_name: string;
          trust_name: string;
          trust_description: string;
          college_description: string;
          venue_address: string;
          google_maps_embed_url: string | null;
          registration_fee: number;
          total_prize_pool: string;
          registrations_globally_open: boolean;
          official_qr_image_url: string | null;
          upi_id: string;
          beneficiary_name: string;
          contact_email: string;
          contact_phone: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          hackathon_name?: string;
          edition?: string;
          institution_name?: string;
          trust_name?: string;
          trust_description?: string;
          college_description?: string;
          venue_address?: string;
          google_maps_embed_url?: string | null;
          registration_fee?: number;
          total_prize_pool?: string;
          registrations_globally_open?: boolean;
          official_qr_image_url?: string | null;
          upi_id?: string;
          beneficiary_name?: string;
          contact_email?: string;
          contact_phone?: string;
          updated_at?: string;
        };
        Update: {
          hackathon_name?: string;
          edition?: string;
          institution_name?: string;
          trust_name?: string;
          trust_description?: string;
          college_description?: string;
          venue_address?: string;
          google_maps_embed_url?: string | null;
          registration_fee?: number;
          total_prize_pool?: string;
          registrations_globally_open?: boolean;
          official_qr_image_url?: string | null;
          upi_id?: string;
          beneficiary_name?: string;
          contact_email?: string;
          contact_phone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_next_team_uid: {
        Args: {
          p_event_code: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
