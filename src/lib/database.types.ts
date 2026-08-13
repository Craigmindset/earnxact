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
  /** FK → membership_plans.id — the user's currently chosen/active plan. */
  membership_plan_id: string | null;
  /**
   * bcrypt hash (pgcrypto crypt()) of the user's 4-digit withdrawal PIN, or
   * null if none set yet. NEVER select this column directly from client
   * code - check/verify a PIN only via the has_withdrawal_pin() /
   * set_withdrawal_pin() / reset_withdrawal_pin() / create_withdrawal_request()
   * RPCs, which are the only things that ever read or write it.
   */
  pin_hash: string | null;
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
  /** Scopes a claim to the exact daily/weekly window it was earned in, e.g. '2026-08-10' or '2026-W32'. */
  period_key: string | null;
  completed_at: string | null;
  created_at: string;
};

/**
 * Raw ledger of every reward-wall payout a user has been credited for,
 * written only by each provider's postback route (e.g. /api/postbacks/cpx).
 * The unique (provider, external_trans_id) constraint makes postbacks
 * idempotent - a duplicate delivery of the same transaction is a no-op.
 */
export type OfferwallTransactionRow = {
  id: string;
  /** FK → auth.users.id */
  user_id: string;
  /** e.g. 'cpx' — add more providers (TimeWall, AdGem…) without a schema change. */
  provider: string;
  /** The transaction/click id supplied by the provider's postback. */
  external_trans_id: string;
  amount: number;
  status: "credited" | "reversed";
  credited_at: string;
};

/**
 * Admin-managed catalog of the missions on /dashboard/missions that are
 * backed by real offerwall data. get_mission_status()/claim_mission() read
 * this table server-side so a client can never spoof its reward or goal.
 */
export type MissionCatalogRow = {
  mission_id: string;
  period: MissionPeriod;
  goal_type: "provider_amount" | "distinct_providers" | "wall_total_amount";
  goal_provider: string | null;
  goal_target: number;
  reward: number;
  is_active: boolean;
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
 * One row per membership-plan purchase made by a referred user, awarding
 * the referrer a 10% commission — separate from ReferralRow (the one-time
 * ₦50 signup reward) since a referee can purchase/upgrade multiple times.
 * Written exclusively by apply_membership_payment(); claimed via
 * claim_referral_balance() alongside the signup-reward ledger.
 */
export type ReferralPurchaseCommissionRow = {
  id: string;
  /** FK → user_profile.user_id — the user who receives the commission. */
  referrer_id: string;
  /** FK → user_profile.user_id — the user who made the purchase. */
  referee_id: string;
  /** FK → membership_plans.id — the plan that was purchased. */
  membership_plan_id: string | null;
  plan_name: string | null;
  purchase_amount: number;
  /** 10% of purchase_amount. */
  commission_amount: number;
  /** The Paystack payment reference this commission was earned from. Unique. */
  reference: string;
  /** True once this commission has been claimed via claim_referral_balance(). */
  claimed: boolean;
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

/**
 * Catalog of the Mon-Fri daily tasks shown on /dashboard/tasks. weekday is
 * ISO (1=Monday ... 5=Friday) — admin-managed via SQL, one row per weekday.
 */
export type DailyTaskTemplateRow = {
  id: string;
  /** ISO weekday, 1 (Monday) through 5 (Friday). */
  weekday: number;
  title: string;
  description: string;
  reward: number;
  is_active: boolean;
  /** FK → membership_plans.id — which plan sees this task (categorized per plan). */
  membership_plan_id: string;
  /** Denormalized copy of membership_plans.name, kept in sync via ON UPDATE CASCADE. */
  membership_name: string;
  created_at: string;
};

/**
 * One row per user per template per Nigeria-calendar-day, written only via
 * submit_daily_task(). The unique (user_id, template_id, task_date)
 * constraint guarantees at most one submission per user per task per day.
 */
export type TaskSubmissionRow = {
  id: string;
  /** FK → auth.users.id */
  user_id: string;
  /** FK → daily_task_templates.id */
  template_id: string;
  /** Nigeria (Africa/Lagos) calendar date this task instance belongs to. */
  task_date: string;
  status: string;
  /** Cloudinary URL of the uploaded proof screenshot. */
  proof_url: string;
  /** Amount actually paid for this submission (template.reward at submit time). */
  reward: number;
  /** Set only by verify_task_submission() (admin, via SQL) - the reward is
   *  credited at that point, not at submission time. */
  task_verified: boolean;
  submitted_at: string;
};

/**
 * Global announcement an admin posts (via SQL) - shown to every signed-in
 * user on /dashboard/notifications alongside their own personal activity
 * from transactions. `is_active` lets an admin retire an old broadcast
 * without deleting it.
 */
export type AdminNotificationRow = {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  created_at: string;
};

export type WithdrawalStatus = "processing" | "completed" | "paid";

/**
 * One row per withdrawal a user initiates from /dashboard/wallet, written
 * only via create_withdrawal_request(). `status` starts at 'processing'
 * and is moved to 'completed'/'paid' by an admin directly via SQL - there
 * is no client update path. `wallet_balance` is a snapshot of the balance
 * *before* this withdrawal's amount was deducted, kept for audit purposes.
 */
export type WithdrawalRequestRow = {
  id: string;
  /** FK → auth.users.id */
  user_id: string;
  status: WithdrawalStatus;
  wallet_balance: number;
  amount_withdrawn: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  created_at: string;
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
        Relationships: [
          {
            foreignKeyName: "user_profile_membership_plan_id_fkey";
            columns: ["membership_plan_id"];
            isOneToOne: false;
            referencedRelation: "membership_plans";
            referencedColumns: ["id"];
          }
        ];
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
        Insert: Omit<UserMissionRow, "id" | "created_at" | "period_key"> &
          Partial<Pick<UserMissionRow, "id" | "created_at" | "period_key">>;
        Update: Partial<Omit<UserMissionRow, "id">>;
        Relationships: [];
      };
      offerwall_transactions: {
        Row: OfferwallTransactionRow;
        Insert: Omit<OfferwallTransactionRow, "id" | "credited_at" | "status"> &
          Partial<Pick<OfferwallTransactionRow, "id" | "credited_at" | "status">>;
        Update: Partial<Omit<OfferwallTransactionRow, "id">>;
        Relationships: [];
      };
      mission_catalog: {
        Row: MissionCatalogRow;
        Insert: Omit<MissionCatalogRow, "is_active"> & Partial<Pick<MissionCatalogRow, "is_active">>;
        Update: Partial<MissionCatalogRow>;
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
      referral_purchase_commissions: {
        Row: ReferralPurchaseCommissionRow;
        Insert: Omit<ReferralPurchaseCommissionRow, "id" | "created_at" | "claimed"> &
          Partial<Pick<ReferralPurchaseCommissionRow, "id" | "created_at" | "claimed">>;
        Update: Partial<Omit<ReferralPurchaseCommissionRow, "id">>;
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
      daily_task_templates: {
        Row: DailyTaskTemplateRow;
        Insert: Omit<DailyTaskTemplateRow, "id" | "created_at" | "is_active"> &
          Partial<Pick<DailyTaskTemplateRow, "id" | "created_at" | "is_active">>;
        Update: Partial<Omit<DailyTaskTemplateRow, "id">>;
        Relationships: [];
      };
      task_submissions: {
        Row: TaskSubmissionRow;
        Insert: Omit<TaskSubmissionRow, "id" | "status" | "submitted_at" | "task_verified"> &
          Partial<Pick<TaskSubmissionRow, "id" | "status" | "submitted_at" | "task_verified">>;
        Update: Partial<Omit<TaskSubmissionRow, "id">>;
        Relationships: [];
      };
      admin_notifications: {
        Row: AdminNotificationRow;
        Insert: Omit<AdminNotificationRow, "id" | "created_at" | "is_active"> &
          Partial<Pick<AdminNotificationRow, "id" | "created_at" | "is_active">>;
        Update: Partial<Omit<AdminNotificationRow, "id">>;
        Relationships: [];
      };
      withdrawal_requests: {
        Row: WithdrawalRequestRow;
        Insert: Omit<WithdrawalRequestRow, "id" | "created_at" | "status"> &
          Partial<Pick<WithdrawalRequestRow, "id" | "created_at" | "status">>;
        Update: Partial<Omit<WithdrawalRequestRow, "id">>;
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
      submit_daily_task: {
        Args: { p_template_id: string; p_proof_url: string };
        Returns: { status: string; reward: number; new_wallet_balance: number }[];
      };
      verify_task_submission: {
        Args: { p_submission_id: string };
        Returns: { status: string; reward: number; new_wallet_balance: number }[];
      };
      get_mission_status: {
        Args: Record<string, never>;
        Returns: {
          mission_id: string;
          period: string;
          progress: number;
          goal_target: number;
          reward: number;
          completed: boolean;
          claimed: boolean;
        }[];
      };
      claim_mission: {
        Args: { p_mission_id: string };
        Returns: { reward: number; new_wallet_balance: number }[];
      };
      credit_offerwall_transaction: {
        Args: { p_user_id: string; p_amount: number; p_reference: string; p_description: string };
        Returns: number;
      };
      has_withdrawal_pin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      set_withdrawal_pin: {
        Args: { p_pin: string };
        Returns: undefined;
      };
      reset_withdrawal_pin: {
        Args: { p_current_pin: string; p_new_pin: string };
        Returns: undefined;
      };
      create_withdrawal_request: {
        Args: {
          p_amount: number;
          p_bank_name: string;
          p_account_name: string;
          p_account_number: string;
          p_pin: string;
        };
        Returns: { request_id: string; new_wallet_balance: number }[];
      };
      apply_membership_payment: {
        Args: { p_plan_id: string; p_reference: string; p_amount: number };
        Returns: {
          new_wallet_balance: number;
          bonus_awarded: number;
          plan_name: string;
          account_type: AccountType;
        }[];
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
