import LegalPageOverlay from "@/components/dashboard/LegalPageOverlay";

// TODO: Replace this placeholder copy with the finalized policy text
// provided by the business/legal team.
export default function PrivacyPolicyPage() {
  return (
    <LegalPageOverlay title="Privacy Policy">
      <section>
        <h2 className="text-base font-semibold text-white">
          Information We Collect
        </h2>
        <p className="mt-2">
          We collect information you provide when creating an account, such
          as your name, email address, and payout details, along with
          activity data generated as you use EarnXact&apos;s tasks, check-ins
          and referral features.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">
          How We Use Your Information
        </h2>
        <p className="mt-2">
          Your information is used to operate your account, process
          withdrawals, calculate rewards, prevent fraud, and improve the
          EarnXact experience.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Data Sharing</h2>
        <p className="mt-2">
          We do not sell your personal data. Information is only shared with
          trusted payment and infrastructure partners strictly to deliver our
          services.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Your Rights</h2>
        <p className="mt-2">
          You may request access to, correction of, or deletion of your
          personal data at any time by contacting our support team.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Contact Us</h2>
        <p className="mt-2">
          For any privacy-related questions, please reach out through the
          Support section of your Account Settings.
        </p>
      </section>
    </LegalPageOverlay>
  );
}
