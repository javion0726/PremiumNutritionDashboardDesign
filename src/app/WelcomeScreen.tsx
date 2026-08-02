import { Dumbbell, Utensils, Users, TrendingUp, ArrowRight } from "lucide-react";
import { C, Btn } from "./ui";

// The pre-auth welcome screen — the first thing an unauthenticated visitor
// sees, before choosing to sign up or log in. The hero image area is
// deliberately left as a plain color block for now rather than a stock
// photo: using a real, unlicensed photograph isn't something to fake, and
// the actual image treatment is still an open decision.
export default function WelcomeScreen({ onGetStarted, onLogIn }: { onGetStarted: () => void; onLogIn: () => void }) {
  const features = [
    { icon: Dumbbell, title: "Train", body: "Structured plans with progressive overload, or build your own workout from scratch." },
    { icon: Utensils, title: "Fuel", body: "Real food search and macro tracking — log in seconds, not minutes." },
    { icon: Users, title: "Coach", body: "Join a coach's group, follow the workouts they post, and log your results against them." },
    { icon: TrendingUp, title: "Track", body: "A real Discipline Score and progress history, computed from what you actually log." },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
      {/* Hero */}
      <div className="w-full" style={{ height: 280, background: C.accent }} />

      <div className="flex-1 flex flex-col px-6 pt-6 pb-8">
        <div className="flex items-center gap-2 mb-5">
          <div style={{ width: 22, height: 22, background: C.accent, borderRadius: 6 }} />
          <span className="text-xs font-bold tracking-widest" style={{ color: C.pri }}>ASCEND</span>
        </div>

        <h1 className="text-4xl font-bold leading-tight mb-2" style={{ color: C.pri }}>
          Your journey.<br /><span style={{ color: C.accent }}>Elevated.</span>
        </h1>
        <p className="text-sm mb-6" style={{ color: C.mut }}>
          Training, nutrition, and progress — one place, honestly tracked, no invented data.
        </p>

        <div className="flex flex-col gap-3 mb-8">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-3 p-3 rounded-2xl border" style={{ background: C.surface, borderColor: C.border }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.accentSoft }}>
                <f.icon size={17} style={{ color: C.accent }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: C.pri }}>{f.title}</p>
                <p className="text-xs mt-0.5" style={{ color: C.mut }}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <Btn full size="lg" onClick={onGetStarted}>
            <span className="flex items-center justify-center gap-2">Get Started <ArrowRight size={16} /></span>
          </Btn>
          <Btn full size="lg" variant="secondary" onClick={onLogIn}>Log In</Btn>
        </div>
      </div>
    </div>
  );
}
