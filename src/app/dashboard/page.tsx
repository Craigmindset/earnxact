export default function DashboardPage() {
  // Backend/auth integration point:
  // - Protect this route with middleware or server-side auth checks.
  // - Fetch user profile/tasks from your API/DB and render them here.
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-2xl font-semibold">Dashboard</div>
        <div className="mt-2 text-sm text-white/70">
          You are logged in.
        </div>
      </div>
    </div>
  );
}
