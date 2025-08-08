export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      commission_payouts: {
        Row: {
          amount: number;
          commission_type: string;
          created_at: string | null;
          id: string;
          payment_id: string | null;
          payout_status: string | null;
          paypal_payout_batch_id: string | null;
          paypal_payout_item_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          amount: number;
          commission_type: string;
          created_at?: string | null;
          id?: string;
          payment_id?: string | null;
          payout_status?: string | null;
          paypal_payout_batch_id?: string | null;
          paypal_payout_item_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          amount?: number;
          commission_type?: string;
          created_at?: string | null;
          id?: string;
          payment_id?: string | null;
          payout_status?: string | null;
          paypal_payout_batch_id?: string | null;
          paypal_payout_item_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "commission_payouts_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commission_payouts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      direct_messages: {
        Row: {
          created_at: string | null;
          expires_at: string | null;
          id: string;
          is_admin_message: boolean | null;
          is_read: boolean | null;
          message: string;
          recipient_id: string | null;
          sender_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_admin_message?: boolean | null;
          is_read?: boolean | null;
          message: string;
          recipient_id?: string | null;
          sender_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_admin_message?: boolean | null;
          is_read?: boolean | null;
          message?: string;
          recipient_id?: string | null;
          sender_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "direct_messages_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      entries: {
        Row: {
          amount: number | null;
          created_at: string | null;
          description: string | null;
          id: string;
          title: string;
          user_id: string | null;
        };
        Insert: {
          amount?: number | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          title: string;
          user_id?: string | null;
        };
        Update: {
          amount?: number | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          title?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      events: {
        Row: {
          additional_photos: string[] | null;
          address: string | null;
          city: string | null;
          created_at: string | null;
          date: string;
          description: string | null;
          end_time: string | null;
          free_spots_exotics: number | null;
          free_spots_strippers: number | null;
          genre: string | null;
          id: string;
          location: string;
          max_attendees: number | null;
          name: string;
          photo_url: string | null;
          price: number | null;
          start_time: string | null;
          state: string | null;
          video_urls: string[] | null;
        };
        Insert: {
          additional_photos?: string[] | null;
          address?: string | null;
          city?: string | null;
          created_at?: string | null;
          date: string;
          description?: string | null;
          end_time?: string | null;
          free_spots_exotics?: number | null;
          free_spots_strippers?: number | null;
          genre?: string | null;
          id?: string;
          location: string;
          max_attendees?: number | null;
          name: string;
          photo_url?: string | null;
          price?: number | null;
          start_time?: string | null;
          state?: string | null;
          video_urls?: string[] | null;
        };
        Update: {
          additional_photos?: string[] | null;
          address?: string | null;
          city?: string | null;
          created_at?: string | null;
          date?: string;
          description?: string | null;
          end_time?: string | null;
          free_spots_exotics?: number | null;
          free_spots_strippers?: number | null;
          genre?: string | null;
          id?: string;
          location?: string;
          max_attendees?: number | null;
          name?: string;
          photo_url?: string | null;
          price?: number | null;
          start_time?: string | null;
          state?: string | null;
          video_urls?: string[] | null;
        };
        Relationships: [];
      };
      jackpot: {
        Row: {
          amount: number;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          updated_at: string | null;
          week_end: string;
          week_start: string;
          winner_id: string | null;
        };
        Insert: {
          amount?: number;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          updated_at?: string | null;
          week_end: string;
          week_start: string;
          winner_id?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          updated_at?: string | null;
          week_end?: string;
          week_start?: string;
          winner_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "jackpot_winner_id_fkey";
            columns: ["winner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      jackpot_tickets: {
        Row: {
          created_at: string | null;
          draw_date: string;
          id: string;
          is_winner: boolean | null;
          source: string | null;
          source_transaction_id: string | null;
          ticket_code: string | null;
          tickets_count: number;
          tip_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          draw_date: string;
          id?: string;
          is_winner?: boolean | null;
          source?: string | null;
          source_transaction_id?: string | null;
          ticket_code?: string | null;
          tickets_count?: number;
          tip_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          draw_date?: string;
          id?: string;
          is_winner?: boolean | null;
          source?: string | null;
          source_transaction_id?: string | null;
          ticket_code?: string | null;
          tickets_count?: number;
          tip_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "jackpot_tickets_tip_id_fkey";
            columns: ["tip_id"];
            isOneToOne: false;
            referencedRelation: "tips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jackpot_tickets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      jackpot_winners: {
        Row: {
          amount_won: number;
          created_at: string | null;
          draw_date: string;
          id: string;
          profile_photo: string | null;
          user_id: string | null;
          username: string;
          year: number;
        };
        Insert: {
          amount_won: number;
          created_at?: string | null;
          draw_date: string;
          id?: string;
          profile_photo?: string | null;
          user_id?: string | null;
          username: string;
          year: number;
        };
        Update: {
          amount_won?: number;
          created_at?: string | null;
          draw_date?: string;
          id?: string;
          profile_photo?: string | null;
          user_id?: string | null;
          username?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "jackpot_winners_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          content: string;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          is_direct_message: boolean | null;
          is_notification: boolean | null;
          media_type: string | null;
          media_url: string | null;
          read_at: string | null;
          recipient_id: string;
          sender_id: string;
          updated_at: string | null;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_direct_message?: boolean | null;
          is_notification?: boolean | null;
          media_type?: string | null;
          media_url?: string | null;
          read_at?: string | null;
          recipient_id: string;
          sender_id: string;
          updated_at?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_direct_message?: boolean | null;
          is_notification?: boolean | null;
          media_type?: string | null;
          media_url?: string | null;
          read_at?: string | null;
          recipient_id?: string;
          sender_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          created_at: string | null;
          expires_at: string | null;
          id: string;
          is_read: boolean | null;
          media_type: string | null;
          media_url: string | null;
          message: string;
          recipient_id: string | null;
          title: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          media_type?: string | null;
          media_url?: string | null;
          message: string;
          recipient_id?: string | null;
          title: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          media_type?: string | null;
          media_url?: string | null;
          message?: string;
          recipient_id?: string | null;
          title?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string | null;
          currency: string | null;
          event_host_commission: number | null;
          event_id: string | null;
          id: string;
          payment_status: string | null;
          payment_type: string;
          paypal_order_id: string | null;
          paypal_payment_id: string | null;
          paypal_transaction_id: string | null;
          platform_fee: number | null;
          referred_by: string | null;
          referrer_commission: number | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          currency?: string | null;
          event_host_commission?: number | null;
          event_id?: string | null;
          id?: string;
          payment_status?: string | null;
          payment_type: string;
          paypal_order_id?: string | null;
          paypal_payment_id?: string | null;
          paypal_transaction_id?: string | null;
          platform_fee?: number | null;
          referred_by?: string | null;
          referrer_commission?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          currency?: string | null;
          event_host_commission?: number | null;
          event_id?: string | null;
          id?: string;
          payment_status?: string | null;
          payment_type?: string;
          paypal_order_id?: string | null;
          paypal_payment_id?: string | null;
          paypal_transaction_id?: string | null;
          platform_fee?: number | null;
          referred_by?: string | null;
          referrer_commission?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      payout_requests: {
        Row: {
          amount: number;
          cashapp_cashtag: string | null;
          cashapp_email: string | null;
          cashapp_phone: string | null;
          check_address_line1: string | null;
          check_address_line2: string | null;
          check_city: string | null;
          check_country: string | null;
          check_full_name: string | null;
          check_state: string | null;
          check_zip_code: string | null;
          created_at: string | null;
          id: string;
          notes: string | null;
          payout_method: string;
          paypal_email: string | null;
          processed_date: string | null;
          request_date: string | null;
          request_status: string | null;
          scheduled_payout_date: string | null;
          updated_at: string | null;
          user_id: string;
          wire_account_holder_name: string | null;
          wire_account_number: string | null;
          wire_account_type: string | null;
          wire_bank_address: string | null;
          wire_bank_name: string | null;
          wire_routing_number: string | null;
          wire_swift_code: string | null;
        };
        Insert: {
          amount: number;
          cashapp_cashtag?: string | null;
          cashapp_email?: string | null;
          cashapp_phone?: string | null;
          check_address_line1?: string | null;
          check_address_line2?: string | null;
          check_city?: string | null;
          check_country?: string | null;
          check_full_name?: string | null;
          check_state?: string | null;
          check_zip_code?: string | null;
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          payout_method: string;
          paypal_email?: string | null;
          processed_date?: string | null;
          request_date?: string | null;
          request_status?: string | null;
          scheduled_payout_date?: string | null;
          updated_at?: string | null;
          user_id: string;
          wire_account_holder_name?: string | null;
          wire_account_number?: string | null;
          wire_account_type?: string | null;
          wire_bank_address?: string | null;
          wire_bank_name?: string | null;
          wire_routing_number?: string | null;
          wire_swift_code?: string | null;
        };
        Update: {
          amount?: number;
          cashapp_cashtag?: string | null;
          cashapp_email?: string | null;
          cashapp_phone?: string | null;
          check_address_line1?: string | null;
          check_address_line2?: string | null;
          check_city?: string | null;
          check_country?: string | null;
          check_full_name?: string | null;
          check_state?: string | null;
          check_zip_code?: string | null;
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          payout_method?: string;
          paypal_email?: string | null;
          processed_date?: string | null;
          request_date?: string | null;
          request_status?: string | null;
          scheduled_payout_date?: string | null;
          updated_at?: string | null;
          user_id?: string;
          wire_account_holder_name?: string | null;
          wire_account_number?: string | null;
          wire_account_type?: string | null;
          wire_bank_address?: string | null;
          wire_bank_name?: string | null;
          wire_routing_number?: string | null;
          wire_swift_code?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payout_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      ratings: {
        Row: {
          created_at: string | null;
          id: string;
          rater_id: string | null;
          rating: number;
          updated_at: string | null;
          user_id: string | null;
          year: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          rater_id?: string | null;
          rating: number;
          updated_at?: string | null;
          user_id?: string | null;
          year?: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          rater_id?: string | null;
          rating?: number;
          updated_at?: string | null;
          user_id?: string | null;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_rater_id_fkey";
            columns: ["rater_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ratings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      tickets: {
        Row: {
          created_at: string | null;
          id: string;
          ticket_number: string;
          tip_id: string | null;
          user_Id: string | null;
          username: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          ticket_number: string;
          tip_id?: string | null;
          user_Id?: string | null;
          username: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          ticket_number?: string;
          tip_id?: string | null;
          user_Id?: string | null;
          username?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_tip_id_fkey";
            columns: ["tip_id"];
            isOneToOne: false;
            referencedRelation: "tips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_user_Id_fkey";
            columns: ["user_Id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      tips: {
        Row: {
          created_at: string | null;
          id: string;
          paypal_transaction_id: string | null;
          referrer_username: string | null;
          status: string | null;
          tickets_generated: number;
          tip_amount: number;
          tipped_username: string;
          tipper_username: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          paypal_transaction_id?: string | null;
          referrer_username?: string | null;
          status?: string | null;
          tickets_generated: number;
          tip_amount: number;
          tipped_username: string;
          tipper_username: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          paypal_transaction_id?: string | null;
          referrer_username?: string | null;
          status?: string | null;
          tickets_generated?: number;
          tip_amount?: number;
          tipped_username?: string;
          tipper_username?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tips_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      tips_transactions: {
        Row: {
          card_brand: string | null;
          card_last_four: string | null;
          card_payment_intent_id: string | null;
          completed_at: string | null;
          created_at: string | null;
          id: string;
          is_anonymous: boolean | null;
          message: string | null;
          payment_id: string | null;
          payment_method: string;
          payment_status: string | null;
          paypal_order_id: string | null;
          paypal_payment_id: string | null;
          referrer_commission: number | null;
          referrer_username: string | null;
          tickets_generated: number | null;
          tip_amount: number;
          tipped_user_id: string | null;
          tipped_username: string;
          tipper_user_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          card_brand?: string | null;
          card_last_four?: string | null;
          card_payment_intent_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          is_anonymous?: boolean | null;
          message?: string | null;
          payment_id?: string | null;
          payment_method: string;
          payment_status?: string | null;
          paypal_order_id?: string | null;
          paypal_payment_id?: string | null;
          referrer_commission?: number | null;
          referrer_username?: string | null;
          tickets_generated?: number | null;
          tip_amount: number;
          tipped_user_id?: string | null;
          tipped_username: string;
          tipper_user_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          card_brand?: string | null;
          card_last_four?: string | null;
          card_payment_intent_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          is_anonymous?: boolean | null;
          message?: string | null;
          payment_id?: string | null;
          payment_method?: string;
          payment_status?: string | null;
          paypal_order_id?: string | null;
          paypal_payment_id?: string | null;
          referrer_commission?: number | null;
          referrer_username?: string | null;
          tickets_generated?: number | null;
          tip_amount?: number;
          tipped_user_id?: string | null;
          tipped_username?: string;
          tipper_user_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tips_transactions_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tips_transactions_tipped_user_id_fkey";
            columns: ["tipped_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tips_transactions_tipper_user_id_fkey";
            columns: ["tipper_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      user_events: {
        Row: {
          created_at: string | null;
          event_id: string;
          guest_name: string | null;
          id: string;
          payment_id: string | null;
          payment_status: string | null;
          referred_by: string | null;
          user_id: string;
          username: string;
        };
        Insert: {
          created_at?: string | null;
          event_id: string;
          guest_name?: string | null;
          id?: string;
          payment_id?: string | null;
          payment_status?: string | null;
          referred_by?: string | null;
          user_id: string;
          username: string;
        };
        Update: {
          created_at?: string | null;
          event_id?: string;
          guest_name?: string | null;
          id?: string;
          payment_id?: string | null;
          payment_status?: string | null;
          referred_by?: string | null;
          user_id?: string;
          username?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_events_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_events_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      user_media: {
        Row: {
          created_at: string | null;
          file_size: number | null;
          filename: string | null;
          flagged: boolean | null;
          id: string;
          media_type: string;
          media_url: string;
          storage_path: string | null;
          updated_at: string | null;
          user_id: string;
          warning_message: string | null;
        };
        Insert: {
          created_at?: string | null;
          file_size?: number | null;
          filename?: string | null;
          flagged?: boolean | null;
          id?: string;
          media_type: string;
          media_url: string;
          storage_path?: string | null;
          updated_at?: string | null;
          user_id: string;
          warning_message?: string | null;
        };
        Update: {
          created_at?: string | null;
          file_size?: number | null;
          filename?: string | null;
          flagged?: boolean | null;
          id?: string;
          media_type?: string;
          media_url?: string;
          storage_path?: string | null;
          updated_at?: string | null;
          user_id?: string;
          warning_message?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_media_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          about_me: string | null;
          address: string | null;
          banner_photo: string | null;
          bio: string | null;
          city: string | null;
          created_at: string | null;
          description: string | null;
          email: string;
          first_name: string | null;
          front_page_photo: string | null;
          gender: string | null;
          hash_type: string | null;
          id: string;
          is_ranked: boolean | null;
          last_name: string | null;
          lottery_tickets: number | null;
          membership_tier: string | null;
          membership_type: string | null;
          mobile_number: string | null;
          occupation: string | null;
          overrides: number | null;
          password_hash: string;
          paypal_email: string | null;
          profile_photo: string | null;
          rank_number: number | null;
          referral_fees: number | null;
          referred_by: string | null;
          referred_by_photo: string | null;
          register_order: number | null;
          state: string | null;
          tips_earned: number | null;
          updated_at: string | null;
          user_rank: number | null;
          user_type: string | null;
          username: string;
          weekly_earnings: number | null;
          weekly_hours: number | null;
          zip: string | null;
          diamond_plus_active: boolean | null;
          diamond_plus_signed_at: string | null;
          diamond_plus_payment_id: string | null;
          membership_count_position: number | null;
          phone_number: string | null;
          agreement_signed: boolean | null;
          notarization_completed: boolean | null;
          silver_plus_active: boolean | null;
          silver_plus_joined_at: string | null;
          silver_plus_payment_id: string | null;
          silver_plus_membership_number: number | null;
        };
        Insert: {
          about_me?: string | null;
          address?: string | null;
          banner_photo?: string | null;
          bio?: string | null;
          city?: string | null;
          created_at?: string | null;
          description?: string | null;
          email: string;
          first_name?: string | null;
          front_page_photo?: string | null;
          gender?: string | null;
          hash_type?: string | null;
          id?: string;
          is_ranked?: boolean | null;
          last_name?: string | null;
          lottery_tickets?: number | null;
          membership_tier?: string | null;
          membership_type?: string | null;
          mobile_number?: string | null;
          occupation?: string | null;
          overrides?: number | null;
          password_hash: string;
          paypal_email?: string | null;
          profile_photo?: string | null;
          rank_number?: number | null;
          referral_fees?: number | null;
          referred_by?: string | null;
          referred_by_photo?: string | null;
          register_order?: number | null;
          state?: string | null;
          tips_earned?: number | null;
          updated_at?: string | null;
          user_rank?: number | null;
          user_type?: string | null;
          username: string;
          weekly_earnings?: number | null;
          weekly_hours?: number | null;
          zip?: string | null;
          diamond_plus_active?: boolean | null;
          diamond_plus_signed_at?: string | null;
          diamond_plus_payment_id?: string | null;
          membership_count_position?: number | null;
          phone_number?: string | null;
          agreement_signed?: boolean | null;
          notarization_completed?: boolean | null;
          silver_plus_active?: boolean | null;
          silver_plus_joined_at?: string | null;
          silver_plus_payment_id?: string | null;
          silver_plus_membership_number?: number | null;
        };
        Update: {
          about_me?: string | null;
          address?: string | null;
          banner_photo?: string | null;
          bio?: string | null;
          city?: string | null;
          created_at?: string | null;
          description?: string | null;
          email?: string;
          first_name?: string | null;
          front_page_photo?: string | null;
          gender?: string | null;
          hash_type?: string | null;
          id?: string;
          is_ranked?: boolean | null;
          last_name?: string | null;
          lottery_tickets?: number | null;
          membership_tier?: string | null;
          membership_type?: string | null;
          mobile_number?: string | null;
          occupation?: string | null;
          overrides?: number | null;
          password_hash?: string;
          paypal_email?: string | null;
          profile_photo?: string | null;
          rank_number?: number | null;
          referral_fees?: number | null;
          referred_by?: string | null;
          referred_by_photo?: string | null;
          register_order?: number | null;
          state?: string | null;
          tips_earned?: number | null;
          updated_at?: string | null;
          user_rank?: number | null;
          user_type?: string | null;
          username?: string;
          weekly_earnings?: number | null;
          weekly_hours?: number | null;
          zip?: string | null;
          diamond_plus_active?: boolean | null;
          diamond_plus_signed_at?: string | null;
          diamond_plus_payment_id?: string | null;
          membership_count_position?: number | null;
          phone_number?: string | null;
          agreement_signed?: boolean | null;
          notarization_completed?: boolean | null;
          silver_plus_active?: boolean | null;
          silver_plus_joined_at?: string | null;
          silver_plus_payment_id?: string | null;
          silver_plus_membership_number?: number | null;
        };
        Relationships: [];
      };
      weekly_earnings: {
        Row: {
          amount: number | null;
          bonus_earnings: number | null;
          created_at: string | null;
          id: string;
          referral_earnings: number | null;
          tip_earnings: number | null;
          updated_at: string | null;
          user_id: string;
          week_end: string;
          week_start: string;
        };
        Insert: {
          amount?: number | null;
          bonus_earnings?: number | null;
          created_at?: string | null;
          id?: string;
          referral_earnings?: number | null;
          tip_earnings?: number | null;
          updated_at?: string | null;
          user_id: string;
          week_end: string;
          week_start: string;
        };
        Update: {
          amount?: number | null;
          bonus_earnings?: number | null;
          created_at?: string | null;
          id?: string;
          referral_earnings?: number | null;
          tip_earnings?: number | null;
          updated_at?: string | null;
          user_id?: string;
          week_end?: string;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_earnings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calculate_next_payout_date: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      check_user_exists: {
        Args: { username: string };
        Returns: boolean;
      };
      delete_expired_notifications: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

// Simplified Tables type for default schema usage
export type Tables<TableName extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][TableName]["Row"];

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
