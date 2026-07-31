export default function DashboardFooter() {
  return (
    <footer className="border-t border-white/10 bg-[var(--brand-black)] px-4 py-4 text-xs text-white/50 md:px-6">
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <span>© 2026 EarnXact. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <span>Terms</span>
          <span>Privacy</span>
          <span>Support</span>
        </div>
      </div>
    </footer>
  );
}
