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
      jackpot: {
        Row: {
          created_at: string | null;
          current_amount: number | null;
          drawing_date: string | null;
          id: string;
          status: string | null;
          user_Id: string | null;
          weekly_limit: number | null;
        };
        Insert: {
          created_at?: string | null;
          current_amount?: number | null;
          drawing_date?: string | null;
          id?: string;
          status?: string | null;
          user_Id?: string | null;
          weekly_limit?: number | null;
        };
        Update: {
          created_at?: string | null;
          current_amount?: number | null;
          drawing_date?: string | null;
          id?: string;
          status?: string | null;
          user_Id?: string | null;
          weekly_limit?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "jackpot_user_Id_fkey";
            columns: ["user_Id"];
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
          membership_type: string | null;
          mobile_number: string | null;
          occupation: string | null;
          overrides: number | null;
          password_hash: string;
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
          membership_type?: string | null;
          mobile_number?: string | null;
          occupation?: string | null;
          overrides?: number | null;
          password_hash: string;
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
          membership_type?: string | null;
          mobile_number?: string | null;
          occupation?: string | null;
          overrides?: number | null;
          password_hash?: string;
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
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_user_exists: {
        Args: { username: string };
        Returns: boolean;
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

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

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
