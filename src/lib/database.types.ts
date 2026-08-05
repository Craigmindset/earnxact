// Auto-generated-style types for the Earnxact Supabase schema.
// Keep this in sync with supabase/migrations/0001_init.sql.
// Re-run `npx supabase gen types typescript --project-id <id>` to refresh from
// the live database once the project is linked.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ─── Enums ────────────────────────────────────────────────────────────────────

export type AccountType = "standard" | "premium" | "vip";
export type TransactionType = "credit" | "debit" | "withdrawal" | "bonus";
export type TransactionStatus = "pending" | "completed" | "failed";
export type MissionPeriod = "daily" | "weekly";
export type MissionStatus = "in_progress" | "completed" | "claimed";

// ─── Table Row Types ──────────────────────────────────────────────────────────

export type UserProfileRow = {
  /** UUID — FK to auth.users.id (primary key) */
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone_num: string | null;
  avatar_url: string | null;
  account_type: AccountType;
  created_at: string;
  updated_at: string;
};

export type MembershipPlanRow = {
  id: string;
  name: string;
  amount: number;
  description: string | null;
  is_available: boolean;
  created_at: string;
};

export type TransactionRow = {
  id: string;
  /** FK → auth.users.id */
  user_id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  reference: string | null;
  description: string | null;
  created_at: string;
};

export type UserMissionRow = {
  id: string;
  /** FK → auth.users.id */
  user_id: string;
  mission_id: string;
  period: MissionPeriod;
  status: MissionStatus;
  progress: number;
  reward: number;
  completed_at: string | null;
  created_at: string;
};

export type WatchVideoRow = {
  id: string;
  /** FK → auth.users.id */
  user_id: string;
  video_id: string;
  reward: number;
  watched_at: string;
};

// ─── Database shape (for the Supabase client generic) ─────────────────────────

export type Database = {
  public: {
    Tables: {
      user_profile: {
        Row: UserProfileRow;
        Insert: Omit<UserProfileRow, "created_at" | "updated_at"> &
          Partial<Pick<UserProfileRow, "created_at" | "updated_at">>;
        Update: Partial<Omit<UserProfileRow, "user_id">>;
        Relationships: [];
      };
      membership_plans: {
        Row: MembershipPlanRow;
        Insert: Omit<MembershipPlanRow, "id" | "created_at"> &
          Partial<Pick<MembershipPlanRow, "id" | "created_at">>;
        Update: Partial<Omit<MembershipPlanRow, "id">>;
        Relationships: [];
      };
      transactions: {
        Row: TransactionRow;
        Insert: Omit<TransactionRow, "id" | "created_at"> &
          Partial<Pick<TransactionRow, "id" | "created_at">>;
        Update: Partial<Omit<TransactionRow, "id">>;
        Relationships: [];
      };
      users_mission: {
        Row: UserMissionRow;
        Insert: Omit<UserMissionRow, "id" | "created_at"> &
          Partial<Pick<UserMissionRow, "id" | "created_at">>;
        Update: Partial<Omit<UserMissionRow, "id">>;
        Relationships: [];
      };
      watch_videos: {
        Row: WatchVideoRow;
        Insert: Omit<WatchVideoRow, "id" | "watched_at"> &
          Partial<Pick<WatchVideoRow, "id" | "watched_at">>;
        Update: Partial<Omit<WatchVideoRow, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      account_type: AccountType;
      transaction_type: TransactionType;
      transaction_status: TransactionStatus;
      mission_period: MissionPeriod;
      mission_status: MissionStatus;
    };
  };
};
