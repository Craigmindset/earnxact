import LegalPageOverlay from "@/components/dashboard/LegalPageOverlay";

// TODO: Replace this placeholder copy with the finalized policy text
// provided by the business/legal team.
export default function InsurancePage() {
  return (
    <LegalPageOverlay title="Insurance">
      <section>
        <h2 className="text-base font-semibold text-white">
          Earnings Protection
        </h2>
        <p className="mt-2">
          Eligible task class categories may include coverage that protects a
          portion of your verified earnings against payout disruptions.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Eligibility</h2>
        <p className="mt-2">
          Coverage eligibility depends on your active task class, account
          standing, and completed verification requirements.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">
          Claims Process
        </h2>
        <p className="mt-2">
          To file a claim, open a support ticket describing the issue along
          with any relevant transaction details. Our team will review and
          respond within the standard support timeframe.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">Exclusions</h2>
        <p className="mt-2">
          Coverage does not apply to losses resulting from account policy
          violations, fraudulent activity, or unverified transactions.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">
          Contact Support
        </h2>
        <p className="mt-2">
          For questions about your coverage, please reach out through the
          Support section of your Account Settings.
        </p>
      </section>
    </LegalPageOverlay>
  );
}
