import LegalPageOverlay from "@/components/dashboard/LegalPageOverlay";

// TODO: Replace this placeholder copy with the finalized policy text
// provided by the business/legal team.
export default function DataProtectionPage() {
  return (
    <LegalPageOverlay title="Data Protection">
      <section>
        <h2 className="text-base font-semibold text-white">
          Our Commitment
        </h2>
        <p className="mt-2">
          EarnXact is committed to protecting the personal and financial data
          you share with us using industry-standard safeguards.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">
          Security Measures
        </h2>
        <p className="mt-2">
          We use encryption in transit and at rest, restricted access
          controls, and continuous monitoring to guard against unauthorized
          access, loss, or misuse of your data.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">
          Data Retention
        </h2>
        <p className="mt-2">
          Your data is retained only for as long as necessary to provide our
          services and to meet legal and regulatory obligations.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">
          Third-Party Processors
        </h2>
        <p className="mt-2">
          Where we rely on third-party providers (e.g. payment processors),
          we require them to meet equivalent data protection standards.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-white">
          Reporting a Concern
        </h2>
        <p className="mt-2">
          If you believe your data has been mishandled, please contact our
          support team immediately through the Support section of your
          Account Settings.
        </p>
      </section>
    </LegalPageOverlay>
  );
}
