// Shared visual primitives, used by App.tsx's screens and by AuthScreen.tsx.
// Extracted out of App.tsx specifically so AuthScreen (which needs these) and
// App (which renders AuthScreen when signed out) don't import from each other.

export const C = {
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

export function Btn({
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

export function Input({
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

export function Card({ children, className = "", onClick, style }: { children: React.ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <div onClick={onClick}
      className={`rounded-2xl p-4 border ${className} ${onClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
      style={{ background: C.surface, borderColor: C.border, ...style }}>
      {children}
    </div>
  );
}

export function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-xs font-semibold uppercase tracking-widest ${className}`} style={{ color: C.mut, letterSpacing: "0.08em" }}>
      {children}
    </span>
  );
}
