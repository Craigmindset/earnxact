import { TASK_CLASSES } from "@/components/dashboard/task-class-data";

export type ReferralTier = {
  tier: number;
  taskClassId: string;
  taskClassName: string;
  commissionRate: number;
  referralTarget: number;
};

// Backend integration point:
// - Replace the hardcoded commission rates and referral targets below with
//   values fetched from your referral/commission configuration API.
const COMMISSION_RATES = [3, 5, 7, 10, 12, 15, 18, 20];
const REFERRAL_TARGETS = [1, 2, 5, 10, 15, 25, 35, 50];

export const REFERRAL_TIERS: ReferralTier[] = TASK_CLASSES.filter(
  (taskClass) => taskClass.available
).map((taskClass, index) => ({
  tier: index + 1,
  taskClassId: taskClass.id,
  taskClassName: taskClass.name,
  commissionRate: COMMISSION_RATES[index] ?? COMMISSION_RATES[COMMISSION_RATES.length - 1],
  referralTarget: REFERRAL_TARGETS[index] ?? REFERRAL_TARGETS[REFERRAL_TARGETS.length - 1]
}));
