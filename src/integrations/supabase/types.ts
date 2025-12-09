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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      _view_backup: {
        Row: {
          backed_up_at: string | null
          definition: string | null
        }
        Insert: {
          backed_up_at?: string | null
          definition?: string | null
        }
        Update: {
          backed_up_at?: string | null
          definition?: string | null
        }
        Relationships: []
      }
      commission_payouts: {
        Row: {
          amount: number
          commission_type: string
          created_at: string | null
          id: string
          payment_id: string | null
          payout_status: string | null
          paypal_payout_batch_id: string | null
          paypal_payout_item_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          commission_type: string
          created_at?: string | null
          id?: string
          payment_id?: string | null
          payout_status?: string | null
          paypal_payout_batch_id?: string | null
          paypal_payout_item_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          commission_type?: string
          created_at?: string | null
          id?: string
          payment_id?: string | null
          payout_status?: string | null
          paypal_payout_batch_id?: string | null
          paypal_payout_item_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_payouts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_access_payments: {
        Row: {
          access_granted_at: string | null
          access_type: string
          created_at: string | null
          expires_at: string | null
          id: string
          payment_amount: number
          payment_method: string | null
          payment_status: string | null
          paypal_order_id: string | null
          paypal_payment_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_granted_at?: string | null
          access_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_amount: number
          payment_method?: string | null
          payment_status?: string | null
          paypal_order_id?: string | null
          paypal_payment_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_granted_at?: string | null
          access_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_amount?: number
          payment_method?: string | null
          payment_status?: string | null
          paypal_order_id?: string | null
          paypal_payment_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_access_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_admin_message: boolean | null
          is_read: boolean | null
          liked_by: string | null
          message: string
          recipient_id: string | null
          sender_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_admin_message?: boolean | null
          is_read?: boolean | null
          liked_by?: string | null
          message: string
          recipient_id?: string | null
          sender_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_admin_message?: boolean | null
          is_read?: boolean | null
          liked_by?: string | null
          message?: string
          recipient_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_liked_by_fkey"
            columns: ["liked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      elite_memberships: {
        Row: {
          created_at: string
          id: string
          last_payment_at: string | null
          lifetime_granted_at: string | null
          months_paid_count: number
          seat_number: number | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_payment_at?: string | null
          lifetime_granted_at?: string | null
          months_paid_count?: number
          seat_number?: number | null
          started_at?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_payment_at?: string | null
          lifetime_granted_at?: string | null
          months_paid_count?: number
          seat_number?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elite_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          additional_photos: string[] | null
          address: string | null
          city: string | null
          created_at: string | null
          date: string
          description: string | null
          end_time: string | null
          free_spots_exotics: number | null
          free_spots_strippers: number | null
          genre: string | null
          id: string
          location: string
          max_attendees: number | null
          name: string
          photo_url: string | null
          price: number | null
          start_time: string | null
          state: string | null
          video_urls: string[] | null
        }
        Insert: {
          additional_photos?: string[] | null
          address?: string | null
          city?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          end_time?: string | null
          free_spots_exotics?: number | null
          free_spots_strippers?: number | null
          genre?: string | null
          id?: string
          location: string
          max_attendees?: number | null
          name: string
          photo_url?: string | null
          price?: number | null
          start_time?: string | null
          state?: string | null
          video_urls?: string[] | null
        }
        Update: {
          additional_photos?: string[] | null
          address?: string | null
          city?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          end_time?: string | null
          free_spots_exotics?: number | null
          free_spots_strippers?: number | null
          genre?: string | null
          id?: string
          location?: string
          max_attendees?: number | null
          name?: string
          photo_url?: string | null
          price?: number | null
          start_time?: string | null
          state?: string | null
          video_urls?: string[] | null
        }
        Relationships: []
      }
      installment_payments: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string | null
          id: string
          installment_number: number
          membership_upgrade_id: string
          paid_at: string | null
          payment_status: string | null
          paypal_order_id: string | null
          paypal_payment_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          installment_number: number
          membership_upgrade_id: string
          paid_at?: string | null
          payment_status?: string | null
          paypal_order_id?: string | null
          paypal_payment_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          installment_number?: number
          membership_upgrade_id?: string
          paid_at?: string | null
          payment_status?: string | null
          paypal_order_id?: string | null
          paypal_payment_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installment_payments_membership_upgrade_id_fkey"
            columns: ["membership_upgrade_id"]
            isOneToOne: false
            referencedRelation: "membership_upgrades"
            referencedColumns: ["id"]
          },
        ]
      }
      jackpot: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          week_end: string
          week_start: string
          winner_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          week_end: string
          week_start: string
          winner_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          week_end?: string
          week_start?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jackpot_config: {
        Row: {
          active: boolean
          created_at: string
          fee_fixed: number
          fee_percent: number
          id: string
          jackpot_base: string
          jackpot_percent: number
          upfront_dime: number
          upfront_referred_dime: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          fee_fixed?: number
          fee_percent?: number
          id?: string
          jackpot_base?: string
          jackpot_percent?: number
          upfront_dime?: number
          upfront_referred_dime?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          fee_fixed?: number
          fee_percent?: number
          id?: string
          jackpot_base?: string
          jackpot_percent?: number
          upfront_dime?: number
          upfront_referred_dime?: number
        }
        Relationships: []
      }
      jackpot_configs: {
        Row: {
          created_at: string
          draw_cutoff_time: string
          draw_day: string
          fee_fixed: number
          fee_percent: number
          id: string
          is_active: boolean
          max_tickets_per_txn: number
          min_prize: number
          min_start_amount: number
          prize_pct_first: number
          prize_pct_second: number
          prize_pct_third: number
          split_to_dime_percent: number
          split_to_jackpot_percent: number
          split_to_referred_dime_percent: number
          ticket_per_dollar: number
          time_zone: string
        }
        Insert: {
          created_at?: string
          draw_cutoff_time?: string
          draw_day?: string
          fee_fixed?: number
          fee_percent?: number
          id?: string
          is_active?: boolean
          max_tickets_per_txn?: number
          min_prize?: number
          min_start_amount?: number
          prize_pct_first?: number
          prize_pct_second?: number
          prize_pct_third?: number
          split_to_dime_percent?: number
          split_to_jackpot_percent?: number
          split_to_referred_dime_percent?: number
          ticket_per_dollar?: number
          time_zone?: string
        }
        Update: {
          created_at?: string
          draw_cutoff_time?: string
          draw_day?: string
          fee_fixed?: number
          fee_percent?: number
          id?: string
          is_active?: boolean
          max_tickets_per_txn?: number
          min_prize?: number
          min_start_amount?: number
          prize_pct_first?: number
          prize_pct_second?: number
          prize_pct_third?: number
          split_to_dime_percent?: number
          split_to_jackpot_percent?: number
          split_to_referred_dime_percent?: number
          ticket_per_dollar?: number
          time_zone?: string
        }
        Relationships: []
      }
      jackpot_draws: {
        Row: {
          created_at: string
          drawn_code: string
          executed_at: string
          had_winner: boolean
          id: string
          pool_id: string | null
          pool_snapshot: number
        }
        Insert: {
          created_at?: string
          drawn_code: string
          executed_at?: string
          had_winner?: boolean
          id?: string
          pool_id?: string | null
          pool_snapshot?: number
        }
        Update: {
          created_at?: string
          drawn_code?: string
          executed_at?: string
          had_winner?: boolean
          id?: string
          pool_id?: string | null
          pool_snapshot?: number
        }
        Relationships: []
      }
      jackpot_ledger: {
        Row: {
          created_at: string
          dime_id: string | null
          fee_amount: number
          fee_fixed: number
          fee_percent: number
          gross_amount: number
          id: string
          referred_dime_id: string | null
          tip_id: string | null
          tipper_id: string | null
          to_company: number
          to_dime: number
          to_jackpot: number
          to_referred_dime: number
        }
        Insert: {
          created_at?: string
          dime_id?: string | null
          fee_amount?: number
          fee_fixed?: number
          fee_percent?: number
          gross_amount?: number
          id?: string
          referred_dime_id?: string | null
          tip_id?: string | null
          tipper_id?: string | null
          to_company?: number
          to_dime?: number
          to_jackpot?: number
          to_referred_dime?: number
        }
        Update: {
          created_at?: string
          dime_id?: string | null
          fee_amount?: number
          fee_fixed?: number
          fee_percent?: number
          gross_amount?: number
          id?: string
          referred_dime_id?: string | null
          tip_id?: string | null
          tipper_id?: string | null
          to_company?: number
          to_dime?: number
          to_jackpot?: number
          to_referred_dime?: number
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_ledger_dime_id_fkey"
            columns: ["dime_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jackpot_ledger_referred_dime_id_fkey"
            columns: ["referred_dime_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jackpot_ledger_tipper_id_fkey"
            columns: ["tipper_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jackpot_pools: {
        Row: {
          created_at: string
          current_amount: number
          guaranteed_draw: boolean
          id: string
          max_tickets: number | null
          period_end: string | null
          period_start: string
          rollover_amount: number
          sales_resume_at: string | null
          sold_out_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          guaranteed_draw?: boolean
          id?: string
          max_tickets?: number | null
          period_end?: string | null
          period_start?: string
          rollover_amount?: number
          sales_resume_at?: string | null
          sold_out_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          guaranteed_draw?: boolean
          id?: string
          max_tickets?: number | null
          period_end?: string | null
          period_start?: string
          rollover_amount?: number
          sales_resume_at?: string | null
          sold_out_at?: string | null
          status?: string
        }
        Relationships: []
      }
      jackpot_tickets: {
        Row: {
          code: string | null
          created_at: string | null
          dime_id: string | null
          draw_date: string
          id: string
          is_winner: boolean | null
          pool_id: string | null
          referred_dime_id: string | null
          source: string | null
          source_transaction_id: string | null
          ticket_code: string | null
          tickets_count: number
          tip_id: string | null
          tipped_user_id: string | null
          tipper_id: string | null
          user_id: string | null
          year: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          dime_id?: string | null
          draw_date?: string
          id?: string
          is_winner?: boolean | null
          pool_id?: string | null
          referred_dime_id?: string | null
          source?: string | null
          source_transaction_id?: string | null
          ticket_code?: string | null
          tickets_count?: number
          tip_id?: string | null
          tipped_user_id?: string | null
          tipper_id?: string | null
          user_id?: string | null
          year?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          dime_id?: string | null
          draw_date?: string
          id?: string
          is_winner?: boolean | null
          pool_id?: string | null
          referred_dime_id?: string | null
          source?: string | null
          source_transaction_id?: string | null
          ticket_code?: string | null
          tickets_count?: number
          tip_id?: string | null
          tipped_user_id?: string | null
          tipper_id?: string | null
          user_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_tickets_dime_id_fkey"
            columns: ["dime_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jackpot_tickets_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "jackpot_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jackpot_tickets_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "v_jackpot_active_pool"
            referencedColumns: ["pool_id"]
          },
          {
            foreignKeyName: "jackpot_tickets_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "v_jackpot_current_pool"
            referencedColumns: ["pool_id"]
          },
          {
            foreignKeyName: "jackpot_tickets_referred_dime_id_fkey"
            columns: ["referred_dime_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jackpot_tickets_tipper_id_fkey"
            columns: ["tipper_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jackpot_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jackpot_winners: {
        Row: {
          amount: number | null
          amount_won: number | null
          created_at: string | null
          draw_date: string | null
          draw_id: string | null
          id: string
          percentage: number | null
          place: number | null
          profile_photo: string | null
          role: string | null
          status: string
          user_id: string | null
          username: string | null
          year: number | null
        }
        Insert: {
          amount?: number | null
          amount_won?: number | null
          created_at?: string | null
          draw_date?: string | null
          draw_id?: string | null
          id?: string
          percentage?: number | null
          place?: number | null
          profile_photo?: string | null
          role?: string | null
          status?: string
          user_id?: string | null
          username?: string | null
          year?: number | null
        }
        Update: {
          amount?: number | null
          amount_won?: number | null
          created_at?: string | null
          draw_date?: string | null
          draw_id?: string | null
          id?: string
          percentage?: number | null
          place?: number | null
          profile_photo?: string | null
          role?: string | null
          status?: string
          user_id?: string | null
          username?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_winners_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "jackpot_draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jackpot_winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      media_comments: {
        Row: {
          comment_text: string
          created_at: string | null
          id: string
          media_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          id?: string
          media_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          id?: string
          media_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_comments_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "user_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      media_likes: {
        Row: {
          created_at: string | null
          id: string
          media_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          media_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_likes_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "user_media"
            referencedColumns: ["id"]
          },
        ]
      }
      media_replies: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          reply_text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          reply_text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          reply_text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_replies_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "media_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_limits: {
        Row: {
          created_at: string | null
          current_count: number | null
          id: string
          is_active: boolean | null
          max_count: number
          membership_type: string
          updated_at: string | null
          user_type: string
        }
        Insert: {
          created_at?: string | null
          current_count?: number | null
          id?: string
          is_active?: boolean | null
          max_count: number
          membership_type: string
          updated_at?: string | null
          user_type: string
        }
        Update: {
          created_at?: string | null
          current_count?: number | null
          id?: string
          is_active?: boolean | null
          max_count?: number
          membership_type?: string
          updated_at?: string | null
          user_type?: string
        }
        Relationships: []
      }
      membership_upgrades: {
        Row: {
          agreement_sent: boolean | null
          agreement_signed: boolean | null
          created_at: string | null
          id: string
          installment_count: number | null
          installment_plan: boolean | null
          installments_paid: number | null
          notarization_completed: boolean | null
          notarization_scheduled: boolean | null
          payment_amount: number
          payment_method: string
          payment_status: string | null
          paypal_order_id: string | null
          paypal_payment_id: string | null
          phone_number: string | null
          status: string | null
          updated_at: string | null
          upgrade_status: string | null
          upgrade_type: string
          user_id: string
        }
        Insert: {
          agreement_sent?: boolean | null
          agreement_signed?: boolean | null
          created_at?: string | null
          id?: string
          installment_count?: number | null
          installment_plan?: boolean | null
          installments_paid?: number | null
          notarization_completed?: boolean | null
          notarization_scheduled?: boolean | null
          payment_amount: number
          payment_method: string
          payment_status?: string | null
          paypal_order_id?: string | null
          paypal_payment_id?: string | null
          phone_number?: string | null
          status?: string | null
          updated_at?: string | null
          upgrade_status?: string | null
          upgrade_type: string
          user_id: string
        }
        Update: {
          agreement_sent?: boolean | null
          agreement_signed?: boolean | null
          created_at?: string | null
          id?: string
          installment_count?: number | null
          installment_plan?: boolean | null
          installments_paid?: number | null
          notarization_completed?: boolean | null
          notarization_scheduled?: boolean | null
          payment_amount?: number
          payment_method?: string
          payment_status?: string | null
          paypal_order_id?: string | null
          paypal_payment_id?: string | null
          phone_number?: string | null
          status?: string | null
          updated_at?: string | null
          upgrade_status?: string | null
          upgrade_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_upgrades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_direct_message: boolean | null
          is_notification: boolean | null
          media_type: string | null
          media_url: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_direct_message?: boolean | null
          is_notification?: boolean | null
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_direct_message?: boolean | null
          is_notification?: boolean | null
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          media_type: string | null
          media_url: string | null
          message: string
          recipient_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message: string
          recipient_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message?: string
          recipient_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          event_host_commission: number | null
          event_id: string | null
          id: string
          payment_status: string | null
          payment_type: string
          paypal_order_id: string | null
          paypal_payment_id: string | null
          paypal_transaction_id: string | null
          platform_fee: number | null
          referred_by: string | null
          referrer_commission: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          event_host_commission?: number | null
          event_id?: string | null
          id?: string
          payment_status?: string | null
          payment_type: string
          paypal_order_id?: string | null
          paypal_payment_id?: string | null
          paypal_transaction_id?: string | null
          platform_fee?: number | null
          referred_by?: string | null
          referrer_commission?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          event_host_commission?: number | null
          event_id?: string | null
          id?: string
          payment_status?: string | null
          payment_type?: string
          paypal_order_id?: string | null
          paypal_payment_id?: string | null
          paypal_transaction_id?: string | null
          platform_fee?: number | null
          referred_by?: string | null
          referrer_commission?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          amount: number
          cashapp_cashtag: string | null
          cashapp_email: string | null
          cashapp_phone: string | null
          check_address_line1: string | null
          check_address_line2: string | null
          check_city: string | null
          check_country: string | null
          check_full_name: string | null
          check_state: string | null
          check_zip_code: string | null
          created_at: string | null
          id: string
          notes: string | null
          payout_method: string
          paypal_email: string | null
          processed_date: string | null
          request_date: string | null
          request_status: string | null
          scheduled_payout_date: string | null
          updated_at: string | null
          user_id: string
          wire_account_holder_name: string | null
          wire_account_number: string | null
          wire_account_type: string | null
          wire_bank_address: string | null
          wire_bank_name: string | null
          wire_routing_number: string | null
          wire_swift_code: string | null
        }
        Insert: {
          amount: number
          cashapp_cashtag?: string | null
          cashapp_email?: string | null
          cashapp_phone?: string | null
          check_address_line1?: string | null
          check_address_line2?: string | null
          check_city?: string | null
          check_country?: string | null
          check_full_name?: string | null
          check_state?: string | null
          check_zip_code?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payout_method: string
          paypal_email?: string | null
          processed_date?: string | null
          request_date?: string | null
          request_status?: string | null
          scheduled_payout_date?: string | null
          updated_at?: string | null
          user_id: string
          wire_account_holder_name?: string | null
          wire_account_number?: string | null
          wire_account_type?: string | null
          wire_bank_address?: string | null
          wire_bank_name?: string | null
          wire_routing_number?: string | null
          wire_swift_code?: string | null
        }
        Update: {
          amount?: number
          cashapp_cashtag?: string | null
          cashapp_email?: string | null
          cashapp_phone?: string | null
          check_address_line1?: string | null
          check_address_line2?: string | null
          check_city?: string | null
          check_country?: string | null
          check_full_name?: string | null
          check_state?: string | null
          check_zip_code?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payout_method?: string
          paypal_email?: string | null
          processed_date?: string | null
          request_date?: string | null
          request_status?: string | null
          scheduled_payout_date?: string | null
          updated_at?: string | null
          user_id?: string
          wire_account_holder_name?: string | null
          wire_account_number?: string | null
          wire_account_type?: string | null
          wire_bank_address?: string | null
          wire_bank_name?: string | null
          wire_routing_number?: string | null
          wire_swift_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      paypal_webhook_events: {
        Row: {
          event_id: string
          event_type: string | null
          id: string
          payload: Json | null
          processed_at: string | null
          received_at: string
        }
        Insert: {
          event_id: string
          event_type?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          received_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          received_at?: string
        }
        Relationships: []
      }
      quarterly_requirements: {
        Row: {
          base_payout: number | null
          created_at: string | null
          deductions: number | null
          earnings_threshold: number | null
          events_attended: number | null
          events_required: number | null
          final_payout: number | null
          guarantee_active: boolean | null
          guarantee_voided_at: string | null
          id: string
          payout_status: string | null
          platform_earnings: number | null
          quarter: number
          updated_at: string | null
          user_id: string
          weekly_content_completed: number | null
          weekly_content_required: number | null
          weekly_messages_completed: number | null
          weekly_messages_required: number | null
          weekly_referrals_completed: number | null
          weekly_referrals_required: number | null
          year: number
        }
        Insert: {
          base_payout?: number | null
          created_at?: string | null
          deductions?: number | null
          earnings_threshold?: number | null
          events_attended?: number | null
          events_required?: number | null
          final_payout?: number | null
          guarantee_active?: boolean | null
          guarantee_voided_at?: string | null
          id?: string
          payout_status?: string | null
          platform_earnings?: number | null
          quarter: number
          updated_at?: string | null
          user_id: string
          weekly_content_completed?: number | null
          weekly_content_required?: number | null
          weekly_messages_completed?: number | null
          weekly_messages_required?: number | null
          weekly_referrals_completed?: number | null
          weekly_referrals_required?: number | null
          year: number
        }
        Update: {
          base_payout?: number | null
          created_at?: string | null
          deductions?: number | null
          earnings_threshold?: number | null
          events_attended?: number | null
          events_required?: number | null
          final_payout?: number | null
          guarantee_active?: boolean | null
          guarantee_voided_at?: string | null
          id?: string
          payout_status?: string | null
          platform_earnings?: number | null
          quarter?: number
          updated_at?: string | null
          user_id?: string
          weekly_content_completed?: number | null
          weekly_content_required?: number | null
          weekly_messages_completed?: number | null
          weekly_messages_required?: number | null
          weekly_referrals_completed?: number | null
          weekly_referrals_required?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_requirements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          created_at: string | null
          id: string
          rater_id: string | null
          rating: number
          updated_at: string | null
          user_id: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          rater_id?: string | null
          rating: number
          updated_at?: string | null
          user_id?: string | null
          year?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          rater_id?: string | null
          rating?: number
          updated_at?: string | null
          user_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      silver_plus_counter: {
        Row: {
          current_count: number | null
          id: string
          max_count: number | null
          updated_at: string | null
        }
        Insert: {
          current_count?: number | null
          id?: string
          max_count?: number | null
          updated_at?: string | null
        }
        Update: {
          current_count?: number | null
          id?: string
          max_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_option: string | null
          cadence: string
          created_at: string
          cycles_paid: number
          id: string
          membership_expires_at: string | null
          next_billing_time: string | null
          status: string | null
          subscription_id: string
          tier: string
          total_cycles: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_option?: string | null
          cadence: string
          created_at?: string
          cycles_paid?: number
          id?: string
          membership_expires_at?: string | null
          next_billing_time?: string | null
          status?: string | null
          subscription_id: string
          tier: string
          total_cycles?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_option?: string | null
          cadence?: string
          created_at?: string
          cycles_paid?: number
          id?: string
          membership_expires_at?: string | null
          next_billing_time?: string | null
          status?: string | null
          subscription_id?: string
          tier?: string
          total_cycles?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string | null
          id: string
          ticket_number: string
          tip_id: string | null
          user_Id: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ticket_number: string
          tip_id?: string | null
          user_Id?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ticket_number?: string
          tip_id?: string | null
          user_Id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_Id_fkey"
            columns: ["user_Id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          created_at: string | null
          id: string
          paypal_transaction_id: string | null
          referrer_username: string | null
          status: string | null
          tickets_generated: number
          tip_amount: number
          tipped_username: string
          tipper_username: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          paypal_transaction_id?: string | null
          referrer_username?: string | null
          status?: string | null
          tickets_generated: number
          tip_amount: number
          tipped_username: string
          tipper_username: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          paypal_transaction_id?: string | null
          referrer_username?: string | null
          status?: string | null
          tickets_generated?: number
          tip_amount?: number
          tipped_username?: string
          tipper_username?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tips_transactions: {
        Row: {
          card_brand: string | null
          card_last_four: string | null
          card_payment_intent_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          is_anonymous: boolean | null
          message: string | null
          payment_id: string | null
          payment_method: string
          payment_status: string | null
          paypal_order_id: string | null
          paypal_payment_id: string | null
          referrer_commission: number | null
          referrer_username: string | null
          tickets_generated: number | null
          tip_amount: number
          tipped_user_id: string | null
          tipped_username: string
          tipper_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          card_brand?: string | null
          card_last_four?: string | null
          card_payment_intent_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          payment_id?: string | null
          payment_method: string
          payment_status?: string | null
          paypal_order_id?: string | null
          paypal_payment_id?: string | null
          referrer_commission?: number | null
          referrer_username?: string | null
          tickets_generated?: number | null
          tip_amount: number
          tipped_user_id?: string | null
          tipped_username: string
          tipper_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          card_brand?: string | null
          card_last_four?: string | null
          card_payment_intent_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          payment_id?: string | null
          payment_method?: string
          payment_status?: string | null
          paypal_order_id?: string | null
          paypal_payment_id?: string | null
          referrer_commission?: number | null
          referrer_username?: string | null
          tickets_generated?: number | null
          tip_amount?: number
          tipped_user_id?: string | null
          tipped_username?: string
          tipper_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tips_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_transactions_tipped_user_id_fkey"
            columns: ["tipped_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_transactions_tipper_user_id_fkey"
            columns: ["tipper_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_events: {
        Row: {
          created_at: string | null
          event_id: string
          guest_name: string | null
          id: string
          payment_id: string | null
          payment_status: string | null
          referred_by: string | null
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          guest_name?: string | null
          id?: string
          payment_id?: string | null
          payment_status?: string | null
          referred_by?: string | null
          user_id: string
          username: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          guest_name?: string | null
          id?: string
          payment_id?: string | null
          payment_status?: string | null
          referred_by?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_media: {
        Row: {
          access_restricted: boolean | null
          content_tier: string | null
          created_at: string | null
          file_size: number | null
          filename: string | null
          flagged: boolean | null
          id: string
          is_nude: boolean | null
          is_xrated: boolean | null
          media_type: string
          media_url: string
          storage_path: string | null
          updated_at: string | null
          upload_date: string | null
          user_id: string
          warning_message: string | null
        }
        Insert: {
          access_restricted?: boolean | null
          content_tier?: string | null
          created_at?: string | null
          file_size?: number | null
          filename?: string | null
          flagged?: boolean | null
          id?: string
          is_nude?: boolean | null
          is_xrated?: boolean | null
          media_type: string
          media_url: string
          storage_path?: string | null
          updated_at?: string | null
          upload_date?: string | null
          user_id: string
          warning_message?: string | null
        }
        Update: {
          access_restricted?: boolean | null
          content_tier?: string | null
          created_at?: string | null
          file_size?: number | null
          filename?: string | null
          flagged?: boolean | null
          id?: string
          is_nude?: boolean | null
          is_xrated?: boolean | null
          media_type?: string
          media_url?: string
          storage_path?: string | null
          updated_at?: string | null
          upload_date?: string | null
          user_id?: string
          warning_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          about_me: string | null
          address: string | null
          agreement_signed: boolean | null
          banner_photo: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          date_of_birth: string | null
          description: string | null
          diamond_plus_active: boolean | null
          diamond_plus_payment_id: string | null
          diamond_plus_signed_at: string | null
          email: string
          first_name: string | null
          front_page_photo: string | null
          gender: string | null
          hash_type: string | null
          id: string
          is_ranked: boolean | null
          last_name: string | null
          liked_by: string | null
          likes: number | null
          lottery_tickets: number | null
          membership_count_position: number | null
          membership_tier: string | null
          membership_type: string | null
          mobile_number: string | null
          notarization_completed: boolean | null
          occupation: string | null
          overrides: number | null
          password_hash: string
          paypal_email: string | null
          phone_number: string | null
          profile_photo: string | null
          rank_number: number | null
          referral_fees: number | null
          referred_by: string | null
          referred_by_photo: string | null
          register_order: number | null
          silver_plus_active: boolean | null
          silver_plus_joined_at: string | null
          silver_plus_membership_number: number | null
          silver_plus_payment_id: string | null
          silver_plus_purchased_at: string | null
          state: string | null
          tips_earned: number | null
          updated_at: string | null
          user_rank: number | null
          user_type: string | null
          username: string
          video_urls: string[] | null
          weekly_earnings: number | null
          weekly_hours: number | null
          zip: string | null
        }
        Insert: {
          about_me?: string | null
          address?: string | null
          agreement_signed?: boolean | null
          banner_photo?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          description?: string | null
          diamond_plus_active?: boolean | null
          diamond_plus_payment_id?: string | null
          diamond_plus_signed_at?: string | null
          email: string
          first_name?: string | null
          front_page_photo?: string | null
          gender?: string | null
          hash_type?: string | null
          id?: string
          is_ranked?: boolean | null
          last_name?: string | null
          liked_by?: string | null
          likes?: number | null
          lottery_tickets?: number | null
          membership_count_position?: number | null
          membership_tier?: string | null
          membership_type?: string | null
          mobile_number?: string | null
          notarization_completed?: boolean | null
          occupation?: string | null
          overrides?: number | null
          password_hash: string
          paypal_email?: string | null
          phone_number?: string | null
          profile_photo?: string | null
          rank_number?: number | null
          referral_fees?: number | null
          referred_by?: string | null
          referred_by_photo?: string | null
          register_order?: number | null
          silver_plus_active?: boolean | null
          silver_plus_joined_at?: string | null
          silver_plus_membership_number?: number | null
          silver_plus_payment_id?: string | null
          silver_plus_purchased_at?: string | null
          state?: string | null
          tips_earned?: number | null
          updated_at?: string | null
          user_rank?: number | null
          user_type?: string | null
          username: string
          video_urls?: string[] | null
          weekly_earnings?: number | null
          weekly_hours?: number | null
          zip?: string | null
        }
        Update: {
          about_me?: string | null
          address?: string | null
          agreement_signed?: boolean | null
          banner_photo?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          description?: string | null
          diamond_plus_active?: boolean | null
          diamond_plus_payment_id?: string | null
          diamond_plus_signed_at?: string | null
          email?: string
          first_name?: string | null
          front_page_photo?: string | null
          gender?: string | null
          hash_type?: string | null
          id?: string
          is_ranked?: boolean | null
          last_name?: string | null
          liked_by?: string | null
          likes?: number | null
          lottery_tickets?: number | null
          membership_count_position?: number | null
          membership_tier?: string | null
          membership_type?: string | null
          mobile_number?: string | null
          notarization_completed?: boolean | null
          occupation?: string | null
          overrides?: number | null
          password_hash?: string
          paypal_email?: string | null
          phone_number?: string | null
          profile_photo?: string | null
          rank_number?: number | null
          referral_fees?: number | null
          referred_by?: string | null
          referred_by_photo?: string | null
          register_order?: number | null
          silver_plus_active?: boolean | null
          silver_plus_joined_at?: string | null
          silver_plus_membership_number?: number | null
          silver_plus_payment_id?: string | null
          silver_plus_purchased_at?: string | null
          state?: string | null
          tips_earned?: number | null
          updated_at?: string | null
          user_rank?: number | null
          user_type?: string | null
          username?: string
          video_urls?: string[] | null
          weekly_earnings?: number | null
          weekly_hours?: number | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_liked_by_fkey"
            columns: ["liked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_earnings: {
        Row: {
          amount: number | null
          bonus_earnings: number | null
          created_at: string | null
          id: string
          referral_earnings: number | null
          tip_earnings: number | null
          updated_at: string | null
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          amount?: number | null
          bonus_earnings?: number | null
          created_at?: string | null
          id?: string
          referral_earnings?: number | null
          tip_earnings?: number | null
          updated_at?: string | null
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          amount?: number | null
          bonus_earnings?: number | null
          created_at?: string | null
          id?: string
          referral_earnings?: number | null
          tip_earnings?: number | null
          updated_at?: string | null
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_earnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      elite_seat_stats: {
        Row: {
          seats_available: number | null
          seats_max: number | null
          seats_taken: number | null
        }
        Relationships: []
      }
      v_jackpot_active_pool: {
        Row: {
          current_amount: number | null
          guaranteed_draw: boolean | null
          max_tickets: number | null
          period_end: string | null
          period_start: string | null
          pool_id: string | null
          rollover_amount: number | null
          sales_resume_at: string | null
          sold_out_at: string | null
          status: string | null
          total: number | null
        }
        Relationships: []
      }
      v_jackpot_current_pool: {
        Row: {
          created_at: string | null
          current_amount: number | null
          period_end: string | null
          period_start: string | null
          pool_id: string | null
          rollover_amount: number | null
          status: string | null
          total: number | null
        }
        Relationships: []
      }
      v_jackpot_latest_winners: {
        Row: {
          amount: number | null
          draw_id: string | null
          drawn_code: string | null
          executed_at: string | null
          percentage: number | null
          place: number | null
          role: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_winners_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "jackpot_draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jackpot_winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      v_jackpot_user_tickets: {
        Row: {
          tickets: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_tickets_tipper_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      api_jackpot_close_and_open: {
        Args: { p_now?: string; p_tz?: string }
        Returns: Json
      }
      api_jackpot_run_draw: { Args: { p_now?: string }; Returns: Json }
      api_jackpot_run_draw_force: {
        Args: { p_force_code: string; p_now?: string }
        Returns: Json
      }
      calculate_next_payout_date: { Args: never; Returns: string }
      check_admin_by_user_id: { Args: { p_user_id: string }; Returns: boolean }
      check_silver_plus_availability: {
        Args: never
        Returns: {
          available: boolean
          current_count: number
          max_count: number
          remaining: number
        }[]
      }
      check_user_exists: { Args: { username: string }; Returns: boolean }
      delete_expired_notifications: { Args: never; Returns: undefined }
      get_or_create_weekly_earnings: {
        Args: { p_user_id: string; p_week_start: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_membership_count: {
        Args: { membership_type_param: string; user_type_param: string }
        Returns: undefined
      }
      increment_referral_earnings: {
        Args: { amount: number; user_id: string }
        Returns: undefined
      }
      increment_tips_earned: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      increment_weekly_referral_earnings: {
        Args: { p_amount: number; p_user_id: string; p_week_start: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      jackpot_gen_code: { Args: never; Returns: string }
      jackpot_get_active_config_vals: {
        Args: never
        Returns: {
          fee_fixed: number
          fee_percent: number
          max_tickets_per_txn: number
          min_prize: number
          min_start_amount: number
          prize_pct_first: number
          prize_pct_second: number
          prize_pct_third: number
          split_to_dime_percent: number
          split_to_jackpot_percent: number
          split_to_referred_dime_percent: number
          ticket_per_dollar: number
        }[]
      }
      jackpot_get_or_open_pool: {
        Args: { now_ts?: string }
        Returns: {
          created_at: string
          current_amount: number
          id: string
          period_end: string
          period_start: string
          rollover_amount: number
          status: string
        }[]
      }
      jackpot_next_sales_start: { Args: { now_ts: string }; Returns: string }
      jackpot_next_saturday: { Args: { p_ts: string }; Returns: string }
      jackpot_run_draw:
        | { Args: { p_force_code?: string; p_now?: string }; Returns: Json }
        | { Args: { p_now?: string }; Returns: Json }
      jackpot_run_draw_force: {
        Args: { p_code: string; p_now?: string }
        Returns: Json
      }
      jackpot_week_bounds: {
        Args: { ts: string }
        Returns: {
          period_end: string
          period_start: string
        }[]
      }
      no_duplicate_letters: { Args: { code: string }; Returns: boolean }
      process_referral_payouts: {
        Args: {
          p_direct_rate: number
          p_gross_amount: number
          p_net_amount: number
          p_payment_id: string
          p_referred_by: string
          p_upline_rate: number
          p_user_id: string
        }
        Returns: Json
      }
      process_tip_jackpot: {
        Args: {
          p_dime_id: string
          p_gross_amount: number
          p_referred_dime_id: string
          p_tip_id: string
          p_tipper_id: string
        }
        Returns: Json
      }
      update_user_silver_plus: {
        Args: {
          membership_number_param: number
          payment_id_param: string
          user_id_param: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
