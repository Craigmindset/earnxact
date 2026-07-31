import ComingSoon from "@/components/dashboard/ComingSoon";
import { MdLeaderboard } from "react-icons/md";

export default function LeaderboardPage() {
  return (
    <ComingSoon
      title="Leaderboard"
      description="See how you rank against other top earners."
      icon={MdLeaderboard}
    />
  );
}
