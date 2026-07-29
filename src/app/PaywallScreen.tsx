import { useState } from "react";
import { C, Btn, Card } from "./ui";
import { startCheckout } from "./lib/subscription";
import { signOut } from "./lib/auth";
import type { SubscriptionStatus } from "./lib/subscription";

export default function PaywallScreen({ status }: { status: SubscriptionStatus }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReturning = status === "canceled" || status === "past_due" || status === "incomplete";

  async function handleStart() {
    setError(null);
    setLoading(true);
    const result = await startCheckout();
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, startCheckout() redirects the whole page to Stripe —
    // nothing left to do here.
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-16 pb-8" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
      <h1 className="text-3xl font-bold mb-2" style={{ color: C.pri }}>
        {isReturning ? "Your subscription has ended" : "Start your free trial"}
      </h1>
      <p className="text-sm mb-6" style={{ color: C.mut }}>
        {isReturning
          ? "Resubscribe to get back into your training, nutrition, and progress data."
          : "30 days free, then $4.99/month. Cancel any time — no charge until the trial ends."}
      </p>

      <Card className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.accent }}>Ascend Premium</p>
        <p className="text-2xl font-bold mb-3" style={{ color: C.pri }}>$4.99<span className="text-sm font-normal" style={{ color: C.mut }}> / month</span></p>
        <ul className="flex flex-col gap-2 text-sm" style={{ color: C.sec }}>
          <li>• Structured periodized workout plans</li>
          <li>• Full nutrition and macro tracking</li>
          <li>• Progress, goals, and Discipline Score</li>
          <li>• Cross-device sync</li>
        </ul>
      </Card>

      {error && (
        <p className="text-sm rounded-xl px-4 py-3 mb-4" style={{ background: C.errSoft, color: C.err }}>{error}</p>
      )}

      <Btn full size="lg" disabled={loading} onClick={handleStart}>
        {loading ? "Redirecting…" : isReturning ? "Resubscribe" : "Start free trial"}
      </Btn>

      <button className="text-sm text-center mt-6" style={{ color: C.mut }} onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  );
}
