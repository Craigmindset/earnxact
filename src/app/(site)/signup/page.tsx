import SignupForm from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,#060606_0%,#080808_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_15%_0%,rgba(244,163,0,0.12),transparent_50%),radial-gradient(900px_circle_at_85%_10%,rgba(255,255,255,0.06),transparent_45%)]" />

      <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl items-center justify-center px-4 py-10 md:py-14">
        <SignupForm />
      </div>
    </section>
  );
}

