import { useState } from "react";
import { C, Btn, Input } from "./ui";
import { signIn, signUp, requestPasswordReset } from "./lib/auth";
import { isSupabaseConfigured } from "./lib/supabase";

type Mode = "sign-in" | "sign-up" | "forgot";

export default function AuthScreen({ initialMode = "sign-in" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3"
        style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
        <h1 className="text-xl font-bold" style={{ color: C.pri }}>Cloud accounts aren't set up yet</h1>
        <p className="text-sm max-w-xs" style={{ color: C.mut }}>
          This deployment is missing its Supabase configuration. Add VITE_SUPABASE_URL and
          VITE_SUPABASE_ANON_KEY as environment variables, then reload.
        </p>
      </div>
    );
  }

  async function submit() {
    setError(null); setInfo(null);
    if (!email.trim() || (mode !== "forgot" && !password)) {
      setError("Enter " + (mode === "forgot" ? "your email" : "an email and password"));
      return;
    }
    setLoading(true);
    try {
      if (mode === "sign-in") {
        const { error } = await signIn(email.trim(), password);
        if (error) setError(error);
      } else if (mode === "sign-up") {
        const { error } = await signUp(email.trim(), password);
        if (error) setError(error);
        else setInfo("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await requestPasswordReset(email.trim());
        if (error) setError(error);
        else setInfo("If that email has an account, a reset link is on its way.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-20 pb-8" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: C.pri }}>
          {mode === "sign-in" && "Welcome back"}
          {mode === "sign-up" && "Create your account"}
          {mode === "forgot" && "Reset your password"}
        </h1>
        <p className="text-sm" style={{ color: C.mut }}>
          {mode === "sign-in" && "Sign in to sync your data across devices."}
          {mode === "sign-up" && "Your existing data on this device comes with you."}
          {mode === "forgot" && "We'll email you a link to reset it."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
        {mode !== "forgot" && (
          <Input label="Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />
        )}

        {error && (
          <p className="text-sm rounded-xl px-4 py-3" style={{ background: C.errSoft, color: C.err }}>{error}</p>
        )}
        {info && (
          <p className="text-sm rounded-xl px-4 py-3" style={{ background: C.okSoft, color: C.ok }}>{info}</p>
        )}

        <Btn full size="lg" disabled={loading} onClick={submit}>
          {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send reset link"}
        </Btn>

        {mode === "sign-in" && (
          <>
            <button className="text-sm text-center" style={{ color: C.mut }} onClick={() => { setMode("forgot"); setError(null); setInfo(null); }}>
              Forgot password?
            </button>
            <button className="text-sm text-center font-semibold" style={{ color: C.accent }} onClick={() => { setMode("sign-up"); setError(null); setInfo(null); }}>
              New here? Create an account
            </button>
          </>
        )}
        {mode !== "sign-in" && (
          <button className="text-sm text-center font-semibold" style={{ color: C.accent }} onClick={() => { setMode("sign-in"); setError(null); setInfo(null); }}>
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}
