import { useState, useEffect, useRef } from "react";
import {
  Home, Dumbbell, Utensils, TrendingUp, Target, User,
  ChevronRight, ChevronLeft,
  Plus, Check, X, Clock, Play, Pause, RotateCcw,
  Flame, Droplets, Zap, Activity,
  ArrowUp, ArrowDown,
  Bell, Settings, Download,
  AlertCircle, Loader2,
  Scale, Moon, LogOut, Shield,
  CheckCircle2, Circle,
  Timer, Calendar,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar,
} from "recharts";
import { PLANS, type WeeklyPlan, type PlanDay, type Exercise } from "./lib/plans";
import {
  getConfig, saveConfig, isOnboarded, markOnboarded, runMigrations,
  getActivePlan, saveActivePlan, type ActivePlan,
  getActiveCustomSession, saveActiveCustomSession, type ActiveCustomSession,
  getGoalsList, addGoal, updateGoal, deleteGoal, type Goal, type LinkedMetric,
  getDay, saveDay, todayKey, type ExEntry,
  getMeasurements, saveMeasurements,
  getGoals, saveGoals, getGoalsList, syncCalculatorWeightGoal,
  exportBackup, clearAllData,
} from "./lib/store";
import { useAppData } from "./lib/useAppData";
import {
  calcStreak, calcLongestStreak, mealTotals, getTargets, calcTargets,
  computeDisciplineScore, disciplineAverages, weekActivity, workoutVolume,
  bestSets, strengthHistory, consistencyGrid, advancePlanDay, resolveGoalCurrent,
  recoveryScore, workoutStats,
} from "./lib/engine";
import { searchFood, type FoodResult } from "./lib/food";
import { EX } from "./lib/exercises";

// Old-schema data (from any previous Ascend deploy) is migrated before first render.
runMigrations();

function ytURL(name: string): string {
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(name + " exercise tutorial form");
}

// Case-insensitive, tolerant lookup: plan/custom exercise names don't always
// match the library's naming exactly (e.g. "Barbell Bench Press" vs
// "Bench Press"), so this tries an exact match first, then a substring match
// in either direction, before giving up.
const EXERCISE_INDEX: { name: string; category: string; targets: string }[] =
  Object.entries(EX).flatMap(([category, data]) =>
    data.x.map(name => ({ name, category, targets: data.m }))
  );

function exerciseTargets(name: string): string | null {
  const q = name.toLowerCase().trim();
  const exact = EXERCISE_INDEX.find(e => e.name.toLowerCase() === q);
  if (exact) return exact.targets;
  const partial = EXERCISE_INDEX.find(e => q.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(q));
  return partial?.targets ?? null;
}

// ─── EXACT COLOR TOKENS ──────────────────────────────────────────────────────
// Background:    #F6F5F2  Surface/Card:   #FFFFFF  Surface-alt:   #EDECEA
// Border:        #E3DED8  Border-subtle:  #ECEAE5
// Text-primary:  #1A1917  Text-secondary: #46423E  Text-muted:    #918D88
// Accent:        #1F5C3A  Accent-fg:      #FFFFFF  Accent-soft:   #E8F3EC
// Success:       #276749  Success-soft:   #EDFAF3
// Warning:       #9A4F0F  Warning-soft:   #FEF3E8
// Error:         #B91C1C  Error-soft:     #FEF2F2
// ─── TYPE SCALE (8pt grid base = 16px) ──────────────────────────────────────
// H1: 28px/600/lh1.20  H2: 22px/600/lh1.25  H3: 18px/600/lh1.30
// Body: 15px/400/lh1.60  Body-md: 15px/500  Small: 13px/400
// Caption: 12px/400/lh1.40  Label: 11px/600/ls0.08em/uppercase
// Mono: 13px/DM Mono/400  (data values, timers, counts)
// ─── SPACING GRID (8pt) ──────────────────────────────────────────────────────
// 4 8 12 16 20 24 32 40 48 56 64px

const C = {
  bg:         "#F6F5F2",
  surface:    "#FFFFFF",
  surfaceAlt: "#EDECEA",
  border:     "#E3DED8",
  borderSub:  "#ECEAE5",
  pri:        "#1A1917",
  sec:        "#46423E",
  mut:        "#918D88",
  accent:     "#1F5C3A",
  accentFg:   "#FFFFFF",
  accentSoft: "#E8F3EC",
  accentMid:  "rgba(31,92,58,0.12)",
  ok:         "#276749",
  okSoft:     "#EDFAF3",
  warn:       "#9A4F0F",
  warnSoft:   "#FEF3E8",
  err:        "#B91C1C",
  errSoft:    "#FEF2F2",
} as const;

type Tab = "dashboard" | "workout" | "nutrition" | "progress" | "goals";
type WorkoutView = "overview" | "plans" | "plan-detail" | "day-detail" | "active" | "build";
type DisplayState = "populated" | "empty" | "loading" | "error";

// ─── PRIMITIVE COMPONENTS ─────────────────────────────────────────────────────

function Btn({
  variant = "primary", size = "md", full = false, disabled = false,
  onClick, children,
}: {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  full?: boolean; disabled?: boolean;
  onClick?: () => void; children: React.ReactNode;
}) {
  const base = "font-semibold rounded-xl transition-all active:scale-[0.97] inline-flex items-center justify-center gap-2 cursor-pointer";
  const sz = { sm: "px-3 py-2 text-xs min-h-[36px]", md: "px-4 py-2.5 text-sm min-h-[44px]", lg: "px-5 py-3 text-sm min-h-[48px]" }[size];
  const v = {
    primary: { background: C.accent, color: C.accentFg, border: "none" },
    secondary: { background: C.surface, color: C.pri, border: `1px solid ${C.border}` },
    ghost: { background: "transparent", color: C.sec, border: "none" },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} ${sz} ${full ? "w-full" : ""} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      style={v}>
      {children}
    </button>
  );
}

function Input({
  label, value, onChange, placeholder = "", type = "text",
}: {
  label?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.mut }}>{label}</span>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all min-h-[48px]"
        style={{
          background: C.surface, color: C.pri, border: `1px solid ${C.border}`,
          fontFamily: "Inter, sans-serif",
        }}
        onFocus={e => (e.target.style.borderColor = C.accent)}
        onBlur={e => (e.target.style.borderColor = C.border)}
      />
    </div>
  );
}

function Card({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick}
      className={`rounded-2xl p-4 border ${className} ${onClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
      style={{ background: C.surface, borderColor: C.border }}>
      {children}
    </div>
  );
}

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-xs font-semibold uppercase tracking-widest ${className}`} style={{ color: C.mut, letterSpacing: "0.08em" }}>
      {children}
    </span>
  );
}

function ProgressBar({ value, max = 100, color = C.accent, height = 6 }: { value: number; max?: number; color?: string; height?: number }) {
  return (
    <div className="rounded-full overflow-hidden" style={{ height, background: C.surfaceAlt }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    </div>
  );
}

function Ring({
  value, max = 100, size = 96, stroke = 8, color = C.accent, children,
}: {
  value: number; max?: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, value / max));
  return (
    <div style={{ width: size, height: size }} className="relative flex items-center justify-center flex-shrink-0">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.surfaceAlt} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="flex flex-col items-center justify-center z-10">{children}</div>
    </div>
  );
}

function Badge({ label, color = C.accentSoft, textColor = C.accent }: { label: string; color?: string; textColor?: string }) {
  return (
    <span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={{ background: color, color: textColor }}>
      {label}
    </span>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-xl animate-pulse ${className}`} style={{ background: C.surfaceAlt }} />;
}

function EmptyState({ icon, title, body, action, onAction, secondaryAction, onSecondaryAction }: {
  icon: React.ReactNode; title: string; body: string; action?: string; onAction?: () => void;
  secondaryAction?: string; onSecondaryAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-8 gap-4">
      <div className="w-16 h-16 rounded-full flex items-center justify-center border-2" style={{ borderColor: C.border, color: C.mut }}>
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold" style={{ color: C.pri }}>{title}</p>
        <p className="text-sm leading-relaxed" style={{ color: C.mut }}>{body}</p>
      </div>
      {action && <Btn onClick={onAction}>{action}</Btn>}
      {secondaryAction && (
        <button onClick={onSecondaryAction} className="text-sm font-semibold" style={{ color: C.accent }}>
          {secondaryAction}
        </button>
      )}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-8 gap-4">
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: C.errSoft, color: C.err }}>
        <AlertCircle size={28} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold" style={{ color: C.pri }}>Something went wrong</p>
        <p className="text-sm leading-relaxed" style={{ color: C.mut }}>We couldn't load your data. Check your connection and try again.</p>
      </div>
      <Btn onClick={onRetry}>Try again</Btn>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <Skeleton className="h-32" />
      <Skeleton className="h-24" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-28" />
    </div>
  );
}

function Divider() {
  return <div className="h-px" style={{ background: C.border }} />;
}

function NavRow({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <button onClick={onPress} className="w-full flex items-center justify-between py-3 px-4 rounded-xl transition-colors active:bg-gray-50" style={{ minHeight: 44 }}>
      <span className="text-sm" style={{ color: C.pri }}>{label}</span>
      <ChevronRight size={16} style={{ color: C.mut }} />
    </button>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState(4);
  const [waterUnit, setWaterUnit] = useState<"oz" | "ml">("oz");

  const goals = [
    { id: "fat-loss", label: "Fat Loss", sub: "Reduce body fat, improve body composition" },
    { id: "muscle", label: "Muscle Building", sub: "Maximize hypertrophy and mass" },
    { id: "strength", label: "Strength", sub: "Build maximal strength on compound lifts" },
    { id: "performance", label: "Athletic Performance", sub: "Power, speed, and conditioning" },
    { id: "general", label: "General Fitness", sub: "Stay active and healthy" },
  ];

  const total = 4;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
      {/* Top nav */}
      <div className="flex items-center px-5 pt-14 pb-4 gap-4">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="w-10 h-10 flex items-center justify-center rounded-xl border" style={{ borderColor: C.border, color: C.sec }}>
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="flex-1 flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ background: i < step ? C.accent : C.border }} />
          ))}
        </div>
        <span className="text-xs font-mono" style={{ color: C.mut }}>{step}/{total}</span>
      </div>

      <div className="flex-1 flex flex-col px-5 pt-8 pb-8 gap-8">
        {step === 1 && (
          <>
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: C.pri }}>Welcome to Ascend</h1>
              <p className="text-base leading-relaxed" style={{ color: C.mut }}>Let's build your profile. It takes less than a minute.</p>
            </div>
            <Input label="Your name" value={name} onChange={setName} placeholder="Alex Rivera" />
            <div className="mt-auto">
              <Btn full size="lg" disabled={!name.trim()} onClick={() => setStep(2)}>Continue</Btn>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: C.pri }}>What's your primary goal?</h2>
              <p className="text-sm" style={{ color: C.mut }}>This shapes your plan and metrics dashboard.</p>
            </div>
            <div className="flex flex-col gap-2">
              {goals.map(g => (
                <button key={g.id} onClick={() => setGoal(g.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left"
                  style={{
                    border: `1.5px solid ${goal === g.id ? C.accent : C.border}`,
                    background: goal === g.id ? C.accentSoft : C.surface,
                    minHeight: 68,
                  }}>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ borderColor: goal === g.id ? C.accent : C.border }}>
                    {goal === g.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: C.accent }} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: C.pri }}>{g.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.mut }}>{g.sub}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-auto">
              <Btn full size="lg" disabled={!goal} onClick={() => setStep(3)}>Continue</Btn>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: C.pri }}>How often do you train?</h2>
              <p className="text-sm" style={{ color: C.mut }}>This determines which plans are recommended for you.</p>
            </div>
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="flex items-center gap-6">
                <button onClick={() => setDays(d => Math.max(1, d - 1))}
                  className="w-12 h-12 rounded-xl border flex items-center justify-center"
                  style={{ borderColor: C.border, color: C.sec }}>
                  <span className="text-xl font-light">−</span>
                </button>
                <div className="text-center">
                  <span className="text-5xl font-bold" style={{ color: C.pri, fontFamily: "DM Mono, monospace" }}>{days}</span>
                  <p className="text-sm mt-1" style={{ color: C.mut }}>days / week</p>
                </div>
                <button onClick={() => setDays(d => Math.min(7, d + 1))}
                  className="w-12 h-12 rounded-xl border flex items-center justify-center"
                  style={{ borderColor: C.border, color: C.sec }}>
                  <Plus size={20} />
                </button>
              </div>
              <div className="flex gap-2">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold"
                    style={{ background: i < days ? C.accent : C.surfaceAlt, color: i < days ? C.accentFg : C.mut }}>
                    {d}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-auto">
              <Btn full size="lg" onClick={() => setStep(4)}>Continue</Btn>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: C.pri }}>Water tracking</h2>
              <p className="text-sm" style={{ color: C.mut }}>Choose your preferred unit for hydration goals.</p>
            </div>
            <div className="flex gap-3">
              {(["oz", "ml"] as const).map(u => (
                <button key={u} onClick={() => setWaterUnit(u)}
                  className="flex-1 py-4 rounded-2xl border-2 font-semibold text-sm transition-all"
                  style={{ border: `2px solid ${waterUnit === u ? C.accent : C.border}`, background: waterUnit === u ? C.accentSoft : C.surface, color: waterUnit === u ? C.accent : C.sec }}>
                  {u === "oz" ? "fl oz" : "ml / L"}
                  <p className="text-xs font-normal mt-1" style={{ color: C.mut }}>{u === "oz" ? "e.g. 8 glasses" : "e.g. 2,000 ml"}</p>
                </button>
              ))}
            </div>
            <Card>
              <p className="text-sm font-semibold mb-3" style={{ color: C.pri }}>Daily hydration goal</p>
              <div className="flex items-center gap-4">
                <Ring value={75} max={100} size={64} stroke={6}>
                  <Droplets size={16} style={{ color: C.accent }} />
                </Ring>
                <div>
                  <p className="text-2xl font-bold" style={{ color: C.pri, fontFamily: "DM Mono, monospace" }}>
                    {waterUnit === "oz" ? "80 oz" : "2,400 ml"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: C.mut }}>Recommended for your profile</p>
                </div>
              </div>
            </Card>
            <div className="mt-auto">
              <Btn full size="lg" onClick={() => {
                const goalObj = goals.find(g => g.id === goal);
                saveConfig({
                  name: name.trim(),
                  goal: goalObj?.label ?? goal,
                  daysPerWeek: days,
                  waterUnit,
                  waterGoal: waterUnit === "oz" ? 80 : 2400,
                  memberSince: new Date().toISOString(),
                });
                markOnboarded();
                onComplete();
              }}>Start training</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function DashboardScreen({
  activePlan, onGoToWorkout, onOpenProfile, onBuildWorkout,
}: {
  activePlan: ActivePlan | null;
  onGoToWorkout: () => void;
  onOpenProfile: () => void;
  onBuildWorkout: () => void;
}) {
  useAppData();
  const cfg = getConfig();
  const plan = PLANS.find(p => p.id === activePlan?.planId);
  const todayDay = plan?.schedule[activePlan?.currentDayIdx ?? 0];
  const customSession = getActiveCustomSession();

  const today = getDay(todayKey());
  const hasAnyData = !!(today.exArr?.length || today.mealArr?.length || activePlan || customSession);

  const { score } = computeDisciplineScore(todayKey());
  const streak = calcStreak();
  const wa = weekActivity();
  const yesterdayScore = computeDisciplineScore(
    (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; })()
  ).score;
  const scoreDelta = score - yesterdayScore;
  const scoreLabel = score >= 80 ? "Excellent week" : score >= 60 ? "Solid progress" : score > 0 ? "Building momentum" : "No activity yet today";

  const targets = getTargets();
  const totals = mealTotals(today.mealArr);
  const workoutsThisWeek = wa.count;
  const nutritionPct = targets.calories ? Math.round((totals.cal / targets.calories) * 100) : 0;
  const recovery = recoveryScore();

  const waterUnitLabel = cfg.waterUnit === "ml" ? "L" : cfg.waterUnit;
  const waterDisplay = cfg.waterUnit === "ml" ? ((today.water ?? 0) / 1000).toFixed(1) : String(today.water ?? 0);

  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const greetName = cfg.name?.trim() ? cfg.name.trim().split(" ")[0] : "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-14 pb-5">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: C.mut }}>{dateLabel}</p>
          <h1 className="text-2xl font-bold" style={{ color: C.pri }}>{greeting}, {greetName}</h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button className="w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: C.border, color: C.sec }}>
            <Bell size={18} />
          </button>
          <button onClick={onOpenProfile} className="w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: C.border, background: C.surfaceAlt, color: C.sec }}>
            <User size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-28">
        {!hasAnyData ? (
          <EmptyState
            icon={<Dumbbell size={28} />}
            title="No workout data yet"
            body="Set up your first plan and start training to see your Discipline Score and daily summary here."
            action="Browse plans"
            onAction={onGoToWorkout}
            secondaryAction="or build your own workout"
            onSecondaryAction={onBuildWorkout}
          />
        ) : (
          <>
            {/* Discipline Score */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <SectionLabel>Discipline Score</SectionLabel>
                <span className="text-xs font-mono" style={{ color: C.mut }}>{streak}-day streak</span>
              </div>
              <div className="flex items-center gap-5">
                <Ring value={score} max={100} size={100} stroke={9}>
                  <span className="text-2xl font-bold" style={{ color: C.pri, fontFamily: "DM Mono, monospace" }}>{score}</span>
                  <span className="text-xs" style={{ color: C.mut }}>/100</span>
                </Ring>
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1" style={{ color: C.pri }}>{scoreLabel}</p>
                  <p className="text-xs mb-3" style={{ color: C.mut }}>
                    {scoreDelta === 0 ? "Same as yesterday" : `${scoreDelta > 0 ? "+" : ""}${scoreDelta} pts from yesterday`}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { label: "Workouts", val: workoutsThisWeek, max: plan?.daysPerWeek ?? 5 },
                      { label: "Nutrition", val: Math.min(100, nutritionPct), max: 100 },
                      { label: "Recovery", val: recovery.score, max: 100 },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-2">
                        <span className="text-xs w-16" style={{ color: C.mut }}>{s.label}</span>
                        <div className="flex-1"><ProgressBar value={s.val} max={s.max} /></div>
                        <span className="text-xs font-mono w-6 text-right" style={{ color: C.sec }}>{Math.round((s.val / s.max) * 100)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-0.5 mt-3">
                    {wa.scores.map((s, i) => (
                      <div key={i} className="h-1 flex-1 rounded-full" style={{ background: s >= 50 ? C.accent : C.border }} />
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Today's Mission */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Today's Mission</SectionLabel>
                {activePlan && plan && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md" style={{ background: C.accentSoft, color: C.accent }}>
                    Week {activePlan.currentWeek} of {plan.totalWeeks}
                  </span>
                )}
              </div>
              {activePlan && plan && todayDay && todayDay.type !== "rest" ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.accentSoft, color: C.accent }}>
                      <Dumbbell size={18} />
                    </div>
                    <div>
                      <p className="text-base font-semibold" style={{ color: C.pri }}>{todayDay.label}</p>
                      <p className="text-xs" style={{ color: C.mut }}>{plan.name} · {todayDay.exercises?.length ?? 0} exercises</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Btn full onClick={onGoToWorkout}><Play size={14} /> Start workout</Btn>
                    <Btn variant="secondary" onClick={onGoToWorkout}>
                      <span className="text-xs">View plan</span>
                    </Btn>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs" style={{ color: C.mut }}>Plan progress</span>
                      <span className="text-xs font-mono" style={{ color: C.mut }}>
                        Week {activePlan.currentWeek}/{plan.totalWeeks}
                      </span>
                    </div>
                    <ProgressBar value={activePlan.currentWeek} max={plan.totalWeeks} height={4} />
                  </div>
                </>
              ) : activePlan && plan && todayDay ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.surfaceAlt, color: C.mut }}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-base font-semibold" style={{ color: C.pri }}>Rest day</p>
                    <p className="text-xs" style={{ color: C.mut }}>Recovery is part of the program</p>
                  </div>
                </div>
              ) : customSession ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.accentSoft, color: C.accent }}>
                      <Dumbbell size={18} />
                    </div>
                    <div>
                      <p className="text-base font-semibold" style={{ color: C.pri }}>Custom Workout</p>
                      <p className="text-xs" style={{ color: C.mut }}>{customSession.exercises.length} exercises · in progress</p>
                    </div>
                  </div>
                  <Btn full onClick={onGoToWorkout}><Play size={14} /> Continue workout</Btn>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.surfaceAlt, color: C.mut }}>
                    <Calendar size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold" style={{ color: C.pri }}>No active plan</p>
                    <p className="text-xs" style={{ color: C.mut }}>Browse weekly plans to auto-populate this card</p>
                  </div>
                  <Btn variant="secondary" onClick={onGoToWorkout}>Browse</Btn>
                </div>
              )}
            </Card>

            {/* Nutrition summary */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <SectionLabel>Nutrition</SectionLabel>
                <span className="text-xs font-mono" style={{ color: C.accent }}>{Math.round(totals.cal).toLocaleString()} / {targets.calories.toLocaleString()} kcal</span>
              </div>
              <div className="flex items-center gap-4">
                <Ring value={totals.cal} max={targets.calories} size={76} stroke={7}>
                  <span className="text-sm font-bold" style={{ color: C.pri, fontFamily: "DM Mono, monospace" }}>{Math.min(100, nutritionPct)}%</span>
                </Ring>
                <div className="flex-1 flex flex-col gap-2">
                  {[
                    { label: "Protein", val: Math.round(totals.prot), max: targets.protein, color: "#4A7C6F" },
                    { label: "Carbs", val: Math.round(totals.carb), max: targets.carbs, color: C.accent },
                    { label: "Fat", val: Math.round(totals.fat), max: targets.fats, color: "#7A6B5A" },
                  ].map(m => (
                    <div key={m.label} className="flex items-center gap-2">
                      <span className="text-xs w-12" style={{ color: C.mut }}>{m.label}</span>
                      <div className="flex-1"><ProgressBar value={m.val} max={m.max} color={m.color} height={5} /></div>
                      <span className="text-xs font-mono w-10 text-right" style={{ color: C.sec }}>{m.val}g</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Stat tiles */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Flame size={16} style={{ color: C.warn }} />, label: "Volume today", val: String(workoutVolume(today)), unit: "lbs", soft: C.warnSoft },
                { icon: <Droplets size={16} style={{ color: "#4A7C6F" }} />, label: "Water", val: waterDisplay, unit: waterUnitLabel, soft: C.accentSoft },
                { icon: <Zap size={16} style={{ color: "#6B5EA8" }} />, label: "Recovery", val: recovery.hasInputs ? String(recovery.score) : "—", unit: "/100", soft: "#F0EDF8" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-3 border flex flex-col gap-2" style={{ background: C.surface, borderColor: C.border }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.soft }}>{s.icon}</div>
                  <div>
                    <p className="text-xs" style={{ color: C.mut }}>{s.label}</p>
                    <p className="text-lg font-bold" style={{ color: C.pri, fontFamily: "DM Mono, monospace" }}>
                      {s.val}<span className="text-xs font-normal ml-0.5" style={{ color: C.mut }}>{s.unit}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── WORKOUT ─────────────────────────────────────────────────────────────────

function ActiveSessionView({ exercises: initialExercises, planName, dayLabel, onComplete, onExit, allowAddExercise, onExercisesChange }: {
  exercises: Exercise[]; planName: string; dayLabel: string;
  onComplete: () => void; onExit: () => void;
  allowAddExercise?: boolean;
  onExercisesChange?: (exercises: Exercise[]) => void;
}) {
  const cfg = getConfig();
  const restDefault = cfg.restTimerSeconds ?? 90;
  const key = todayKey();

  // Exercises are kept in local state (seeded from the prop) so more can be
  // appended mid-session — e.g. a custom workout that grows as you train.
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [showPicker, setShowPicker] = useState(false);

  // Set logs are persisted to the real journal (rj_journal) as they're entered —
  // not just held in local state — so a refresh or tab switch never loses a set.
  const [exIdx, setExIdx] = useState(0);
  const [setLogs, setSetLogs] = useState<{ weight: string; reps: string; done: boolean }[][]>(() => {
    const existing = getDay(key).exArr;
    return exercises.map((ex, i) => {
      const savedEx = existing?.find(e => e.name === ex.name);
      if (savedEx) return savedEx.sets.map(s => ({ weight: s.w != null ? String(s.w) : (ex.weight ?? ""), reps: s.r != null ? String(s.r) : "", done: s.done }));
      return Array.from({ length: ex.sets }, () => ({ weight: ex.weight ?? "", reps: "", done: false }));
    });
  });
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  function addExerciseMidSession(name: string) {
    const ex: Exercise = { name, sets: 3, reps: "10", weight: "" };
    const nextExercises = [...exercises, ex];
    setExercises(nextExercises);
    setSetLogs(prev => [...prev, Array.from({ length: 3 }, () => ({ weight: "", reps: "", done: false }))]);
    setExIdx(nextExercises.length - 1);
    setShowPicker(false);
    onExercisesChange?.(nextExercises);
  }

  // Persist to the journal any time set logs change.
  useEffect(() => {
    const exArr: ExEntry[] = exercises.map((ex, i) => ({
      name: ex.name,
      sets: setLogs[i].map(s => ({
        w: s.weight.trim() === "" ? null : parseFloat(s.weight) || null,
        r: s.reps.trim() === "" ? null : parseInt(s.reps) || null,
        done: s.done,
      })),
    }));
    saveDay(key, { exArr, wType: planName ? `${planName} · ${dayLabel}` : dayLabel, startedAt: getDay(key).startedAt ?? Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setLogs, exercises]);

  useEffect(() => {
    if (restSeconds === null || restSeconds <= 0 || isPaused) return;
    const t = setTimeout(() => setRestSeconds(s => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [restSeconds, isPaused]);

  const totalSets = exercises.reduce((a, e) => a + e.sets, 0);
  const doneSets = setLogs.flat().filter(s => s.done).length;
  const currentEx = exercises[exIdx];
  const currentLogs = setLogs[exIdx];

  const markDone = (sIdx: number) => {
    setSetLogs(prev => {
      const n = prev.map(e => [...e]);
      n[exIdx][sIdx] = { ...n[exIdx][sIdx], done: true };
      return n;
    });
    setRestSeconds(restDefault);
  };

  const updateLog = (sIdx: number, field: "weight" | "reps", val: string) => {
    setSetLogs(prev => {
      const n = prev.map(e => [...e]);
      n[exIdx][sIdx] = { ...n[exIdx][sIdx], [field]: val };
      return n;
    });
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button onClick={onExit} className="w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: C.border, color: C.sec }}>
          <X size={18} />
        </button>
        <div className="text-center">
          <p className="text-xs font-mono" style={{ color: C.mut }}>{planName}</p>
          <p className="text-sm font-semibold" style={{ color: C.pri }}>{dayLabel}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center">
          <span className="text-xs font-mono" style={{ color: C.mut }}>{doneSets}/{totalSets}</span>
        </div>
      </div>

      {/* Session progress */}
      <div className="px-5 mb-4">
        <ProgressBar value={doneSets} max={totalSets} height={4} />
      </div>

      {/* Rest timer */}
      {restSeconds !== null && restSeconds > 0 && (
        <div className="mx-5 mb-4 p-4 rounded-2xl border flex items-center gap-4" style={{ background: C.surface, borderColor: C.border }}>
          <Ring value={restSeconds} max={restDefault} size={56} stroke={5} color={C.accent}>
            <span className="text-xs font-bold font-mono" style={{ color: C.pri }}>{restSeconds}s</span>
          </Ring>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: C.pri }}>Rest period</p>
            <p className="text-xs" style={{ color: C.mut }}>{restDefault} second recovery</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsPaused(p => !p)} className="w-9 h-9 rounded-xl border flex items-center justify-center" style={{ borderColor: C.border, color: C.sec }}>
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button onClick={() => setRestSeconds(null)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.accent, color: C.accentFg }}>
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Exercise tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {exercises.map((ex, i) => {
            const allDone = setLogs[i]?.every(s => s.done);
            return (
              <button key={i} onClick={() => setExIdx(i)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border"
                style={{
                  background: i === exIdx ? C.accent : allDone ? C.accentSoft : C.surface,
                  color: i === exIdx ? C.accentFg : allDone ? C.accent : C.sec,
                  borderColor: i === exIdx ? C.accent : allDone ? C.accent : C.border,
                }}>
                {allDone && i !== exIdx ? <CheckCircle2 size={12} className="inline mr-1" /> : null}
                {i + 1}. {ex.name.split(" ")[0]}
              </button>
            );
          })}
          {allowAddExercise && (
            <button onClick={() => setShowPicker(true)} aria-label="Add exercise"
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border"
              style={{ background: C.surface, borderColor: C.border, color: C.accent }}>
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>

      {showPicker && <ExercisePicker onPick={addExerciseMidSession} onClose={() => setShowPicker(false)} />}

      {/* Current exercise */}
      <div className="flex-1 px-5 pb-28 flex flex-col gap-4">
        <Card>
          <div className="flex items-start justify-between mb-1 gap-3">
            <h2 className="text-lg font-bold flex-1" style={{ color: C.pri }}>{currentEx.name}</h2>
            <a href={ytURL(currentEx.name)} target="_blank" rel="noopener noreferrer"
              aria-label={`Watch ${currentEx.name} tutorial on YouTube`}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#FBEAEA", color: "#C0392B" }}>
              <Play size={14} fill="#C0392B" />
            </a>
            <span className="text-xs font-mono px-2 py-0.5 rounded-md flex-shrink-0" style={{ background: C.surfaceAlt, color: C.mut }}>
              {currentEx.sets} sets
            </span>
          </div>
          <p className="text-sm mb-1" style={{ color: C.mut }}>{currentEx.reps} reps{currentEx.weight ? ` · ${currentEx.weight}` : ""}</p>
          {exerciseTargets(currentEx.name) && (
            <p className="text-xs mb-4" style={{ color: C.accent }}>Targets: {exerciseTargets(currentEx.name)}</p>
          )}
          {currentEx.notes && (
            <p className="text-xs mb-4 px-3 py-2 rounded-xl" style={{ background: C.surfaceAlt, color: C.sec }}>{currentEx.notes}</p>
          )}

          {/* Set rows */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: C.mut }}>
              <span className="w-6">Set</span>
              <span className="flex-1">Weight</span>
              <span className="flex-1">Reps</span>
              <span className="w-10">Done</span>
            </div>
            {currentLogs.map((log, sIdx) => (
              <div key={sIdx} className="flex items-center gap-2">
                <span className="w-6 text-xs font-mono text-center" style={{ color: C.mut }}>{sIdx + 1}</span>
                <input
                  value={log.weight} onChange={e => updateLog(sIdx, "weight", e.target.value)}
                  placeholder={currentEx.weight ?? "lbs"}
                  disabled={log.done}
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm font-mono outline-none border min-h-[44px]"
                  style={{ background: log.done ? C.surfaceAlt : C.surface, borderColor: C.border, color: C.pri, opacity: log.done ? 0.6 : 1, width: 0 }}
                />
                <input
                  value={log.reps} onChange={e => updateLog(sIdx, "reps", e.target.value)}
                  placeholder="reps"
                  disabled={log.done}
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm font-mono outline-none border min-h-[44px]"
                  style={{ background: log.done ? C.surfaceAlt : C.surface, borderColor: C.border, color: C.pri, opacity: log.done ? 0.6 : 1, width: 0 }}
                />
                <button onClick={() => !log.done && markDone(sIdx)}
                  className="w-10 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all border"
                  style={{ background: log.done ? C.accent : C.surface, borderColor: log.done ? C.accent : C.border, color: log.done ? C.accentFg : C.mut }}>
                  <Check size={16} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Nav between exercises */}
        <div className="flex gap-3">
          <Btn variant="secondary" disabled={exIdx === 0} onClick={() => setExIdx(i => i - 1)}>
            <ChevronLeft size={16} /> Prev
          </Btn>
          {exIdx < exercises.length - 1 ? (
            <Btn full onClick={() => setExIdx(i => i + 1)}>
              Next exercise <ChevronRight size={16} />
            </Btn>
          ) : (
            <Btn full onClick={onComplete}>
              <CheckCircle2 size={16} /> Finish workout
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── NUTRITION ────────────────────────────────────────────────────────────────

// Swipe-down-to-dismiss for bottom sheets. Drag the handle down past the
// threshold (or drag more than halfway with any speed) to close; otherwise
// it snaps back. Works with touch and mouse via pointer events.
// Locks the page behind any open bottom sheet so fast swipes near the top or
// bottom of the sheet's own list can't "chain" into scrolling the background.
function useLockBodyScroll() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
}

function useSwipeToDismiss(onClose: () => void) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      startY.current = e.clientY;
      setDragging(true);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!dragging) return;
      const delta = e.clientY - startY.current;
      if (delta > 0) setDragY(delta);
    },
    onPointerUp: () => {
      setDragging(false);
      if (dragY > 90) onClose();
      else setDragY(0);
    },
  };

  const sheetStyle: React.CSSProperties = {
    transform: dragY ? `translateY(${dragY}px)` : undefined,
    transition: dragging ? "none" : "transform 0.2s ease",
  };

  return { handlers, sheetStyle };
}

function ExercisePicker({ onPick, onClose }: { onPick: (name: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>(Object.keys(EX)[0]);
  const cats = Object.keys(EX);
  const list = query.trim()
    ? cats.flatMap(c => EX[c].x.filter(x => x.toLowerCase().includes(query.trim().toLowerCase())).map(x => ({ name: x, targets: EX[c].m })))
    : (EX[cat]?.x ?? []).map(x => ({ name: x, targets: EX[cat].m }));
  useLockBodyScroll();
  const { handlers, sheetStyle } = useSwipeToDismiss(onClose);

  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)", height: "100dvh" }}>
      <div onClick={e => e.stopPropagation()} className="w-full flex flex-col" style={{
        maxWidth: 430, height: "85dvh", background: C.bg,
        borderRadius: "24px 24px 0 0", border: `1px solid ${C.border}`, overflow: "hidden",
        ...sheetStyle,
      }}>
        {/* Sticky header — drag handle, title, search, and category chips are always
            visible; they never get pushed out of view by the scrollable list below. */}
        <div className="flex flex-col gap-3 px-5 pt-5 pb-3" style={{ flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
          <div {...handlers} className="w-9 h-1 rounded-full mx-auto" style={{ background: C.border, touchAction: "none", cursor: "grab", padding: "8px 0" }} />
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold" style={{ color: C.pri }}>Add exercise</p>
            <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.surfaceAlt, color: C.sec }}>
              <X size={16} />
            </button>
          </div>
          <input
            placeholder="Search exercises…" value={query} onChange={e => setQuery(e.target.value)}
            className="w-full box-border px-4 py-3 rounded-xl text-sm outline-none border"
            style={{ background: C.surface, borderColor: C.border, color: C.pri, fontFamily: "Inter, sans-serif" }}
          />
          {!query.trim() && (
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {cats.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border"
                  style={{ background: cat === c ? C.accentSoft : C.surface, borderColor: cat === c ? C.accent : C.border, color: cat === c ? C.accent : C.sec, whiteSpace: "nowrap" }}>
                  {EX[c].e} {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable exercise list — only this region scrolls, so the header above stays put. */}
        <div className="flex-1 overflow-y-auto px-5" style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", paddingBottom: 32 }}>
          {list.map(({ name, targets }) => (
            <div key={name} className="flex items-center gap-2 border-b" style={{ borderColor: C.border }}>
              <button onClick={() => onPick(name)} className="flex-1 min-w-0 text-left py-3">
                <p className="text-sm font-medium" style={{ color: C.pri }}>{name}</p>
                <p className="text-xs mt-0.5" style={{ color: C.accent }}>Targets: {targets}</p>
              </button>
              <a href={ytURL(name)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                aria-label={`Watch ${name} tutorial on YouTube`}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mr-1"
                style={{ background: "#FBEAEA", color: "#C0392B" }}>
                <Play size={12} fill="#C0392B" />
              </a>
            </div>
          ))}
          {!list.length && <p className="text-sm py-6 text-center" style={{ color: C.mut }}>No exercises match "{query}"</p>}
        </div>
      </div>
    </div>
  );
}

function CustomBuilder({ onStart, onCancel }: { onStart: (exercises: Exercise[]) => void; onCancel: () => void }) {
  const [built, setBuilt] = useState<Exercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  function addEx(name: string) {
    setBuilt(b => [...b, { name, sets: 3, reps: "10", weight: "" }]);
    setShowPicker(false);
  }
  function updateEx(i: number, patch: Partial<Exercise>) {
    setBuilt(b => b.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  }
  function removeEx(i: number) {
    setBuilt(b => b.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 border-b" style={{ borderColor: C.border }}>
        <button onClick={onCancel} className="w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: C.border, color: C.sec }}>
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-lg font-bold" style={{ color: C.pri }}>Build a workout</h2>
      </div>

      <div className="flex flex-col gap-3 px-5 pt-5 pb-28 flex-1">
        {!built.length ? (
          <EmptyState icon={<Dumbbell size={28} />} title="No exercises added" body="Search the exercise library and add movements one at a time to build your own session." action="Add exercise" onAction={() => setShowPicker(true)} />
        ) : (
          <>
            {built.map((ex, i) => {
              const targets = exerciseTargets(ex.name);
              return (
                <Card key={i}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: C.pri }}>{ex.name}</p>
                      {targets && <p className="text-xs mt-0.5" style={{ color: C.accent }}>Targets: {targets}</p>}
                    </div>
                    <a href={ytURL(ex.name)} target="_blank" rel="noopener noreferrer"
                      aria-label={`Watch ${ex.name} tutorial`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "#FBEAEA", color: "#C0392B" }}>
                      <Play size={12} fill="#C0392B" />
                    </a>
                    <button onClick={() => removeEx(i)} aria-label={`Remove ${ex.name}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ color: C.mut }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs" style={{ color: C.mut }}>Sets</span>
                      <input type="number" min={1} value={ex.sets} onChange={e => updateEx(i, { sets: parseInt(e.target.value) || 1 })}
                        className="w-full box-border mt-1 px-3 py-2 rounded-lg text-sm outline-none border" style={{ background: C.surface, borderColor: C.border, color: C.pri, fontFamily: "DM Mono, monospace" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs" style={{ color: C.mut }}>Reps</span>
                      <input value={ex.reps} onChange={e => updateEx(i, { reps: e.target.value })}
                        className="w-full box-border mt-1 px-3 py-2 rounded-lg text-sm outline-none border" style={{ background: C.surface, borderColor: C.border, color: C.pri, fontFamily: "DM Mono, monospace" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs" style={{ color: C.mut }}>Weight</span>
                      <input value={ex.weight ?? ""} placeholder="lbs" onChange={e => updateEx(i, { weight: e.target.value })}
                        className="w-full box-border mt-1 px-3 py-2 rounded-lg text-sm outline-none border" style={{ background: C.surface, borderColor: C.border, color: C.pri, fontFamily: "DM Mono, monospace" }} />
                    </div>
                  </div>
                </Card>
              );
            })}
            <Btn variant="secondary" full onClick={() => setShowPicker(true)}><Plus size={14} /> Add another exercise</Btn>
            <div className="mt-2">
              <Btn full size="lg" onClick={() => onStart(built)}><Play size={16} /> Start this workout</Btn>
            </div>
          </>
        )}
      </div>

      {showPicker && <ExercisePicker onPick={addEx} onClose={() => setShowPicker(false)} />}
    </div>
  );
}

function WorkoutScreen({
  activePlan, onSetActivePlan, onPlanChanged, initialView, onConsumedInitialView,
}: {
  activePlan: ActivePlan | null;
  onSetActivePlan: (p: ActivePlan | null) => void;
  onPlanChanged?: () => void;
  initialView?: WorkoutView;
  onConsumedInitialView?: () => void;
}) {
  const [view, setView] = useState<WorkoutView>(() => initialView ?? "overview");
  const [selPlan, setSelPlan] = useState<WeeklyPlan | null>(null);
  const [selDay, setSelDay] = useState<PlanDay | null>(null);
  const [showActive, setShowActive] = useState(false);
  const [toast, setToast] = useState("");
  // The custom session's exercise list is persisted (rj_active_custom) so it
  // survives switching tabs. `showCustomActive` is local — it only controls
  // whether we're looking at the full-screen logging view right now; exiting
  // it does NOT clear the persisted session, so it can be resumed later.
  const [customSession, setCustomSession] = useState<ActiveCustomSession | null>(() => getActiveCustomSession());
  const [showCustomActive, setShowCustomActive] = useState(false);

  useEffect(() => { onConsumedInitialView?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = PLANS.find(p => p.id === activePlan?.planId);
  const todayDay = plan?.schedule[activePlan?.currentDayIdx ?? 0];

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  function finishAndAdvance() {
    setShowActive(false);
    if (!activePlan || !plan) return;
    const next = advancePlanDay(activePlan, plan.schedule.length, plan.totalWeeks);
    if (next.completed) {
      onSetActivePlan(null);
      flash(`${plan.name} complete — nice work. 🎉`);
    } else {
      onSetActivePlan({ ...activePlan, currentWeek: next.currentWeek, currentDayIdx: next.currentDayIdx });
      flash("Workout saved. Plan advanced to the next day.");
    }
    onPlanChanged?.();
  }

  function skipDay() {
    if (!activePlan || !plan) return;
    const next = advancePlanDay(activePlan, plan.schedule.length, plan.totalWeeks);
    if (next.completed) { onSetActivePlan(null); flash(`${plan.name} complete.`); }
    else { onSetActivePlan({ ...activePlan, currentWeek: next.currentWeek, currentDayIdx: next.currentDayIdx }); flash("Day skipped."); }
  }

  function startCustom(exercises: Exercise[]) {
    const session: ActiveCustomSession = { exercises, startedAt: customSession?.startedAt ?? new Date().toISOString() };
    saveActiveCustomSession(session);
    setCustomSession(session);
    setShowCustomActive(true);
    setView("overview");
  }
  function finishCustom() {
    saveActiveCustomSession(null);
    setCustomSession(null);
    setShowCustomActive(false);
    flash("Workout saved.");
  }

  // Custom (non-plan) workout — actively being logged right now
  if (showCustomActive && customSession) {
    return (
      <ActiveSessionView
        exercises={customSession.exercises}
        planName="Custom Workout"
        dayLabel={new Date(customSession.startedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        onComplete={finishCustom}
        onExit={() => setShowCustomActive(false)}
        allowAddExercise
        onExercisesChange={(exs) => {
          const updated = { ...customSession, exercises: exs };
          saveActiveCustomSession(updated);
          setCustomSession(updated);
        }}
      />
    );
  }

  if (view === "build") {
    return (
      <CustomBuilder
        onStart={startCustom}
        onCancel={() => setView("overview")}
      />
    );
  }

  if (showActive && todayDay && todayDay.exercises) {
    return (
      <ActiveSessionView
        exercises={todayDay.exercises}
        planName={plan?.name ?? ""}
        dayLabel={todayDay.label}
        onComplete={finishAndAdvance}
        onExit={() => setShowActive(false)}
      />
    );
  }

  // Plan Detail → Day Detail
  if (view === "day-detail" && selDay) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
        <div className="flex items-center gap-3 px-5 pt-14 pb-4 border-b" style={{ borderColor: C.border }}>
          <button onClick={() => setView("plan-detail")} className="w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: C.border, color: C.sec }}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <p className="text-xs font-mono" style={{ color: C.mut }}>{selPlan?.name}</p>
            <h2 className="text-lg font-bold" style={{ color: C.pri }}>{selDay.label}</h2>
          </div>
        </div>
        {selDay.type === "rest" ? (
          <EmptyState icon={<Zap size={24} />} title="Rest day" body="Recovery is where adaptation happens. Prioritize sleep, light movement, and good nutrition." />
        ) : (
          <div className="flex flex-col gap-3 px-5 pt-5 pb-28">
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>{selDay.exercises?.length} exercises</SectionLabel>
              <Badge label={selDay.type} color={C.accentSoft} textColor={C.accent} />
            </div>
            {selDay.exercises?.map((ex, i) => {
              const targets = exerciseTargets(ex.name);
              return (
                <Card key={i}>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-mono w-5 pt-0.5 flex-shrink-0" style={{ color: C.mut }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: C.pri }}>{ex.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: C.mut }}>
                        {ex.sets} × {ex.reps}{ex.weight ? ` · ${ex.weight}` : ""}
                      </p>
                      {targets && <p className="text-xs mt-1" style={{ color: C.accent }}>Targets: {targets}</p>}
                      {ex.notes && <p className="text-xs mt-1.5 italic" style={{ color: C.mut }}>{ex.notes}</p>}
                    </div>
                    <a href={ytURL(ex.name)} target="_blank" rel="noopener noreferrer"
                      aria-label={`Watch ${ex.name} tutorial on YouTube`}
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "#FBEAEA", color: "#C0392B" }}>
                      <Play size={14} fill="#C0392B" />
                    </a>
                  </div>
                </Card>
              );
            })}
            <div className="mt-2">
              <Btn full size="lg" onClick={() => {
                if (selPlan) onSetActivePlan({ planId: selPlan.id, currentWeek: 1, currentDayIdx: selPlan.schedule.indexOf(selDay), startDate: new Date().toISOString().split("T")[0] });
                setShowActive(true);
              }}>
                <Play size={16} /> Start this session
              </Btn>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "plan-detail" && selPlan) {
    const diffColor: Record<string, string> = { Beginner: C.ok, Intermediate: C.warn, Advanced: C.err };
    const typeColor: Record<string, string> = { strength: C.accent, conditioning: C.warn, rest: C.mut, mobility: C.ok, power: "#6B5EA8" };
    return (
      <div className="flex flex-col min-h-screen" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
        <div className="flex items-center gap-3 px-5 pt-14 pb-4 border-b" style={{ borderColor: C.border }}>
          <button onClick={() => setView("plans")} className="w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: C.border, color: C.sec }}>
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-bold flex-1" style={{ color: C.pri }}>{selPlan.name}</h2>
          <Badge label={selPlan.difficulty} color={`${diffColor[selPlan.difficulty]}18`} textColor={diffColor[selPlan.difficulty]} />
        </div>
        <div className="flex flex-col gap-5 px-5 pt-5 pb-28">
          <p className="text-sm leading-relaxed" style={{ color: C.sec }}>{selPlan.description}</p>
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl p-3 border" style={{ background: C.surface, borderColor: C.border }}>
              <p className="text-xs" style={{ color: C.mut }}>Duration</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: C.pri }}>{selPlan.duration}</p>
            </div>
            <div className="flex-1 rounded-xl p-3 border" style={{ background: C.surface, borderColor: C.border }}>
              <p className="text-xs" style={{ color: C.mut }}>Training days</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: C.pri }}>{selPlan.daysPerWeek} days / week</p>
            </div>
          </div>

          <div>
            <SectionLabel>Weekly schedule</SectionLabel>
            <div className="grid grid-cols-7 gap-1 mt-3">
              {selPlan.schedule.map((d, i) => {
                const isRest = d.type === "rest";
                const isToday = activePlan?.planId === selPlan.id && activePlan?.currentDayIdx === i;
                return (
                  <button key={i} onClick={() => { setSelDay(d); setView("day-detail"); }}
                    className="flex flex-col items-center gap-1 rounded-xl py-3 px-1 transition-all active:scale-95 border"
                    style={{
                      background: isRest ? C.surfaceAlt : C.accentSoft,
                      borderColor: isToday ? C.accent : isRest ? C.border : "rgba(31,92,58,0.2)",
                      borderWidth: isToday ? 2 : 1,
                    }}>
                    <span className="text-xs font-semibold" style={{ color: isRest ? C.mut : C.accent }}>{d.day}</span>
                    {isRest ? (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.border }} />
                    ) : (
                      <div className="w-2 h-2 rounded-full" style={{ background: typeColor[d.type] ?? C.accent }} />
                    )}
                    <span className="text-center" style={{ fontSize: 9, color: isRest ? C.mut : C.sec, lineHeight: 1.2 }}>
                      {isRest ? "Rest" : d.label.split(" ").slice(0, 1).join(" ")}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs mt-2 text-center" style={{ color: C.mut }}>Tap a day to see exercises</p>
          </div>

          <Btn full size="lg" onClick={() => {
            onSetActivePlan({ planId: selPlan.id, currentWeek: 1, currentDayIdx: 0, startDate: new Date().toISOString().split("T")[0] });
            setView("overview");
          }}>
            {activePlan?.planId === selPlan.id ? "Restart this plan" : "Start this plan"}
          </Btn>

          {activePlan?.planId === selPlan.id && (
            <Btn full variant="ghost" onClick={() => { onSetActivePlan(null); setView("plans"); }}>
              Exit active plan
            </Btn>
          )}
        </div>
      </div>
    );
  }

  if (view === "plans") {
    const diffColor: Record<string, string> = { Beginner: C.ok, Intermediate: C.warn, Advanced: C.err };
    return (
      <div className="flex flex-col min-h-screen" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
        <div className="flex items-center gap-3 px-5 pt-14 pb-4 border-b" style={{ borderColor: C.border }}>
          <button onClick={() => setView("overview")} className="w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: C.border, color: C.sec }}>
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-bold" style={{ color: C.pri }}>Weekly Plans</h2>
        </div>
        <div className="flex flex-col gap-3 px-5 pt-5 pb-28">
          {PLANS.map(p => (
            <Card key={p.id} onClick={() => { setSelPlan(p); setView("plan-detail"); }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold" style={{ color: C.pri }}>{p.name}</h3>
                    {activePlan?.planId === p.id && <Badge label="Active" />}
                  </div>
                  <p className="text-xs" style={{ color: C.mut }}>{p.tagline}</p>
                </div>
                <Badge label={p.difficulty} color={`${diffColor[p.difficulty]}15`} textColor={diffColor[p.difficulty]} />
              </div>
              <p className="text-sm mb-3 leading-relaxed" style={{ color: C.sec }}>{p.description.split(".")[0]}.</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono" style={{ color: C.mut }}>{p.duration}</span>
                <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: C.accent }}>
                  View plan <ChevronRight size={14} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Overview
  const today = getDay(todayKey());
  const hasWorkoutHistory = workoutStats().total > 0;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
      <div className="flex items-center justify-between px-5 pt-14 pb-5">
        <h1 className="text-2xl font-bold" style={{ color: C.pri }}>Workout</h1>
        <button onClick={() => setView("plans")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border"
          style={{ borderColor: C.border, color: C.sec, background: C.surface }}>
          <Calendar size={15} /> Plans
        </button>
      </div>

      {toast && (
        <div className="mx-5 mb-3 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: C.accentSoft, color: C.accent }}>
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-4 px-5 pb-28">
        {!activePlan && !hasWorkoutHistory && !customSession ? (
          <EmptyState
            icon={<Dumbbell size={28} />}
            title="No active plan"
            body="Choose a structured weekly plan or start a single session to begin training."
            action="Browse plans"
            onAction={() => setView("plans")}
            secondaryAction="or build your own workout"
            onSecondaryAction={() => setView("build")}
          />
        ) : (
          <>
            {activePlan && plan && todayDay ? (
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>Active plan · Week {activePlan.currentWeek} of {plan.totalWeeks}</SectionLabel>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: C.accentSoft, color: C.accent }}>
                    <Dumbbell size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold" style={{ color: C.pri }}>{todayDay.label}</p>
                    <p className="text-xs" style={{ color: C.mut }}>{plan.name} · {todayDay.exercises?.length ?? 0} exercises</p>
                  </div>
                </div>
                <ProgressBar value={activePlan.currentWeek} max={plan.totalWeeks} height={4} />
                <div className="flex gap-2 mt-4">
                  {todayDay.type !== "rest" && todayDay.exercises && (
                    <Btn full onClick={() => setShowActive(true)}><Play size={14} /> Start session</Btn>
                  )}
                  <Btn variant="secondary" onClick={() => { setSelPlan(plan); setView("plan-detail"); }}>
                    Full plan
                  </Btn>
                </div>
                <div className="flex gap-3 mt-3 pt-3 border-t" style={{ borderColor: C.border }}>
                  <button className="text-xs" style={{ color: C.mut }} onClick={skipDay}>Skip day</button>
                  <button className="text-xs" style={{ color: C.mut }} onClick={() => { setSelPlan(plan); setView("plan-detail"); }}>Reschedule</button>
                  <button className="text-xs ml-auto" style={{ color: C.err }} onClick={() => onSetActivePlan(null)}>Exit plan</button>
                </div>
              </Card>
            ) : (
              <Card>
                <SectionLabel>No active plan</SectionLabel>
                <p className="text-sm mt-3 mb-4" style={{ color: C.mut }}>Choose a structured weekly plan, or build a single custom session.</p>
                <div className="flex gap-2">
                  <Btn full onClick={() => setView("plans")}>Browse plans</Btn>
                  <Btn full variant="secondary" onClick={() => setView("build")}>Build your own</Btn>
                </div>
              </Card>
            )}

            {customSession && (
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel>Custom workout in progress</SectionLabel>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: C.accentSoft, color: C.accent }}>
                    <Dumbbell size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold" style={{ color: C.pri }}>Custom Workout</p>
                    <p className="text-xs" style={{ color: C.mut }}>{customSession.exercises.length} exercises · started {new Date(customSession.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Btn full onClick={() => setShowCustomActive(true)}><Play size={14} /> Continue workout</Btn>
                  <Btn variant="secondary" onClick={() => { saveActiveCustomSession(null); setCustomSession(null); }}>
                    Discard
                  </Btn>
                </div>
              </Card>
            )}

            {/* Recent history, in place of the old fake "Quick sessions" list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Recent sessions</SectionLabel>
              </div>
              {hasWorkoutHistory ? (
                today.exArr?.length ? (
                  <div className="flex items-center gap-3 py-3 border-b" style={{ borderColor: C.border }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.accentSoft, color: C.accent }}>
                      <Dumbbell size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: C.pri }}>Today — {today.wType ?? "Workout"}</p>
                      <p className="text-xs" style={{ color: C.mut }}>{today.exArr.length} exercises logged</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm py-3" style={{ color: C.mut }}>Nothing logged yet today.</p>
                )
              ) : (
                <p className="text-sm py-3" style={{ color: C.mut }}>Your completed sessions will show up here.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── NUTRITION ────────────────────────────────────────────────────────────────

const MEAL_SLOTS = ["Breakfast", "Lunch", "Snack", "Dinner"];

function LogMealSheet({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState("Snack");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<FoodResult | null>(null);
  const [grams, setGrams] = useState("100");
  const [manual, setManual] = useState(false);
  const [m, setM] = useState({ name: "", cal: "", prot: "", carb: "", fat: "" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true); setFailed(false);
    timer.current = setTimeout(async () => {
      const { items, allFailed } = await searchFood(q);
      setResults(items); setSearching(false); setFailed(allFailed);
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  function commit(cal: number, prot: number, carb: number, fat: number, name: string) {
    const key = todayKey();
    const day = getDay(key);
    const meal = { type, name, cal, prot, carb, fat, time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) };
    saveDay(key, { mealArr: [...(day.mealArr ?? []), meal] });
    onClose();
  }
  function savePicked() {
    if (!picked) return;
    const g = parseFloat(grams) || 100;
    const f = g / 100;
    commit(Math.round(picked.cal * f), Math.round(picked.prot * f * 10) / 10, Math.round(picked.carb * f * 10) / 10, Math.round(picked.fat * f * 10) / 10, `${picked.name}${picked.brand ? ` · ${picked.brand}` : ""} (${g}g)`);
  }
  function saveManual() {
    if (!m.name.trim() && !m.cal) return;
    commit(parseFloat(m.cal) || 0, parseFloat(m.prot) || 0, parseFloat(m.carb) || 0, parseFloat(m.fat) || 0, m.name.trim() || "Meal");
  }

  const input: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: "11px 14px", color: C.pri, fontSize: 14, fontFamily: "Inter, sans-serif", outline: "none",
  };

  useLockBodyScroll();
  const { handlers, sheetStyle } = useSwipeToDismiss(onClose);

  return (
    <div onClick={onClose} className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)", height: "100dvh", overflowY: "auto", overscrollBehavior: "contain" }}>
      <div onClick={e => e.stopPropagation()} className="w-full flex flex-col gap-3 px-5 pt-5" style={{
        maxWidth: 430, maxHeight: "80dvh", overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", background: C.bg,
        borderRadius: "24px 24px 0 0", border: `1px solid ${C.border}`, paddingBottom: 32,
        ...sheetStyle,
      }}>
        <div {...handlers} className="w-9 h-1 rounded-full mx-auto" style={{ background: C.border, touchAction: "none", cursor: "grab", padding: "8px 0" }} />
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold" style={{ color: C.pri }}>Log meal</p>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.surfaceAlt, color: C.sec }}>
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2">
          {MEAL_SLOTS.map(t => (
            <button key={t} onClick={() => setType(t)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all border"
              style={{ background: type === t ? C.accentSoft : C.surface, borderColor: type === t ? C.accent : C.border, color: type === t ? C.accent : C.sec }}>
              {t}
            </button>
          ))}
        </div>

        {!manual ? (
          <>
            <input placeholder="Search foods (e.g. chicken breast)…" value={query} onChange={e => setQuery(e.target.value)} style={input} />
            {picked ? (
              <div className="rounded-2xl p-4 border" style={{ background: C.surface, borderColor: C.accent }}>
                <p className="text-sm font-semibold" style={{ color: C.pri }}>{picked.name}{picked.brand ? ` · ${picked.brand}` : ""}</p>
                <p className="text-xs mt-1" style={{ color: C.mut }}>{picked.cal} kcal · {picked.prot}g protein · {picked.carb}g carbs · {picked.fat}g fat ({picked.per})</p>
                <div className="flex items-center gap-2 mt-3">
                  <input style={{ ...input, maxWidth: 90 }} inputMode="numeric" value={grams} onChange={e => setGrams(e.target.value)} />
                  <span className="text-sm" style={{ color: C.mut }}>grams</span>
                  <div className="flex-1" />
                  <Btn onClick={savePicked}>Add</Btn>
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-h-[40px]">
                {searching && <p className="text-sm py-3" style={{ color: C.mut }}>Searching…</p>}
                {!searching && failed && <p className="text-sm py-3" style={{ color: C.err }}>Couldn't reach food databases — enter manually instead.</p>}
                {!searching && !failed && query.trim().length >= 2 && !results.length && (
                  <p className="text-sm py-3" style={{ color: C.mut }}>No results — try a different search or enter manually.</p>
                )}
                {results.map((r, i) => (
                  <button key={i} onClick={() => setPicked(r)} className="text-left py-3 border-b" style={{ borderColor: C.border }}>
                    <p className="text-sm font-semibold" style={{ color: C.pri }}>{r.name}{r.brand ? <span style={{ color: C.mut, fontWeight: 400 }}> · {r.brand}</span> : ""}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.mut }}>{r.cal} kcal · {r.prot}g protein · {r.carb}g carbs ({r.per})</p>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setManual(true)} className="text-xs font-semibold text-left" style={{ color: C.accent }}>Enter manually instead →</button>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <input style={input} placeholder="What did you eat?" value={m.name} onChange={e => setM({ ...m, name: e.target.value })} />
            <div className="flex gap-2">
              <input style={input} inputMode="numeric" placeholder="kcal" value={m.cal} onChange={e => setM({ ...m, cal: e.target.value })} />
              <input style={input} inputMode="numeric" placeholder="protein g" value={m.prot} onChange={e => setM({ ...m, prot: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <input style={input} inputMode="numeric" placeholder="carbs g" value={m.carb} onChange={e => setM({ ...m, carb: e.target.value })} />
              <input style={input} inputMode="numeric" placeholder="fat g" value={m.fat} onChange={e => setM({ ...m, fat: e.target.value })} />
            </div>
            <Btn full size="lg" onClick={saveManual}>Add meal</Btn>
            <button onClick={() => setManual(false)} className="text-xs font-semibold" style={{ color: C.accent }}>← Back to search</button>
          </div>
        )}
      </div>
    </div>
  );
}

function NutritionScreen() {
  useAppData();
  const cfg = getConfig();
  const [sheetOpen, setSheetOpen] = useState(false);
  const day = getDay(todayKey());
  const targets = getTargets();
  const totals = mealTotals(day.mealArr);
  const remaining = Math.max(0, targets.calories - totals.cal);
  const pctCal = targets.calories ? Math.round((totals.cal / targets.calories) * 100) : 0;

  const isMl = cfg.waterUnit === "ml" || cfg.waterUnit === "liters";
  const waterStep = isMl ? 250 : cfg.waterUnit === "cups" ? 1 : 8;
  const waterGoal = cfg.waterGoal || (isMl ? 2400 : 80);
  const waterCups = Math.round(waterGoal / waterStep);
  const currentCups = Math.round((day.water ?? 0) / waterStep);

  const macros = [
    { label: "Protein", current: Math.round(totals.prot), goal: targets.protein, color: "#4A7C6F" },
    { label: "Carbs", current: Math.round(totals.carb), goal: targets.carbs, color: C.accent },
    { label: "Fat", current: Math.round(totals.fat), goal: targets.fats, color: "#7A6B5A" },
  ];

  const meals = MEAL_SLOTS.map(name => {
    const logged = (day.mealArr ?? []).filter(mm => mm.type === name);
    return { name, kcal: Math.round(logged.reduce((a, x) => a + (x.cal || 0), 0)), items: logged.map(x => x.name), time: logged[0]?.time, logged: logged.length > 0 };
  });

  const insight = totals.cal === 0
    ? "Nothing logged yet today. Log your first meal and this screen fills in with real numbers."
    : targets.protein - totals.prot > 5
      ? `Protein intake is ${Math.round(targets.protein - totals.prot)}g below target. A protein-rich snack would close the gap.`
      : "You're on pace with your macro targets today. Keep it up.";

  const hasAnyData = totals.cal > 0 || (day.water ?? 0) > 0;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
      <div className="flex items-center justify-between px-5 pt-14 pb-5">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: C.mut }}>Today</p>
          <h1 className="text-2xl font-bold" style={{ color: C.pri }}>Nutrition</h1>
        </div>
        <button onClick={() => setSheetOpen(true)} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.accent, color: C.accentFg }}>
          <Plus size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-28">
        {!hasAnyData ? (
          <EmptyState icon={<Utensils size={28} />} title="No meals logged" body="Start tracking your food to see calorie totals, macro breakdown, and daily insights." action="Log first meal" onAction={() => setSheetOpen(true)} />
        ) : (
          <>
            {/* Calories */}
            <Card>
              <div className="flex items-center gap-6">
                <Ring value={totals.cal} max={targets.calories} size={100} stroke={9}>
                  <span className="text-xl font-bold" style={{ color: C.pri, fontFamily: "DM Mono, monospace" }}>{Math.min(100, pctCal)}%</span>
                </Ring>
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: "Consumed", val: `${Math.round(totals.cal).toLocaleString()} kcal`, highlight: false },
                    { label: "Remaining", val: `${Math.round(remaining).toLocaleString()} kcal`, highlight: true },
                    { label: "Goal", val: `${targets.calories.toLocaleString()} kcal`, highlight: false },
                  ].map(r => (
                    <div key={r.label} className="flex items-center gap-3">
                      <span className="text-xs w-18" style={{ color: C.mut }}>{r.label}</span>
                      <span className="text-sm font-semibold font-mono" style={{ color: r.highlight ? C.accent : C.pri }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Macros */}
            <Card>
              <SectionLabel>Macros</SectionLabel>
              <div className="flex flex-col gap-3 mt-4">
                {macros.map(m => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium" style={{ color: C.sec }}>{m.label}</span>
                      <span className="text-xs font-mono" style={{ color: C.mut }}>{m.current}g / {m.goal}g</span>
                    </div>
                    <ProgressBar value={m.current} max={m.goal} color={m.color} height={6} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Water */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <SectionLabel>Hydration</SectionLabel>
                  <p className="text-2xl font-bold mt-1" style={{ color: C.pri, fontFamily: "DM Mono, monospace" }}>
                    {currentCups}<span className="text-sm font-normal ml-1" style={{ color: C.mut }}>/ {waterCups} glasses</span>
                  </p>
                </div>
                <Ring value={currentCups} max={waterCups} size={56} stroke={5} color="#4A7C6F">
                  <Droplets size={14} style={{ color: "#4A7C6F" }} />
                </Ring>
              </div>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: waterCups }).map((_, i) => (
                  <button key={i} onClick={() => saveDay(todayKey(), { water: (i < currentCups ? i : i + 1) * waterStep })}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all border"
                    style={{ background: i < currentCups ? "rgba(74,124,111,0.12)" : C.surface, borderColor: i < currentCups ? "rgba(74,124,111,0.3)" : C.border }}>
                    <Droplets size={16} style={{ color: i < currentCups ? "#4A7C6F" : C.mut }} />
                  </button>
                ))}
              </div>
            </Card>

            {/* Meals */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Meals today</SectionLabel>
                <button onClick={() => setSheetOpen(true)} className="w-8 h-8 rounded-lg border flex items-center justify-center" style={{ borderColor: C.border, color: C.sec }}>
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex flex-col gap-0">
                {meals.map((meal, i) => (
                  <div key={meal.name}>
                    {i > 0 && <Divider />}
                    <div className="flex items-center gap-3 py-3">
                      <div className="w-1.5 h-10 rounded-full" style={{ background: C.accent, opacity: meal.logged ? 0.4 : 0.12 }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold" style={{ color: C.pri }}>{meal.name}</p>
                          {meal.logged && <span className="text-sm font-mono" style={{ color: C.accent }}>{meal.kcal} kcal</span>}
                        </div>
                        <p className="text-xs truncate mt-0.5" style={{ color: C.mut }}>
                          {meal.logged ? `${meal.time ?? ""} · ${meal.items.join(", ")}` : "Not logged yet"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Daily insight */}
            <div className="p-4 rounded-2xl" style={{ background: C.surface, borderLeft: `4px solid ${C.accent}`, borderTop: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: C.accent }}>Daily insight</p>
              <p className="text-sm" style={{ color: C.sec }}>{insight}</p>
            </div>
          </>
        )}
      </div>

      {sheetOpen && <LogMealSheet onClose={() => setSheetOpen(false)} />}
    </div>
  );
}

// ─── PROGRESS ─────────────────────────────────────────────────────────────────

const TRACKED_LIFTS = [
  { key: "Barbell Bench Press", label: "Bench" },
  { key: "Back Squat", label: "Squat" },
  { key: "Deadlift", label: "Deadlift" },
  { key: "Barbell Overhead Press", label: "OHP" },
];

function ProgressScreen() {
  useAppData();
  const meas = getMeasurements().filter(m => m.weight).sort((a, b) => a.date.localeCompare(b.date));
  const hasData = meas.length >= 2 || bestSets().size > 0;

  // Weight chart data, last 8 points
  const weightData = meas.slice(-8).map(m => ({
    date: new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    w: parseFloat(m.weight!),
  }));
  const currentWeight = meas.length ? parseFloat(meas[meas.length - 1].weight!) : null;
  const weightUnit = meas.length ? (meas[meas.length - 1].wu || "lbs") : "lbs";
  const weightDelta = meas.length >= 2 ? currentWeight! - parseFloat(meas[0].weight!) : 0;

  // Strength — current vs. earliest known 1RM-style top set per tracked lift
  const strengthData = TRACKED_LIFTS.map(lift => {
    const hist = strengthHistory(lift.key);
    if (hist.length < 1) return null;
    return { lift: lift.label, now: hist[hist.length - 1].weight, prev: hist[0].weight };
  }).filter((x): x is { lift: string; now: number; prev: number } => !!x);

  // Latest measurements with deltas vs the earliest logged entry
  const first = meas[0];
  const last = meas[meas.length - 1];
  function measRow(label: string, key: "chest" | "waist" | "hips" | "arms" | "thighs" | "fat", unit: string) {
    if (!last?.[key]) return null;
    const lv = parseFloat(last[key]!);
    const fv = first?.[key] ? parseFloat(first[key]!) : null;
    const ch = fv !== null ? lv - fv : null;
    return { label, val: `${lv} ${unit}`, ch: ch !== null ? `${ch >= 0 ? "+" : ""}${ch.toFixed(1)}` : "—", up: ch !== null ? ch >= 0 : true };
  }
  const measCells = [
    measRow("Chest", "chest", last?.mu || "in"),
    measRow("Waist", "waist", last?.mu || "in"),
    measRow("Hips", "hips", last?.mu || "in"),
    measRow("Upper arm", "arms", last?.mu || "in"),
    measRow("Thigh", "thighs", last?.mu || "in"),
    measRow("Body fat", "fat", "%"),
  ].filter((x): x is NonNullable<typeof x> => !!x);

  // Consistency heatmap — real data, 12 weeks × 7 days
  const { grid } = consistencyGrid();

  return (
    <div className="flex flex-col min-h-screen" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
      <div className="px-5 pt-14 pb-5">
        <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: C.mut }}>Last 12 weeks</p>
        <h1 className="text-2xl font-bold" style={{ color: C.pri }}>Progress</h1>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-28">
        {!hasData ? (
          <EmptyState icon={<TrendingUp size={28} />} title="No progress data yet" body="Log your weight and workouts consistently to see trends and analytics here." />
        ) : (
          <>
            {/* Weight chart */}
            {weightData.length >= 2 && (
              <Card>
                <div className="flex items-center justify-between mb-1">
                  <SectionLabel>Body weight</SectionLabel>
                  <div className="flex items-center gap-1">
                    {weightDelta <= 0 ? <ArrowDown size={12} style={{ color: C.ok }} /> : <ArrowUp size={12} style={{ color: C.warn }} />}
                    <span className="text-xs font-mono" style={{ color: weightDelta <= 0 ? C.ok : C.warn }}>{Math.abs(weightDelta).toFixed(1)} {weightUnit}</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold" style={{ color: C.pri, fontFamily: "DM Mono, monospace" }}>{currentWeight}</span>
                  <span className="text-xs" style={{ color: C.mut }}>{weightUnit} · today</span>
                </div>
                <div style={{ height: 130 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weightData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <defs>
                        <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.accent} stopOpacity={0.18} />
                          <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.mut, fontFamily: "DM Mono, monospace" }} axisLine={false} tickLine={false} />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: C.mut, fontFamily: "DM Mono, monospace" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 11, fontFamily: "DM Mono, monospace", color: C.pri }}
                        cursor={{ stroke: C.border, strokeWidth: 1 }} />
                      <Area type="monotone" dataKey="w" name="weight-area" stroke={C.accent} strokeWidth={2} fill="url(#wgrad)" dot={false} activeDot={{ r: 4, fill: C.accent }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Measurements */}
            {measCells.length > 0 && (
              <Card>
                <SectionLabel className="mb-3">Body measurements</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  {measCells.map(m => (
                    <div key={m.label} className="rounded-xl p-3 border" style={{ background: C.surface, borderColor: C.border }}>
                      <p className="text-xs" style={{ color: C.mut }}>{m.label}</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: C.pri, fontFamily: "DM Mono, monospace" }}>{m.val}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {m.up ? <ArrowUp size={10} style={{ color: C.accent }} /> : <ArrowDown size={10} style={{ color: C.ok }} />}
                        <span className="text-xs font-mono" style={{ color: m.up ? C.accent : C.ok }}>{m.ch}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Strength */}
            {strengthData.length > 0 && (
              <Card>
                <SectionLabel className="mb-1">Strength — top logged set</SectionLabel>
                <p className="text-xs mb-4" style={{ color: C.mut }}>Current vs. earliest logged (lbs)</p>
                <div style={{ height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={strengthData} barGap={4} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <XAxis dataKey="lift" tick={{ fontSize: 9, fill: C.mut, fontFamily: "DM Mono, monospace" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, "auto"]} tick={{ fontSize: 9, fill: C.mut, fontFamily: "DM Mono, monospace" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 11, fontFamily: "DM Mono, monospace", color: C.pri }}
                        cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                      <Bar dataKey="prev" fill={C.surfaceAlt} radius={[4, 4, 0, 0]} name="Earliest" />
                      <Bar dataKey="now" fill={C.accent} radius={[4, 4, 0, 0]} name="Current" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Heatmap */}
            <Card>
              <SectionLabel className="mb-3">Training activity — last 12 weeks</SectionLabel>
              <div className="flex gap-1.5">
                {grid[0].map((_, wi) => (
                  <div key={wi} className="flex flex-col gap-1.5 flex-1">
                    {grid.map((row, di) => {
                      const v = row[wi];
                      const level = v === 3 ? 1 : v === 2 ? 0.55 : v === 1 ? 0.25 : 0;
                      return (
                        <div key={`${wi}-${di}`} className="rounded-sm aspect-square"
                          style={{ background: level > 0 ? `rgba(31,92,58,${level})` : C.surfaceAlt }} />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-2">
                <span className="text-xs" style={{ color: C.mut }}>Less</span>
                {[0.15, 0.35, 0.6, 1].map(o => (
                  <div key={o} className="w-3 h-3 rounded-sm" style={{ background: `rgba(31,92,58,${o})` }} />
                ))}
                <span className="text-xs" style={{ color: C.mut }}>More</span>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ─── GOALS ────────────────────────────────────────────────────────────────────

const GOAL_COLORS = [C.accent, "#4A7C6F", "#7A6B5A", "#6B5EA8"];
const GOAL_CATEGORIES = ["Body composition", "Strength", "Cardio", "Consistency", "Custom"];

function AddGoalSheet({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(GOAL_CATEGORIES[0]);
  const [unit, setUnit] = useState("lbs");
  const [dir, setDir] = useState<"up" | "down">("down");
  const [start, setStart] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [linked, setLinked] = useState<LinkedMetric>("manual");

  function save() {
    if (!title.trim() || !target) return;
    const s = parseFloat(start) || 0;
    const t = parseFloat(target);
    addGoal({
      title: title.trim(), category, unit: unit.trim() || "units", dir,
      start: s, target: t, current: s,
      deadline: deadline || undefined,
      color: GOAL_COLORS[Math.floor(Math.random() * GOAL_COLORS.length)],
      linkedMetric: linked,
    });
    onClose();
  }

  const input: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: "11px 14px", color: C.pri, fontSize: 14, fontFamily: "Inter, sans-serif", outline: "none",
  };

  useLockBodyScroll();
  const { handlers, sheetStyle } = useSwipeToDismiss(onClose);

  return (
    <div onClick={onClose} className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)", height: "100dvh", overflowY: "auto", overscrollBehavior: "contain" }}>
      <div onClick={e => e.stopPropagation()} className="w-full flex flex-col gap-3 px-5 pt-5" style={{
        maxWidth: 430, maxHeight: "85dvh", overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", background: C.bg,
        borderRadius: "24px 24px 0 0", border: `1px solid ${C.border}`, paddingBottom: 32,
        ...sheetStyle,
      }}>
        <div {...handlers} className="w-9 h-1 rounded-full mx-auto" style={{ background: C.border, touchAction: "none", cursor: "grab", padding: "8px 0" }} />
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold" style={{ color: C.pri }}>New goal</p>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.surfaceAlt, color: C.sec }}>
            <X size={16} />
          </button>
        </div>

        <Input label="Goal title" value={title} onChange={setTitle} placeholder="Reach 180 lbs body weight" />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.mut }}>Category</span>
          <div className="flex gap-2 flex-wrap">
            {GOAL_CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                style={{ background: category === c ? C.accentSoft : C.surface, borderColor: category === c ? C.accent : C.border, color: category === c ? C.accent : C.sec }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.mut }}>Track automatically?</span>
          <div className="flex gap-2 flex-wrap">
            {([
              { id: "manual" as const, label: "Manual entry" },
              { id: "weight" as const, label: "Body weight" },
              { id: "bodyFat" as const, label: "Body fat %" },
              { id: "streak" as const, label: "Training streak" },
            ]).map(o => (
              <button key={o.id} onClick={() => { setLinked(o.id); if (o.id === "weight") setUnit("lbs"); if (o.id === "bodyFat") setUnit("%"); if (o.id === "streak") setUnit("days"); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                style={{ background: linked === o.id ? C.accentSoft : C.surface, borderColor: linked === o.id ? C.accent : C.border, color: linked === o.id ? C.accent : C.sec }}>
                {o.label}
              </button>
            ))}
          </div>
          {linked !== "manual" && (
            <p className="text-xs mt-1" style={{ color: C.mut }}>Current value updates automatically from your logged data.</p>
          )}
        </div>

        <div className="flex gap-2">
          <Input label="Starting value" value={start} onChange={setStart} placeholder="192.4" type="number" />
          <Input label="Target value" value={target} onChange={setTarget} placeholder="180" type="number" />
        </div>
        <div className="flex gap-2">
          <Input label="Unit" value={unit} onChange={setUnit} placeholder="lbs" />
          <div className="flex-1 flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.mut }}>Direction</span>
            <div className="flex gap-2">
              <button onClick={() => setDir("down")} className="flex-1 py-3 rounded-xl text-xs font-semibold border" style={{ background: dir === "down" ? C.accentSoft : C.surface, borderColor: dir === "down" ? C.accent : C.border, color: dir === "down" ? C.accent : C.sec }}>Decreasing</button>
              <button onClick={() => setDir("up")} className="flex-1 py-3 rounded-xl text-xs font-semibold border" style={{ background: dir === "up" ? C.accentSoft : C.surface, borderColor: dir === "up" ? C.accent : C.border, color: dir === "up" ? C.accent : C.sec }}>Increasing</button>
            </div>
          </div>
        </div>
        <Input label="Deadline (optional)" value={deadline} onChange={setDeadline} placeholder="2026-09-30" type="date" />

        <Btn full size="lg" disabled={!title.trim() || !target} onClick={save}>Create goal</Btn>
      </div>
    </div>
  );
}

function GoalsScreen() {
  useAppData();
  const [showAdd, setShowAdd] = useState(false);
  const goals = getGoalsList().map(g => ({ ...g, current: resolveGoalCurrent(g.linkedMetric, g.current) }));

  const active = goals.filter(g => !g.completed);
  const completed = goals.filter(g => g.completed);
  const onTrack = active.filter(g => {
    const range = Math.abs(g.target - g.start) || 1;
    const progress = g.dir === "down" ? (g.start - g.current) / range : (g.current - g.start) / range;
    return progress >= 0.4;
  }).length;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: C.bg, fontFamily: "Inter, sans-serif" }}>
      <div className="flex items-center justify-between px-5 pt-14 pb-5">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: C.mut }}>{new Date().getFullYear()}</p>
          <h1 className="text-2xl font-bold" style={{ color: C.pri }}>Goals</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.accent, color: C.accentFg }}>
          <Plus size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-28">
        {!goals.length ? (
          <EmptyState icon={<Target size={28} />} title="No goals set" body="Define your fitness goals with targets and deadlines to track progress over time." action="Add first goal" onAction={() => setShowAdd(true)} />
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Active", val: String(active.length), icon: <Target size={15} style={{ color: C.accent }} />, soft: C.accentSoft },
                { label: "On track", val: String(onTrack), icon: <Activity size={15} style={{ color: C.ok }} />, soft: C.okSoft },
                { label: "Completed", val: String(completed.length), icon: <CheckCircle2 size={15} style={{ color: "#6B5EA8" }} />, soft: "#F0EDF8" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-3 border flex flex-col gap-2" style={{ background: C.surface, borderColor: C.border }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.soft }}>{s.icon}</div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: C.pri, fontFamily: "DM Mono, monospace" }}>{s.val}</p>
                    <p className="text-xs" style={{ color: C.mut }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Goal cards */}
            {[...active, ...completed].map((g) => {
              const range = Math.abs(g.target - g.start) || 1;
              const progress = g.dir === "down" ? (g.start - g.current) / range : (g.current - g.start) / range;
              const pct = Math.max(0, Math.min(1, progress));
              const isDone = g.completed || pct >= 1;
              return (
                <Card key={g.id}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md inline-block" style={{ background: `${g.color}15`, color: g.color }}>{g.category}</span>
                        {isDone && <Badge label="Completed" color={C.okSoft} textColor={C.ok} />}
                        {g.linkedMetric !== "manual" && <Badge label="Auto-tracked" color={C.accentSoft} textColor={C.accent} />}
                      </div>
                      <p className="text-sm font-semibold leading-snug mb-3" style={{ color: C.pri }}>{g.title}</p>
                    </div>
                    <Ring value={pct * 100} max={100} size={52} stroke={5} color={g.color}>
                      <span className="text-xs font-bold font-mono" style={{ color: C.pri }}>{Math.round(pct * 100)}%</span>
                    </Ring>
                  </div>
                  <ProgressBar value={pct * 100} max={100} color={g.color} height={5} />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs" style={{ color: C.mut }}>Current</p>
                        <p className="text-sm font-semibold font-mono" style={{ color: C.pri }}>{g.current} {g.unit}</p>
                      </div>
                      <span style={{ color: C.mut }}>→</span>
                      <div>
                        <p className="text-xs" style={{ color: C.mut }}>Target</p>
                        <p className="text-sm font-semibold font-mono" style={{ color: g.color }}>{g.target} {g.unit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {g.deadline && <>
                        <p className="text-xs" style={{ color: C.mut }}>Deadline</p>
                        <p className="text-xs font-mono" style={{ color: C.sec }}>{new Date(g.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </>}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-3 pt-3 border-t" style={{ borderColor: C.border }}>
                    {g.linkedMetric === "manual" && !isDone && (
                      <button className="text-xs font-semibold" style={{ color: C.accent }} onClick={() => {
                        const v = prompt(`Update current value (${g.unit})`, String(g.current));
                        if (v && !isNaN(parseFloat(v))) updateGoal(g.id, { current: parseFloat(v) });
                      }}>Update progress</button>
                    )}
                    {!isDone && (
                      <button className="text-xs font-semibold" style={{ color: C.ok }} onClick={() => updateGoal(g.id, { completed: true })}>Mark complete</button>
                    )}
                    <button className="text-xs ml-auto" style={{ color: C.err }} onClick={() => deleteGoal(g.id)}>Delete</button>
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>

      {showAdd && <AddGoalSheet onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// ─── PROFILE / SETTINGS ───────────────────────────────────────────────────────

const ACTIVITY_LEVELS = [
  { label: "Sedentary", sub: "Little to no exercise", mult: 1.2 },
  { label: "Light", sub: "1–3 days/week", mult: 1.375 },
  { label: "Moderate", sub: "3–5 days/week", mult: 1.55 },
  { label: "Very Active", sub: "6–7 days/week", mult: 1.725 },
  { label: "Athlete", sub: "Physical job + training", mult: 1.9 },
];
const GOAL_CODES = [
  { code: "lose_fast" as const, label: "Lose weight (fast)" },
  { code: "lose" as const, label: "Lose weight" },
  { code: "lose_slow" as const, label: "Lose weight (slow)" },
  { code: "maintain" as const, label: "Maintain" },
  { code: "recomp" as const, label: "Recomp (lose fat, build muscle)" },
  { code: "gain_slow" as const, label: "Build muscle (slow)" },
  { code: "gain" as const, label: "Build muscle" },
];

function CalculatorSheet({ onClose }: { onClose: () => void }) {
  const cfg = getConfig();
  const goals = getGoals();
  const isMetric = cfg.metricUnits;
  const wUnit = cfg.weightUnit; // 'lbs' | 'kg'
  const { handlers, sheetStyle } = useSwipeToDismiss(onClose);
  useLockBodyScroll();

  const [sex, setSex] = useState<"male" | "female">("male");
  const [age, setAge] = useState("30");
  // Height: cm when metric, feet+inches when imperial — matches whatever the
  // user picked in Profile → Unit preferences instead of always showing cm.
  const [heightCm, setHeightCm] = useState(String(cfg.heightCm ?? 178));
  const [heightFt, setHeightFt] = useState("5");
  const [heightIn, setHeightIn] = useState("10");
  const [weight, setWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState(String(goals.goalWeight ?? ""));
  const [activityIdx, setActivityIdx] = useState(2);
  const [goalCode, setGoalCode] = useState<typeof GOAL_CODES[number]["code"]>(goals.goalCode as never ?? "lose");

  // Auto-fill body fat % from the most recent measurement, if logged — this
  // is what unlocks the more accurate Katch-McArdle formula. Editable in
  // case the user wants to override or clear it.
  const lastMeas = [...getMeasurements()].sort((a, b) => a.date.localeCompare(b.date)).pop();
  const [bodyFat, setBodyFat] = useState(lastMeas?.fat ?? "");

  const [result, setResult] = useState<ReturnType<typeof calcTargets> | null>(null);

  function resolvedHeightCm(): number {
    if (isMetric) return parseFloat(heightCm) || 0;
    const ft = parseFloat(heightFt) || 0, inch = parseFloat(heightIn) || 0;
    return (ft * 12 + inch) * 2.54;
  }
  function toLbs(v: number): number {
    return wUnit === "kg" ? v * 2.20462 : v;
  }

  function compute() {
    const wRaw = parseFloat(weight);
    const gwRaw = parseFloat(goalWeight) || wRaw;
    const h = resolvedHeightCm();
    const a = parseInt(age);
    if (!wRaw || !h || !a) return;
    const bf = parseFloat(bodyFat);
    const r = calcTargets({
      sex, age: a, heightCm: h,
      weightLbs: toLbs(wRaw), goalWeightLbs: toLbs(gwRaw),
      activity: ACTIVITY_LEVELS[activityIdx].mult, goalCode,
      bodyFatPct: !isNaN(bf) && bf > 0 ? bf : undefined,
    });
    setResult(r);
  }

  function save() {
    if (!result) return;
    const wRaw = parseFloat(weight);
    const gwRaw = parseFloat(goalWeight) || wRaw;
    saveGoals({
      results: { calories: result.calories, protein: result.protein, carbs: result.carbs, fats: result.fats },
      goalWeight: gwRaw, startWeight: wRaw, goalCode,
    });
    saveConfig({ activity: ACTIVITY_LEVELS[activityIdx].mult, activityLabel: ACTIVITY_LEVELS[activityIdx].label, heightCm: resolvedHeightCm() });
    // Keep the Goals tab showing the same target — one canonical weight
    // goal instead of two disconnected numbers living in different screens.
    syncCalculatorWeightGoal(wRaw, gwRaw, wUnit);
    onClose();
  }


  return (
    <div onClick={onClose} className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)", height: "100dvh", overflowY: "auto", overscrollBehavior: "contain" }}>
      <div onClick={e => e.stopPropagation()} className="w-full flex flex-col gap-3 px-5 pt-5" style={{
        maxWidth: 430, maxHeight: "88dvh", overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", background: C.bg,
        borderRadius: "24px 24px 0 0", border: `1px solid ${C.border}`, paddingBottom: 32,
        ...sheetStyle,
      }}>
        <div {...handlers} className="w-9 h-1 rounded-full mx-auto" style={{ background: C.border, touchAction: "none", cursor: "grab", padding: "8px 0" }} />
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold" style={{ color: C.pri }}>Calorie & Macro Calculator</p>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.surfaceAlt, color: C.sec }}>
            <X size={16} />
          </button>
        </div>
        <p className="text-xs" style={{ color: C.mut }}>
          Uses Katch-McArdle (more accurate — based on your real lean mass) when body fat % is known, otherwise Mifflin-St Jeor.
        </p>

        <div className="flex gap-2">
          <button onClick={() => setSex("male")} className="flex-1 py-3 rounded-xl text-sm font-semibold border-2" style={{ border: `2px solid ${sex === "male" ? C.accent : C.border}`, background: sex === "male" ? C.accentSoft : C.surface, color: sex === "male" ? C.accent : C.sec }}>Male</button>
          <button onClick={() => setSex("female")} className="flex-1 py-3 rounded-xl text-sm font-semibold border-2" style={{ border: `2px solid ${sex === "female" ? C.accent : C.border}`, background: sex === "female" ? C.accentSoft : C.surface, color: sex === "female" ? C.accent : C.sec }}>Female</button>
        </div>

        <div className="flex gap-2">
          <Input label="Age" value={age} onChange={setAge} placeholder="30" type="number" />
          {isMetric ? (
            <Input label="Height (cm)" value={heightCm} onChange={setHeightCm} placeholder="178" type="number" />
          ) : (
            <div className="flex-1 flex gap-2">
              <Input label="Height (ft)" value={heightFt} onChange={setHeightFt} placeholder="5" type="number" />
              <Input label="Height (in)" value={heightIn} onChange={setHeightIn} placeholder="10" type="number" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Input label={`Current weight (${wUnit})`} value={weight} onChange={setWeight} placeholder={wUnit === "kg" ? "86" : "190"} type="number" />
          <Input label={`Goal weight (${wUnit})`} value={goalWeight} onChange={setGoalWeight} placeholder={wUnit === "kg" ? "82" : "180"} type="number" />
        </div>
        <Input label="Body fat % (optional — improves accuracy)" value={bodyFat} onChange={setBodyFat} placeholder="e.g. 18" type="number" />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.mut }}>Activity level</span>
          <div className="flex flex-col gap-1.5">
            {ACTIVITY_LEVELS.map((a, i) => (
              <button key={a.label} onClick={() => setActivityIdx(i)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl border text-left"
                style={{ background: activityIdx === i ? C.accentSoft : C.surface, borderColor: activityIdx === i ? C.accent : C.border }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: activityIdx === i ? C.accent : C.pri }}>{a.label}</p>
                  <p className="text-xs" style={{ color: C.mut }}>{a.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.mut }}>Goal</span>
          <div className="flex gap-2 flex-wrap">
            {GOAL_CODES.map(g => (
              <button key={g.code} onClick={() => setGoalCode(g.code)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                style={{ background: goalCode === g.code ? C.accentSoft : C.surface, borderColor: goalCode === g.code ? C.accent : C.border, color: goalCode === g.code ? C.accent : C.sec }}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <Btn full onClick={compute}>Calculate</Btn>

        {result && (
          <div className="rounded-2xl p-4 border" style={{ background: C.accentSoft, borderColor: C.accent }}>
            <p className="text-xs font-semibold mb-2" style={{ color: C.accent }}>
              Your personalized targets · {result.formula === "katch-mcardle" ? "Katch-McArdle" : "Mifflin-St Jeor"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Calories", val: `${result.calories.toLocaleString()} kcal` },
                { label: "Protein", val: `${result.protein}g` },
                { label: "Carbs", val: `${result.carbs}g` },
                { label: "Fat", val: `${result.fats}g` },
              ].map(r => (
                <div key={r.label}>
                  <p className="text-xs" style={{ color: C.mut }}>{r.label}</p>
                  <p className="text-base font-bold font-mono" style={{ color: C.pri }}>{r.val}</p>
                </div>
              ))}
            </div>
            {result.floored && (
              <p className="text-xs mt-2" style={{ color: C.warn }}>
                Calculated deficit was too aggressive — floored to a safe minimum.
              </p>
            )}
            <div className="mt-3">
              <Btn full onClick={save}>Save as my targets</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileScreen({ onClose }: { onClose: () => void }) {
  useAppData();
  const cfg = getConfig();
  const streak = calcStreak();
  const goals = getGoals();
  const [showCalc, setShowCalc] = useState(false);

  function editField(label: string, key: "name" | "email" | "goal", currentVal: string) {
    const v = prompt(`Edit ${label}`, currentVal);
    if (v !== null) saveConfig({ [key]: v });
  }
  function editHeight() {
    const v = prompt("Height in cm", String(cfg.heightCm ?? ""));
    if (v && !isNaN(parseFloat(v))) saveConfig({ heightCm: parseFloat(v) });
  }
  function editDob() {
    const v = prompt("Date of birth (YYYY-MM-DD)", cfg.dob ?? "");
    if (v) saveConfig({ dob: v });
  }
  function editRestTimer() {
    const v = prompt("Default rest timer (seconds)", String(cfg.restTimerSeconds ?? 90));
    if (v && !isNaN(parseInt(v))) saveConfig({ restTimerSeconds: parseInt(v) });
  }
  function doExport() {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ascend-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function doClear() {
    if (confirm("This permanently deletes all workouts, meals, measurements, and goals stored on this device. This cannot be undone. Continue?")) {
      clearAllData();
      onClose();
      location.reload();
    }
  }

  const heightDisplay = cfg.heightCm ? `${Math.floor(cfg.heightCm / 2.54 / 12)}'${Math.round((cfg.heightCm / 2.54) % 12)}" (${cfg.heightCm} cm)` : "Not set";
  const dobDisplay = cfg.dob ? new Date(cfg.dob).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Not set";
  const memberSince = cfg.memberSince ? new Date(cfg.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—";

  const notifKeys: { key: string; label: string; sub: string }[] = [
    { key: "workout", label: "Workout reminders", sub: "Daily at 7:00 AM" },
    { key: "meal", label: "Nutrition check-in", sub: "At 12:00 PM" },
    { key: "weekly", label: "Weekly summary", sub: "Every Sunday" },
    { key: "milestones", label: "Goal milestones", sub: "When you hit a target" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: C.bg, fontFamily: "Inter, sans-serif", maxWidth: 430, margin: "0 auto" }}>
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 border-b" style={{ borderColor: C.border }}>
        <button onClick={onClose} className="w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: C.border, color: C.sec }}>
          <X size={18} />
        </button>
        <h2 className="text-lg font-bold" style={{ color: C.pri }}>Profile & Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-8" style={{ scrollbarWidth: "none" }}>
        {/* Profile header */}
        <div className="flex flex-col items-center py-8 gap-3 border-b" style={{ borderColor: C.border }}>
          <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center" style={{ borderColor: C.border, background: C.surfaceAlt, color: C.mut }}>
            <User size={32} />
          </div>
          <button className="text-center" onClick={() => editField("your name", "name", cfg.name ?? "")}>
            <p className="text-lg font-bold" style={{ color: C.pri }}>{cfg.name?.trim() || "Add your name"}</p>
            <p className="text-sm" style={{ color: C.mut }}>Member since {memberSince}</p>
          </button>
          <Badge label={`${streak}-day streak`} color={C.accentSoft} textColor={C.accent} />
        </div>

        <div className="px-5 pt-5 flex flex-col gap-6">
          {/* Personal info */}
          <div>
            <SectionLabel>Personal information</SectionLabel>
            <div className="mt-3 rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
              {[
                { label: "Name", value: cfg.name?.trim() || "Not set", onPress: () => editField("your name", "name", cfg.name ?? "") },
                { label: "Email", value: cfg.email || "Not set", onPress: () => editField("email", "email", cfg.email ?? "") },
                { label: "Height", value: heightDisplay, onPress: editHeight },
                { label: "Date of birth", value: dobDisplay, onPress: editDob },
                { label: "Goal", value: cfg.goal || "Not set", onPress: () => editField("goal", "goal", cfg.goal ?? "") },
              ].map((row, i) => (
                <div key={row.label}>
                  {i > 0 && <Divider />}
                  <button onClick={row.onPress} className="w-full flex items-center justify-between px-4 py-3 text-left" style={{ background: C.surface, minHeight: 48 }}>
                    <span className="text-sm" style={{ color: C.mut }}>{row.label}</span>
                    <span className="text-sm font-medium" style={{ color: C.pri }}>{row.value}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Units */}
          <div>
            <SectionLabel>Unit preferences</SectionLabel>
            <div className="mt-3 flex gap-2">
              {(["imperial", "metric"] as const).map(u => {
                const active = (u === "metric") === cfg.metricUnits;
                return (
                  <button key={u} onClick={() => saveConfig({ metricUnits: u === "metric", weightUnit: u === "metric" ? "kg" : "lbs" })}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all capitalize"
                    style={{ border: `2px solid ${active ? C.accent : C.border}`, background: active ? C.accentSoft : C.surface, color: active ? C.accent : C.sec }}>
                    {u}
                    <p className="text-xs font-normal mt-0.5" style={{ color: C.mut }}>{u === "imperial" ? "lbs, ft, fl oz" : "kg, cm, ml"}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notifications */}
          <div>
            <SectionLabel>Notifications</SectionLabel>
            <div className="mt-3 rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
              {notifKeys.map((n, i) => {
                const on = !!cfg.notifications?.[n.key];
                return (
                  <div key={n.key}>
                    {i > 0 && <Divider />}
                    <div className="flex items-center gap-3 px-4 py-3" style={{ background: C.surface, minHeight: 56 }}>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: C.pri }}>{n.label}</p>
                        <p className="text-xs" style={{ color: C.mut }}>{n.sub}</p>
                      </div>
                      <button
                        onClick={() => saveConfig({ notifications: { ...cfg.notifications, [n.key]: !on } })}
                        className="w-10 h-6 rounded-full relative cursor-pointer transition-all" style={{ background: on ? C.accent : C.border }}>
                        <div className="w-4 h-4 rounded-full absolute top-1 transition-all" style={{ left: on ? 22 : 2, background: C.surface }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* App preferences */}
          <div>
            <SectionLabel>App preferences</SectionLabel>
            <div className="mt-3 rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
              <button onClick={() => setShowCalc(true)} className="w-full flex items-center justify-between px-4 py-3" style={{ minHeight: 48, background: C.surface }}>
                <div className="text-left">
                  <span className="text-sm block" style={{ color: C.pri }}>Calorie & Macro Calculator</span>
                  <span className="text-xs" style={{ color: C.mut }}>
                    {goals.results ? `${goals.results.calories.toLocaleString()} kcal · ${goals.results.protein}g protein — personalized` : "Not calculated — using default targets"}
                  </span>
                </div>
                <ChevronRight size={16} style={{ color: C.mut }} />
              </button>
              <Divider />
              <button onClick={editRestTimer} className="w-full flex items-center justify-between px-4 py-3" style={{ minHeight: 48 }}>
                <span className="text-sm" style={{ color: C.pri }}>Default rest timer</span>
                <span className="text-xs font-mono" style={{ color: C.mut }}>{cfg.restTimerSeconds ?? 90}s</span>
              </button>
              <Divider />
              <div className="flex items-center justify-between px-4 py-3" style={{ background: C.surface, minHeight: 48 }}>
                <span className="text-sm" style={{ color: C.pri }}>Theme</span>
                <div className="flex items-center gap-2 text-xs" style={{ color: C.mut }}>
                  <Moon size={13} /> Light (fixed)
                </div>
              </div>
            </div>
          </div>

          {/* Data */}
          <div>
            <SectionLabel>Data & privacy</SectionLabel>
            <div className="mt-3 rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
              <button onClick={doExport} className="w-full flex items-center gap-3 px-4 py-3" style={{ background: C.surface, minHeight: 48 }}>
                <Download size={16} style={{ color: C.sec }} />
                <span className="text-sm flex-1 text-left" style={{ color: C.pri }}>Export your data</span>
                <ChevronRight size={16} style={{ color: C.mut }} />
              </button>
            </div>
          </div>

          <button onClick={doClear} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border" style={{ background: C.surface, borderColor: C.border, minHeight: 48 }}>
            <LogOut size={16} style={{ color: C.err }} />
            <span className="text-sm font-semibold" style={{ color: C.err }}>Clear all data</span>
          </button>
          <p className="text-xs text-center px-4" style={{ color: C.mut }}>
            Your data is stored only on this device — there's no account system yet, so there's nothing to sign out of.
          </p>
        </div>
      </div>

      {showCalc && <CalculatorSheet onClose={() => setShowCalc(false)} />}
    </div>
  );
}

// ─── TAB BAR ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  { id: "dashboard", label: "Home", icon: a => <Home size={22} strokeWidth={a ? 2 : 1.5} /> },
  { id: "workout", label: "Train", icon: a => <Dumbbell size={22} strokeWidth={a ? 2 : 1.5} /> },
  { id: "nutrition", label: "Eat", icon: a => <Utensils size={22} strokeWidth={a ? 2 : 1.5} /> },
  { id: "progress", label: "Stats", icon: a => <TrendingUp size={22} strokeWidth={a ? 2 : 1.5} /> },
  { id: "goals", label: "Goals", icon: a => <Target size={22} strokeWidth={a ? 2 : 1.5} /> },
];

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="fixed left-1/2 z-40" style={{ bottom: 20, transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 398 }}>
      <div className="flex items-center justify-between" style={{
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${C.border}`, borderRadius: 999, padding: 6,
        boxShadow: "0 8px 28px rgba(26,25,23,0.10)",
      }}>
        {TABS.map(t => {
          const isActive = t.id === active;
          return (
            <button key={t.id} onClick={() => onChange(t.id)} aria-current={isActive ? "page" : undefined}
              className="flex items-center justify-center gap-1.5 transition-all active:scale-95"
              style={{
                flex: isActive ? 1.6 : 1,
                background: isActive ? C.accentSoft : "transparent",
                border: isActive ? `1px solid ${C.accent}30` : "1px solid transparent",
                borderRadius: 999, padding: isActive ? "10px 14px" : "10px 0",
                color: isActive ? C.accent : C.mut, minHeight: 44,
              }}>
              {t.icon(isActive)}
              {isActive && (
                <span className="text-xs" style={{ fontWeight: 700, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
                  {t.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [, forceUpdate] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboarded());
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showProfile, setShowProfile] = useState(false);
  const [activePlan, setActivePlanState] = useState<ActivePlan | null>(() => getActivePlan());
  const [workoutInitialView, setWorkoutInitialView] = useState<WorkoutView | undefined>(undefined);

  function setActivePlan(p: ActivePlan | null) {
    saveActivePlan(p);
    setActivePlanState(p);
  }
  function goBuildWorkout() {
    setWorkoutInitialView("build");
    setActiveTab("workout");
  }

  if (showOnboarding) {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: C.bg, fontFamily: "Inter, sans-serif" }}>
        <Onboarding onComplete={() => { setShowOnboarding(false); forceUpdate(n => n + 1); }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: C.bg, fontFamily: "Inter, sans-serif", position: "relative" }}>
      {showProfile && <ProfileScreen onClose={() => setShowProfile(false)} />}

      <div className="flex flex-col min-h-screen">
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {activeTab === "dashboard" && (
            <DashboardScreen
              activePlan={activePlan}
              onGoToWorkout={() => setActiveTab("workout")}
              onOpenProfile={() => setShowProfile(true)}
              onBuildWorkout={goBuildWorkout}
            />
          )}
          {activeTab === "workout" && (
            <WorkoutScreen
              activePlan={activePlan}
              onSetActivePlan={setActivePlan}
              initialView={workoutInitialView}
              onConsumedInitialView={() => setWorkoutInitialView(undefined)}
            />
          )}
          {activeTab === "nutrition" && <NutritionScreen />}
          {activeTab === "progress" && <ProgressScreen />}
          {activeTab === "goals" && <GoalsScreen />}
        </div>
        <TabBar active={activeTab} onChange={setActiveTab} />
      </div>
    </div>
  );
}
