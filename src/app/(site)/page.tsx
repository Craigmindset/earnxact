import FaqSection from "@/components/home/FaqSection";
import FinalCtaSection from "@/components/home/FinalCtaSection";
import FirstPayoutSection from "@/components/home/FirstPayoutSection";
import HeroSection from "@/components/home/HeroSection";
import ProcessSection from "@/components/home/ProcessSection";

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      <HeroSection />
      <ProcessSection />
      <FirstPayoutSection />
      <FaqSection />
      <FinalCtaSection />
    </div>
  );
}
