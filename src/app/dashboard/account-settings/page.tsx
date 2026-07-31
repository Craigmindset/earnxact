import ComingSoon from "@/components/dashboard/ComingSoon";
import { MdSettings } from "react-icons/md";

export default function AccountSettingsPage() {
  return (
    <ComingSoon
      title="Account Settings"
      description="Manage your profile, security and preferences."
      icon={MdSettings}
    />
  );
}
