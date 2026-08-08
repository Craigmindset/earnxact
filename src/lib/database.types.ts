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
  /** IP address captured on the user's first successful login. */
  registered_device_id: string | null;
  /** Unique code this user shares to invite others. */
  referral_code: string | null;
  /** EarnXact wallet balance, credited by referral bonuses etc. */
  wallet_balance: number;
  /** FK → user_profile.user_id of whoever referred this user, if any. */
  referred_by_id: string | null;
  /** Full shareable referral link built from referral_code at signup time. */
  user_referral_link: string | null;
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

export type ReferralRow = {
  id: string;
  /** FK → user_profile.user_id — the user who receives the reward. */
  referrer_id: string;
  /** FK → user_profile.user_id — the newly registered user. Unique: one reward per referee, ever. */
  referee_id: string;
  reward_amount: number;
  /** Contact info captured from the referee at reward time. */
  referee_first_name: string | null;
  referee_last_name: string | null;
  referee_email: string | null;
  referee_phone: string | null;
  /** True once this referral's reward has been claimed via claim_referral_balance(). */
  referral_claim: boolean;
  created_at: string;
};

/**
 * Denormalized, realtime-friendly summary row: one per user, updated
 * transactionally by handle_new_user() / claim_referral_balance(). Never
 * written to directly by clients — used to power live referral stats on
 * the invite-earn dashboard via Supabase Realtime (postgres_changes).
 */
export type ReferralDataRow = {
  /** UUID — FK to auth.users.id (primary key) */
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  referral_link: string | null;
  users_referred: number;
  /** Current unclaimed referral earnings, awaiting claim_referral_balance(). */
  referral_balance: number;
  last_claim_date: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * One row per user per Nigeria-calendar-day claimed via claim_daily_checkin().
 * The unique (user_id, check_in_date) constraint on the live table guarantees
 * at most one claim per user per day.
 */
export type DailyCheckinRow = {
  id: string;
  /** FK → auth.users.id */
  user_id: string;
  device_id: string;
  /** Nigeria (Africa/Lagos) calendar date this check-in was claimed on. */
  check_in_date: string;
  /** Consecutive-day streak as of this check-in (resets to 1 after a gap). */
  streak: number;
  /** Amount actually paid for this check-in (checkin_settings.reward_price at claim time). */
  reward: number;
  created_at: string;
};

/**
 * Single-row config table: reward_price is the amount every new daily
 * check-in claim currently pays out. Update this row's reward_price via SQL
 * to change the reward going forward — past daily_checkins rows keep
 * whatever amount they were actually paid.
 */
export type CheckinSettingsRow = {
  id: true;
  reward_price: number;
  updated_at: string;
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
      referrals: {
        Row: ReferralRow;
        Insert: Omit<ReferralRow, "id" | "created_at" | "reward_amount" | "referral_claim"> &
          Partial<Pick<ReferralRow, "id" | "created_at" | "reward_amount" | "referral_claim">>;
        Update: Partial<Omit<ReferralRow, "id">>;
        Relationships: [];
      };
      referral_data: {
        Row: ReferralDataRow;
        Insert: Omit<ReferralDataRow, "created_at" | "updated_at" | "users_referred" | "referral_balance" | "last_claim_date"> &
          Partial<Pick<ReferralDataRow, "created_at" | "updated_at" | "users_referred" | "referral_balance" | "last_claim_date">>;
        Update: Partial<Omit<ReferralDataRow, "user_id">>;
        Relationships: [];
      };
      daily_checkins: {
        Row: DailyCheckinRow;
        Insert: Omit<DailyCheckinRow, "id" | "created_at" | "streak" | "reward"> &
          Partial<Pick<DailyCheckinRow, "id" | "created_at" | "streak" | "reward">>;
        Update: Partial<Omit<DailyCheckinRow, "id">>;
        Relationships: [];
      };
      checkin_settings: {
        Row: CheckinSettingsRow;
        Insert: Partial<CheckinSettingsRow>;
        Update: Partial<CheckinSettingsRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_referral_balance: {
        Args: Record<string, never>;
        Returns: { claimed_amount: number; new_wallet_balance: number }[];
      };
      claim_daily_checkin: {
        Args: Record<string, never>;
        Returns: { streak: number; reward: number; new_wallet_balance: number; check_in_date: string }[];
      };
    };
    Enums: {
      account_type: AccountType;
      transaction_type: TransactionType;
      transaction_status: TransactionStatus;
      mission_period: MissionPeriod;
      mission_status: MissionStatus;
    };
  };
};
