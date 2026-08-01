import type { IconType } from "react-icons";
import {
  MdGroups,
  MdRocketLaunch,
  MdMilitaryTech,
  MdSupervisorAccount,
  MdBusinessCenter,
  MdWorkspacePremium,
  MdEmojiEvents,
  MdLocationOff
} from "react-icons/md";

export type TaskClass = {
  id: string;
  name: string;
  amount: number | null;
  description: string;
  available: boolean;
  icon: IconType;
};

export const TASK_CLASSES: TaskClass[] = [
  {
    id: "team-class",
    name: "Team Class",
    amount: 10000,
    description: "Great for beginners starting their earning journey.",
    available: true,
    icon: MdGroups
  },
  {
    id: "upscale-class",
    name: "Upscale Class",
    amount: 20000,
    description: "Step up your earnings with more task variety.",
    available: true,
    icon: MdRocketLaunch
  },
  {
    id: "superior-class",
    name: "Supervisor Class",
    amount: 50000,
    description: "Access more tasks with improved payout rates.",
    available: true,
    icon: MdMilitaryTech
  },
  {
    id: "junior-manager",
    name: "Junior Manager",
    amount: 100000,
    description: "Manage entry-level task teams for higher rewards.",
    available: true,
    icon: MdSupervisorAccount
  },
  {
    id: "mid-executive",
    name: "Mid Executive",
    amount: 200000,
    description: "Handle bigger task volumes with premium bonuses.",
    available: true,
    icon: MdBusinessCenter
  },
  {
    id: "executive",
    name: "Executive",
    amount: 300000,
    description: "Enjoy top-tier tasks with priority payouts.",
    available: true,
    icon: MdWorkspacePremium
  },
  {
    id: "senior-executive",
    name: "Senior Executive",
    amount: 500000,
    description: "Maximum task access at the highest reward tier.",
    available: true,
    icon: MdEmojiEvents
  },
  {
    id: "regional-manager",
    name: "Regional Manager",
    amount: null,
    description: "Not available in your country",
    available: false,
    icon: MdLocationOff
  }
];

// Backend integration point:
// - Replace with the authenticated user's active task class registration,
//   fetched from your API/DB. `null` means the user has no active
//   registration yet, in which case the UI should prompt them to upgrade.
export const CURRENT_TASK_CLASS_ID: string | null = null;

export function getCurrentTaskClass(): TaskClass | null {
  return TASK_CLASSES.find((taskClass) => taskClass.id === CURRENT_TASK_CLASS_ID) ?? null;
}
