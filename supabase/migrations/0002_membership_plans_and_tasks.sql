-- EarnXact: membership plans + per-plan daily tasks
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
--
-- Safe to re-run any time, on any database state - every statement here is
-- guarded (IF NOT EXISTS / IF EXISTS / WHERE NOT EXISTS / ON CONFLICT DO
-- NOTHING), so re-running never deletes or duplicates anything. Unlike
-- 0001_init.sql, this file has NO destructive "reset" block at the top -
-- it only ever adds/updates the specific objects listed below:
--   - public.membership_plans:      adds a unique constraint on name, seeds
--                                    the 9 paid plan tiers (Free is seeded
--                                    by 0001_init.sql already)
--   - public.daily_task_templates:  adds the membership_name column (kept
--                                    in sync with membership_plans.name via
--                                    ON UPDATE/DELETE CASCADE), then seeds
--                                    5 Mon-Fri tasks for each paid plan
--
-- No user data (user_profile, transactions, referrals, task_submissions,
-- etc.) is touched by this file at all.

-- ─── 1. membership_plans: unique name + seed paid tiers ──────────────────────

-- name must be unique so it can be referenced by a foreign key
-- (daily_task_templates.membership_name below).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'membership_plans_name_key'
  ) then
    alter table public.membership_plans add constraint membership_plans_name_key unique (name);
  end if;
end $$;

-- Seeds the paid upgrade tiers, cheapest first. Safe to re-run - each row
-- only inserts if a plan with that exact name doesn't already exist, so
-- editing a plan's amount/description afterwards is done via a plain
-- `update public.membership_plans set ... where name = '...'` instead
-- (re-running this script won't revert an admin's manual edit).
insert into public.membership_plans (name, amount, description, is_available)
select v.name, v.amount, v.description, true
from (
  values
    ('Task class1', 5000::numeric, 'Entry-level paid plan.'),
    ('Task Class2', 10000::numeric, 'Second tier paid plan.'),
    ('Upscale Class', 20000::numeric, 'Upscale tier paid plan.'),
    ('Supervisor Class', 50000::numeric, 'Supervisor tier paid plan.'),
    ('Junior Manager', 100000::numeric, 'Junior Manager tier paid plan.'),
    ('mid executive', 200000::numeric, 'Mid Executive tier paid plan.'),
    ('Excecutive', 300000::numeric, 'Executive tier paid plan.'),
    ('Senior Executive', 500000::numeric, 'Senior Executive tier paid plan.'),
    ('Regional Manager', 1000000::numeric, 'Regional Manager tier paid plan.')
) as v(name, amount, description)
where not exists (select 1 from public.membership_plans where name = v.name);

-- ─── 2. daily_task_templates: add membership_name column ─────────────────────
-- Deliberately a single DO block (not several separate top-level
-- statements) so it can never be partially run - pasting/selecting only
-- part of it is a syntax error rather than a silent partial migration.
do $$
declare
  v_col_type text;
begin
  -- membership_plan_id: defensive check in case an earlier/unrelated
  -- attempt left this column with the wrong type (e.g. integer instead of
  -- uuid). It only ever holds admin-authored catalog data (never user
  -- data), so it's safe to drop and recreate with the correct type.
  select data_type into v_col_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'daily_task_templates' and column_name = 'membership_plan_id';

  if v_col_type is not null and v_col_type <> 'uuid' then
    execute 'alter table public.daily_task_templates drop column membership_plan_id';
    execute 'alter table public.daily_task_templates add column membership_plan_id uuid references public.membership_plans(id) on delete cascade';
    update public.daily_task_templates
    set membership_plan_id = (select id from public.membership_plans where name = 'Free' limit 1)
    where membership_plan_id is null;
    execute 'alter table public.daily_task_templates alter column membership_plan_id set not null';
  end if;

  -- membership_name: denormalized copy of the plan name, kept in sync via
  -- "on update cascade" (so renaming a plan renames it here too) and "on
  -- delete cascade" (so deleting a plan removes its task rows). Requires
  -- membership_plans.name to be unique (added in step 1 above).
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'daily_task_templates' and column_name = 'membership_name'
  ) then
    execute 'alter table public.daily_task_templates add column membership_name text';
  end if;

  update public.daily_task_templates t
  set membership_name = mp.name
  from public.membership_plans mp
  where t.membership_plan_id = mp.id
    and t.membership_name is null;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'daily_task_templates'
      and column_name = 'membership_name' and is_nullable = 'YES'
  ) then
    execute 'alter table public.daily_task_templates alter column membership_name set not null';
  end if;

  execute 'alter table public.daily_task_templates drop constraint if exists daily_task_templates_membership_name_fkey';
  execute 'alter table public.daily_task_templates add constraint daily_task_templates_membership_name_fkey foreign key (membership_name) references public.membership_plans(name) on update cascade on delete cascade';

  execute 'create index if not exists daily_task_templates_membership_name_idx on public.daily_task_templates(membership_name)';
end $$;

-- ─── 3. Seed 5 Mon-Fri tasks for each paid plan ───────────────────────────────
-- (Free's 5 tasks are already seeded by 0001_init.sql.) Reward scales with
-- plan tier; task content/difficulty escalates with the plan's level of
-- responsibility. Safe to re-run - matched against the
-- (weekday, membership_plan_id) unique constraint, so this only ever
-- inserts rows that don't already exist. To retune reward/title/
-- description afterwards, an admin edits rows directly via SQL.
insert into public.daily_task_templates (weekday, title, description, reward, membership_plan_id, membership_name)
select v.weekday, v.title, v.description, v.reward, mp.id, mp.name
from (
  values
    -- Task class1 (reward 20.00)
    (1::smallint, 'Task Class 1 Monday Task', 'Join the Task Class 1 Telegram group and share your unique referral link with 3 contacts. Upload a screenshot of the shares as proof.', 20.00::numeric, 'Task class1'),
    (2::smallint, 'Task Class 1 Tuesday Task', 'Post your EarnXact referral link on your WhatsApp status and keep it up for at least 6 hours. Upload a screenshot as proof.', 20.00::numeric, 'Task class1'),
    (3::smallint, 'Task Class 1 Wednesday Task', 'Follow EarnXact on Instagram and Facebook, then share our latest post to your timeline. Upload a screenshot of both follows as proof.', 20.00::numeric, 'Task class1'),
    (4::smallint, 'Task Class 1 Thursday Task', 'Refer 1 new member into your Task Class 1 circle and confirm their signup. Upload a screenshot of the referral confirmation.', 20.00::numeric, 'Task class1'),
    (5::smallint, 'Task Class 1 Friday Task', 'Comment on our official Telegram channel''s pinned announcement and tag 2 friends. Upload a screenshot as proof.', 20.00::numeric, 'Task class1'),

    -- Task Class2 (reward 40.00)
    (1::smallint, 'Task Class 2 Monday Task', 'Share your referral link in 3 WhatsApp groups and 1 Telegram group. Upload screenshots of all shares as proof.', 40.00::numeric, 'Task Class2'),
    (2::smallint, 'Task Class 2 Tuesday Task', 'Create a short post about EarnXact on Facebook or Instagram explaining how it works. Upload a screenshot of the published post.', 40.00::numeric, 'Task Class2'),
    (3::smallint, 'Task Class 2 Wednesday Task', 'Refer 2 new users into Task Class 2 and confirm both signups. Upload a screenshot of the referral dashboard showing the new signups.', 40.00::numeric, 'Task Class2'),
    (4::smallint, 'Task Class 2 Thursday Task', 'Post a short WhatsApp status or voice note explaining EarnXact to your contacts. Upload a screenshot of the status/voice note as proof.', 40.00::numeric, 'Task Class2'),
    (5::smallint, 'Task Class 2 Friday Task', 'Engage with 5 posts on EarnXact''s official X (Twitter) page (like, retweet, or comment). Upload a screenshot of your engagement.', 40.00::numeric, 'Task Class2'),

    -- Upscale Class (reward 80.00)
    (1::smallint, 'Upscale Class Monday Task', 'Organize a WhatsApp group of at least 5 contacts and introduce them to EarnXact with your referral link. Upload a screenshot of the group and link share.', 80.00::numeric, 'Upscale Class'),
    (2::smallint, 'Upscale Class Tuesday Task', 'Refer 2 new users into the Upscale Class and help them complete their first task. Upload a screenshot confirming both signups.', 80.00::numeric, 'Upscale Class'),
    (3::smallint, 'Upscale Class Wednesday Task', 'Publish a short review or testimonial about EarnXact on your social media page (Facebook, Instagram, or X). Upload a screenshot of the post.', 80.00::numeric, 'Upscale Class'),
    (4::smallint, 'Upscale Class Thursday Task', 'Share your referral link with 5 contacts across at least 2 different platforms (WhatsApp, Telegram, Facebook, etc). Upload screenshots of each share.', 80.00::numeric, 'Upscale Class'),
    (5::smallint, 'Upscale Class Friday Task', 'Host a mini Q&A session in your WhatsApp or Telegram group answering EarnXact questions from at least 3 people. Upload a screenshot of the conversation.', 80.00::numeric, 'Upscale Class'),

    -- Supervisor Class (reward 200.00)
    (1::smallint, 'Supervisor Class Monday Task', 'Recruit and confirm 3 new referrals into your Supervisor Class network this week. Upload a screenshot of the referral dashboard.', 200.00::numeric, 'Supervisor Class'),
    (2::smallint, 'Supervisor Class Tuesday Task', 'Set up a dedicated WhatsApp or Telegram group for your downline and share EarnXact updates with at least 8 members. Upload a screenshot of the group.', 200.00::numeric, 'Supervisor Class'),
    (3::smallint, 'Supervisor Class Wednesday Task', 'Follow up with 3 of your referrals to confirm they''ve submitted their own daily tasks. Upload a screenshot of the follow-up conversation.', 200.00::numeric, 'Supervisor Class'),
    (4::smallint, 'Supervisor Class Thursday Task', 'Create and share a promotional post (flyer, video, or write-up) about EarnXact across 2 social platforms. Upload screenshots of both posts.', 200.00::numeric, 'Supervisor Class'),
    (5::smallint, 'Supervisor Class Friday Task', 'Host a short training or orientation session (voice note, call, or written guide) for your new referrals on how to use EarnXact. Upload a screenshot of the material shared.', 200.00::numeric, 'Supervisor Class'),

    -- Junior Manager (reward 400.00)
    (1::smallint, 'Junior Manager Monday Task', 'Onboard 3 new referrals into your Junior Manager team and confirm they''ve completed their first task. Upload a screenshot of the team''s progress.', 400.00::numeric, 'Junior Manager'),
    (2::smallint, 'Junior Manager Tuesday Task', 'Host a group call or voice chat with your downline to review weekly goals. Upload a screenshot of the call or chat log.', 400.00::numeric, 'Junior Manager'),
    (3::smallint, 'Junior Manager Wednesday Task', 'Publish a detailed post or short video explaining how EarnXact''s membership plans work, and share it on at least 2 platforms. Upload screenshots of both posts.', 400.00::numeric, 'Junior Manager'),
    (4::smallint, 'Junior Manager Thursday Task', 'Track and report the weekly activity of at least 5 of your referred members (who submitted tasks, who didn''t). Upload a screenshot of your tracking sheet or summary.', 400.00::numeric, 'Junior Manager'),
    (5::smallint, 'Junior Manager Friday Task', 'Recognize and share a shout-out for your top-performing referral this week on your social media. Upload a screenshot of the shout-out post.', 400.00::numeric, 'Junior Manager'),

    -- mid executive (reward 800.00)
    (1::smallint, 'Mid Executive Monday Task', 'Recruit and confirm 4 new referrals into your Mid Executive network this week. Upload a screenshot of the referral dashboard.', 800.00::numeric, 'mid executive'),
    (2::smallint, 'Mid Executive Tuesday Task', 'Prepare and share a weekly performance summary of your downline''s activity across your team''s group chat. Upload a screenshot of the summary.', 800.00::numeric, 'mid executive'),
    (3::smallint, 'Mid Executive Wednesday Task', 'Run a promotional campaign (post, story, or reel) about EarnXact across at least 3 social platforms. Upload screenshots of all 3 posts.', 800.00::numeric, 'mid executive'),
    (4::smallint, 'Mid Executive Thursday Task', 'Mentor 2 of your Supervisor or Junior Manager referrals with a strategy session on growing their own downline. Upload a screenshot of the session or notes.', 800.00::numeric, 'mid executive'),
    (5::smallint, 'Mid Executive Friday Task', 'Submit a written weekly report highlighting your network''s growth, challenges, and next week''s plan. Upload a screenshot or document of the report.', 800.00::numeric, 'mid executive'),

    -- Excecutive (reward 1200.00)
    (1::smallint, 'Executive Monday Task', 'Recruit and confirm 5 new referrals into your Executive network this week. Upload a screenshot of the referral dashboard.', 1200.00::numeric, 'Excecutive'),
    (2::smallint, 'Executive Tuesday Task', 'Host a live session (voice or video call) with your downline to review targets and answer questions. Upload a screenshot of the session.', 1200.00::numeric, 'Excecutive'),
    (3::smallint, 'Executive Wednesday Task', 'Launch a coordinated multi-platform promotion (WhatsApp, Telegram, Facebook, Instagram, X) about EarnXact. Upload screenshots from at least 4 platforms.', 1200.00::numeric, 'Excecutive'),
    (4::smallint, 'Executive Thursday Task', 'Prepare a growth strategy document for your network covering the next 30 days. Upload a screenshot or document of the strategy.', 1200.00::numeric, 'Excecutive'),
    (5::smallint, 'Executive Friday Task', 'Recognize your top 3 performing referrals with a shout-out post and share their results (with permission). Upload a screenshot of the shout-out.', 1200.00::numeric, 'Excecutive'),

    -- Senior Executive (reward 2000.00)
    (1::smallint, 'Senior Executive Monday Task', 'Recruit and confirm 6 new referrals into your Senior Executive network this week. Upload a screenshot of the referral dashboard.', 2000.00::numeric, 'Senior Executive'),
    (2::smallint, 'Senior Executive Tuesday Task', 'Conduct a leadership check-in with all of your Executive/Mid Executive downline members to review their team''s progress. Upload a screenshot of the check-in notes.', 2000.00::numeric, 'Senior Executive'),
    (3::smallint, 'Senior Executive Wednesday Task', 'Produce a promotional video or detailed write-up about EarnXact and share it across at least 4 platforms. Upload screenshots of all shares.', 2000.00::numeric, 'Senior Executive'),
    (4::smallint, 'Senior Executive Thursday Task', 'Submit a comprehensive weekly performance report covering your entire downline''s activity and growth. Upload a screenshot or document of the report.', 2000.00::numeric, 'Senior Executive'),
    (5::smallint, 'Senior Executive Friday Task', 'Host a strategy planning session with your top-tier referrals to set goals for the following week. Upload a screenshot of the session or notes.', 2000.00::numeric, 'Senior Executive'),

    -- Regional Manager (reward 4000.00)
    (1::smallint, 'Regional Manager Monday Task', 'Recruit and confirm 8 new referrals into your Regional Manager network this week. Upload a screenshot of the referral dashboard.', 4000.00::numeric, 'Regional Manager'),
    (2::smallint, 'Regional Manager Tuesday Task', 'Host a regional leadership call with all Senior Executives and Executives under your network to review performance. Upload a screenshot of the call or notes.', 4000.00::numeric, 'Regional Manager'),
    (3::smallint, 'Regional Manager Wednesday Task', 'Launch a full-scale regional promotional campaign about EarnXact across all major social platforms. Upload screenshots from at least 5 platforms.', 4000.00::numeric, 'Regional Manager'),
    (4::smallint, 'Regional Manager Thursday Task', 'Submit a full regional performance report covering growth, retention, and next quarter''s targets. Upload a screenshot or document of the report.', 4000.00::numeric, 'Regional Manager'),
    (5::smallint, 'Regional Manager Friday Task', 'Host a recognition event (call, post, or write-up) celebrating your region''s top performers for the week. Upload a screenshot of the recognition.', 4000.00::numeric, 'Regional Manager')
) as v(weekday, title, description, reward, plan_name)
join public.membership_plans mp on mp.name = v.plan_name
on conflict (weekday, membership_plan_id) do nothing;
