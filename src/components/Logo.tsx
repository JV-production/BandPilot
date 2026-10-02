// Logo BandPilot – nota spojená se symbolem „play“ (vektorově podle originálu).
const MARK_PATHS = (
  <>
    <path
      d="M283 190 L456 312 Q474 326 456 340 L240 494 Q205 512 180 488 L230 430 Z"
      fill="#fff"
      stroke="#fff"
      strokeWidth="6"
      strokeLinejoin="round"
    />
    <path d="M150 200 A57.5 57.5 0 0 1 265 200 L265 400 L150 400 Z" fill="#fff" />
    <circle cx="206" cy="398" r="72" fill="#fff" />
    <path d="M274 130 L274 395 Q272 470 182 486" fill="none" stroke="#000" strokeWidth="17" />
    <path d="M140 342 Q195 302 276 300" fill="none" stroke="#000" strokeWidth="15" />
  </>
);

export function LogoMark({ className = "h-8 w-8", color = "rgb(var(--brand))" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="120 130 370 385" className={className} aria-hidden>
      <defs>
        <mask id="bp-mark" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="600">
          {MARK_PATHS}
        </mask>
      </defs>
      <rect x="0" y="0" width="600" height="600" fill={color} mask="url(#bp-mark)" />
    </svg>
  );
}

/** Logo s nápisem: „Band“ obrysem, „Pilot“ plně – jako v originálu. */
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = {
    sm: { mark: "h-7 w-7", text: "text-xl", stroke: "1.2px" },
    md: { mark: "h-9 w-9", text: "text-2xl", stroke: "1.4px" },
    lg: { mark: "h-14 w-14", text: "text-[2.6rem]", stroke: "2px" },
  }[size];
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className={s.mark} />
      <span className={`font-display font-black leading-none tracking-tight ${s.text}`}>
        <span
          className="text-transparent"
          style={{ WebkitTextStroke: `${s.stroke} rgb(var(--brand))` }}
        >
          Band
        </span>
        <span className="text-brand">Pilot</span>
      </span>
    </span>
  );
}
