import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as L from "lucide-react";

/* =====================================================================
   ROADGUARD AI  |  SIH26203  |  Intelligent Road Safety & Emergency Response
   Single-file React prototype. All data is seeded demo data (Pune region).
   ===================================================================== */

/* ---------- theme ---------- */
const C = {
  bg: "#050b1f",
  panel: "#0b1736",
  panel2: "#102250",
  line: "#1d3260",
  text: "#e8eeff",
  mute: "#93a6d1",
  orange: "#ff6a13",
  red: "#ff4d55",
  danger: "#d92b34",
  green: "#33d686",
  amber: "#ffc247",
  blue: "#5b98ff",
  sky: "#38bdf8",
};

const CSS = `
@keyframes rgPulse{0%{transform:scale(.7);opacity:.9}100%{transform:scale(2.4);opacity:0}}
@keyframes rgBlink{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes rgFlash{0%,100%{box-shadow:0 0 0 0 rgba(255,77,85,.6)}50%{box-shadow:0 0 0 9px rgba(255,77,85,0)}}
.rg-pulse{transform-box:fill-box;transform-origin:center;animation:rgPulse 1.6s ease-out infinite}
.rg-blink{animation:rgBlink 1s steps(2,start) infinite}
.rg-flash{animation:rgFlash 1.1s ease-out infinite}
.rg button:focus-visible,.rg a:focus-visible,.rg input:focus-visible{outline:2px solid #ffc247;outline-offset:2px}
.rg g:focus-visible{outline:none}
.rg button{cursor:pointer}
.rg button:disabled{cursor:not-allowed;opacity:.45}
.rg input[type=range]{accent-color:#ff6a13;width:100%}
@media (prefers-reduced-motion:reduce){.rg-pulse,.rg-blink,.rg-flash{animation:none}}
`;

/* ---------- small helpers ---------- */
const Icon = ({ name, size = 18, ...rest }) => {
  const Cmp = L[name] || L.Circle;
  return <Cmp size={size} {...rest} />;
};
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const pad = (n) => String(n).padStart(2, "0");
const clockStr = (sec) => {
  const t = 14 * 3600 + 32 * 60 + 8 + Math.floor(sec);
  return `${pad(Math.floor(t / 3600) % 24)}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
};
const mmss = (sec) => `${pad(Math.floor(sec / 60))}:${pad(Math.floor(sec % 60))}`;
const r1 = (v) => Math.round(v * 10) / 10;

const lens = (pts) => pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
function pointAt(pts, f) {
  f = Math.min(1, Math.max(0, f));
  const Ls = lens(pts);
  let t = f * Ls.reduce((a, b) => a + b, 0);
  for (let i = 0; i < Ls.length; i++) {
    if (t <= Ls[i] || i === Ls.length - 1) {
      const k = Ls[i] ? Math.min(1, t / Ls[i]) : 0;
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      return { x: x1 + (x2 - x1) * k, y: y1 + (y2 - y1) * k, a: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI };
    }
    t -= Ls[i];
  }
  return { x: pts[0][0], y: pts[0][1], a: 0 };
}
function partial(pts, f) {
  const Ls = lens(pts);
  let t = Math.min(1, Math.max(0, f)) * Ls.reduce((a, b) => a + b, 0);
  const out = [pts[0]];
  for (let i = 0; i < Ls.length; i++) {
    if (t >= Ls[i]) {
      out.push(pts[i + 1]);
      t -= Ls[i];
    } else {
      const k = t / Ls[i];
      out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]);
      break;
    }
  }
  return out;
}
const pstr = (pts) => pts.map((p) => p.join(",")).join(" ");

/* ---------- seeded data ---------- */
const TYPE_META = {
  pothole: { label: "Pothole", color: C.orange, icon: "CircleDot" },
  water: { label: "Waterlogging", color: C.sky, icon: "Droplets" },
  debris: { label: "Road debris", color: C.amber, icon: "AlertTriangle" },
};
const REPORT_COST = { pothole: 4500, water: 15000, debris: 2500 };

const SEED_HAZARDS = [
  { id: "h1", type: "pothole", x: 130, y: 200, place: "Baner Road near Sakal Nagar", ward: "Baner", dept: "PMC", cost: 4200, by: "Aarav Joshi", ago: "12 min ago", confirms: 7, status: "open" },
  { id: "h2", type: "water", x: 200, y: 150, place: "Aundh underpass", ward: "Aundh", dept: "PMC", cost: 18500, by: "Priya Nair", ago: "35 min ago", confirms: 19, status: "open" },
  { id: "h3", type: "pothole", x: 330, y: 150, place: "Aundh–Ravet BRTS road", ward: "Aundh", dept: "PCMC", cost: 6800, by: "Imran Shaikh", ago: "1 h ago", confirms: 11, status: "assigned" },
  { id: "h4", type: "pothole", x: 260, y: 222, place: "University Road near Ganeshkhind", ward: "Shivajinagar", dept: "PMC", cost: 5400, by: "Kavita Patil", ago: "2 h ago", confirms: 5, status: "open" },
  { id: "h5", type: "water", x: 70, y: 105, place: "Pashan link road", ward: "Pashan", dept: "PMC", cost: 21000, by: "Suresh Iyer", ago: "48 min ago", confirms: 14, status: "open" },
  { id: "h6", type: "debris", x: 260, y: 62, place: "Pune University circle", ward: "Shivajinagar", dept: "PMC", cost: 3200, by: "Neha Gupta", ago: "20 min ago", confirms: 3, status: "open" },
  { id: "h7", type: "pothole", x: 42, y: 240, place: "Mhalunge road", ward: "Baner", dept: "PMRDA", cost: 3900, by: "Vikram Singh", ago: "3 h ago", confirms: 8, status: "open" },
  { id: "h8", type: "debris", x: 335, y: 62, place: "Pashan–Sus road", ward: "Pashan", dept: "PMC", cost: 2800, by: "Farhan Ali", ago: "5 h ago", confirms: 2, status: "fixed" },
];
const ORIG_STATUS = Object.fromEntries(SEED_HAZARDS.map((h) => [h.id, h.status]));

const WARDS = [
  { ward: "Baner", body: "PMC", open: 41, avg: 4.2, sla: 82 },
  { ward: "Aundh", body: "PMC", open: 33, avg: 3.6, sla: 88 },
  { ward: "Kothrud", body: "PMC", open: 47, avg: 6.1, sla: 71 },
  { ward: "Hadapsar", body: "PMC", open: 58, avg: 7.4, sla: 64 },
  { ward: "Viman Nagar", body: "PMC", open: 29, avg: 3.1, sla: 91 },
  { ward: "Shivajinagar", body: "PMC", open: 26, avg: 3.9, sla: 85 },
  { ward: "Pashan", body: "PMC", open: 22, avg: 5.0, sla: 77 },
  { ward: "Hinjewadi", body: "PMRDA", open: 52, avg: 8.3, sla: 58 },
  { ward: "Chinchwad", body: "PCMC", open: 36, avg: 4.9, sla: 79 },
  { ward: "Talegaon stretch", body: "NHAI", open: 18, avg: 5.5, sla: 76 },
];

const SCENARIOS = {
  city: { label: "City, Pune", without: [9, 14, 4, 18], withRG: [0.2, 6.8, 2, 9] },
  highway: { label: "Highway, NH48", without: [18, 22, 6, 34], withRG: [0.2, 12, 3, 18] },
  rural: { label: "Rural district", without: [25, 28, 8, 45], withRG: [0.2, 15, 4, 25] },
};
const STAGES = [
  { k: "Alert reaches responders", c: C.red },
  { k: "Ambulance reaches site", c: C.orange },
  { k: "Loading at site", c: C.amber },
  { k: "Transport to hospital", c: C.blue },
];
const TYPICAL_MIN = SCENARIOS.city.without.reduce((a, b) => a + b, 0);

const WEEK = [
  { d: "Mon", rep: 38, fix: 22 },
  { d: "Tue", rep: 44, fix: 30 },
  { d: "Wed", rep: 41, fix: 28 },
  { d: "Thu", rep: 52, fix: 35 },
  { d: "Fri", rep: 47, fix: 41 },
  { d: "Sat", rep: 60, fix: 44 },
  { d: "Sun", rep: 35, fix: 26 },
];

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DONORS = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": GROUPS,
  "AB-": ["A-", "B-", "AB-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"],
};
const BANKS0 = [
  { id: "k1", name: "Sanjeevani in-house blood centre", area: "Chinchwad", km: 0.2, stock: { "A+": 6, "A-": 1, "B+": 3, "B-": 0, "AB+": 2, "AB-": 0, "O+": 8, "O-": 2 } },
  { id: "k2", name: "Chinchwad Rotary Blood Bank", area: "Chinchwad", km: 2.4, stock: { "A+": 12, "A-": 2, "B+": 9, "B-": 1, "AB+": 4, "AB-": 1, "O+": 15, "O-": 3 } },
  { id: "k3", name: "Pimpri Red Cross Blood Bank", area: "Pimpri", km: 4.8, stock: { "A+": 7, "A-": 0, "B+": 1, "B-": 0, "AB+": 1, "AB-": 0, "O+": 10, "O-": 1 } },
  { id: "k4", name: "Aundh Civil Blood Centre", area: "Aundh", km: 11.6, stock: { "A+": 9, "A-": 1, "B+": 14, "B-": 2, "AB+": 3, "AB-": 1, "O+": 18, "O-": 4 } },
];

/* ---------- emergency geometry ---------- */
const HOSP_NAME = "Sanjeevani Trauma Centre, Chinchwad";
const EM = {
  scene: [78, 78],
  base: [150, 240],
  hosp: [330, 128],
  toScene: [[150, 240], [150, 170], [78, 170], [78, 78]],
  toHosp: [[78, 78], [190, 78], [190, 128], [330, 128]],
};
const SIGNALS = [
  { name: "Hinjewadi Chowk", f: 0.12, officer: "Const. S. Bhosale" },
  { name: "Wakad Chowk", f: 0.3, officer: "Const. P. Kamble" },
  { name: "Kalewadi Phata", f: 0.5, officer: "HC M. Shinde" },
  { name: "Dange Chowk", f: 0.7, officer: "Const. R. Jagtap" },
  { name: "Chinchwad Station Chowk", f: 0.88, officer: "HC A. Mane" },
];

const INIT = { phase: "idle", countdown: 10, p: 0, elapsed: 0, approved: false, manual: false, log: [] };

function toDispatched(s, reason) {
  const t = s.elapsed;
  const first =
    reason === "auto"
      ? "No response from rider, SOS sent automatically"
      : reason === "rider"
      ? "Rider confirmed SOS from the countdown screen"
      : null;
  return {
    ...s,
    phase: "dispatched",
    p: 0,
    elapsed: t + 45,
    log: [
      ...s.log,
      ...(first ? [{ t, text: first }] : []),
      { t: t + 5, text: "108 control room, family contacts and nearest hospital notified with live GPS" },
      { t: t + 20, text: "Ambulance MH-12 AMB 0108 dispatched from Wakad station" },
      { t: t + 25, text: "Pre-alert with injury summary and blood group sent to " + HOSP_NAME },
    ],
  };
}
function toTransport(s, mode) {
  const approved = s.approved || mode === "auto";
  const t = s.elapsed;
  return {
    ...s,
    phase: "transport",
    p: 0,
    approved,
    elapsed: t + 120,
    log: [
      ...s.log,
      { t, text: "Ambulance reached crash site, paramedic Sunil Jadhav attending" },
      { t: t + 120, text: "Patient stabilised and loaded, heading to hospital" },
      {
        t: t + 120,
        text: approved
          ? mode === "auto"
            ? "Green corridor activated automatically on 5 signals"
            : "Green corridor active on 5 signals (pre-approved)"
          : "Green corridor waiting for Traffic Control approval",
      },
    ],
  };
}
function stepInc(s, dt, speed, mode) {
  if (s.phase === "detected") {
    const countdown = s.countdown - dt;
    const elapsed = s.elapsed + dt;
    if (countdown <= 0) return toDispatched({ ...s, countdown: 0, elapsed }, "auto");
    return { ...s, countdown, elapsed };
  }
  if (s.phase === "dispatched") {
    const p = s.p + (dt * speed) / 12;
    const elapsed = s.elapsed + dt * speed * 30;
    if (p >= 1) return toTransport({ ...s, p: 1, elapsed }, mode);
    return { ...s, p, elapsed };
  }
  if (s.phase === "transport") {
    const rate = s.approved ? 1 : 0.5;
    const p = s.p + (dt * speed * rate) / 16;
    const elapsed = s.elapsed + dt * speed * 33.75;
    if (p >= 1)
      return {
        ...s,
        p: 1,
        elapsed,
        phase: "arrived",
        log: [...s.log, { t: elapsed, text: "Patient handed over to trauma team at " + HOSP_NAME }],
      };
    return { ...s, p, elapsed };
  }
  return s;
}
function ambPos(inc) {
  if (inc.phase === "dispatched") return pointAt(EM.toScene, inc.p);
  if (inc.phase === "transport") return pointAt(EM.toHosp, inc.p);
  if (inc.phase === "arrived") return { x: EM.hosp[0] - 16, y: EM.hosp[1], a: 0 };
  return { x: EM.base[0], y: EM.base[1], a: 0 };
}
function etaMin(inc) {
  if (inc.phase === "dispatched") return { site: Math.ceil(6 * (1 - inc.p)), hosp: Math.ceil(6 * (1 - inc.p)) + 2 + 9 };
  if (inc.phase === "transport") return { site: 0, hosp: Math.max(1, Math.ceil(9 * (1 - inc.p) * (inc.approved ? 1 : 2))) };
  return { site: 0, hosp: 0 };
}
function signalState(inc, s) {
  if (inc.phase === "arrived") return "cleared";
  if (inc.phase !== "transport") return "standby";
  if (!inc.approved) return "held";
  if (inc.p > s.f + 0.05) return "cleared";
  if (inc.p > s.f - 0.2) return "green";
  return "standby";
}
const SIG_META = {
  standby: { label: "Normal cycle", color: C.mute },
  green: { label: "Priority green", color: C.green },
  cleared: { label: "Passed, restored", color: C.blue },
  held: { label: "Awaiting approval", color: C.amber },
};

/* ---------- UI atoms ---------- */
function Card({ children, className = "", style = {}, ...rest }) {
  return (
    <div className={"rounded-2xl p-4 " + className} style={{ background: C.panel, border: `1px solid ${C.line}`, ...style }} {...rest}>
      {children}
    </div>
  );
}
function Btn({ children, onClick, kind = "primary", icon, disabled, className = "", style = {}, ...rest }) {
  const kinds = {
    primary: { background: C.orange, color: "#1a0b02", border: `1px solid ${C.orange}` },
    danger: { background: C.danger, color: "#fff", border: `1px solid ${C.danger}` },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.line}` },
    soft: { background: C.panel2, color: C.text, border: `1px solid ${C.line}` },
    good: { background: "#0f3d2a", color: C.green, border: "1px solid #1d6b47" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={"inline-flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold " + className}
      style={{ minHeight: 44, ...kinds[kind], ...style }}
      {...rest}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}
function Chip({ children, tone = "mute", icon, className = "" }) {
  const col = { ok: C.green, warn: C.amber, bad: C.red, info: C.blue, mute: C.mute, hot: C.orange }[tone] || C.mute;
  return (
    <span className={"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold " + className} style={{ color: col, background: col + "26" }}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}
function Toggle({ on, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="relative rounded-full flex-shrink-0"
      style={{ width: 46, height: 26, background: on ? C.orange : "#27407a", border: "none" }}
    >
      <span className="absolute rounded-full" style={{ top: 4, left: on ? 24 : 4, width: 18, height: 18, background: "#fff", transition: "left .15s" }} />
    </button>
  );
}
function Seg({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl p-1" style={{ background: "#0a142e", border: `1px solid ${C.line}` }} role="group">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className="rounded-lg px-3 text-sm font-semibold"
          style={{ minHeight: 36, border: "none", background: value === o.v ? C.orange : "transparent", color: value === o.v ? "#1a0b02" : C.mute }}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
function Meter({ v, color = C.orange, h = 8 }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: h, background: "#16275a" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, v))}%`, height: "100%", background: color }} />
    </div>
  );
}
function Title({ icon, children, right }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <span style={{ color: C.orange }}>
          <Icon name={icon} size={18} />
        </span>
        <h2 className="text-base font-bold truncate">{children}</h2>
      </div>
      {right}
    </div>
  );
}
function Stat({ icon, label, value, sub, tone = C.text }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
      <div className="flex items-center gap-2 text-xs" style={{ color: C.mute }}>
        <Icon name={icon} size={14} />
        {label}
      </div>
      <div className="text-2xl font-extrabold mt-1" style={{ color: tone, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-0.5" style={{ color: C.mute }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ---------- map atoms ---------- */
function CityBase({ pid, river, park, labels = [], label, children }) {
  return (
    <svg viewBox="0 0 400 300" className="w-full block rounded-xl" style={{ background: "#071127" }} role="img" aria-label={label}>
      <defs>
        <pattern id={"grid-" + pid} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#0e1d42" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="400" height="300" fill={`url(#grid-${pid})`} />
      {park && (
        <g>
          <rect x={park[0]} y={park[1]} width={park[2]} height={park[3]} rx="10" fill="#0a2b2f" />
          <text x={park[0] + park[2] / 2} y={park[1] + park[3] / 2 + 3} textAnchor="middle" fontSize="8" fill="#3b8179">
            Park
          </text>
        </g>
      )}
      <path d={river} fill="none" stroke="#0e3a76" strokeWidth="16" strokeLinecap="round" opacity="0.75" />
      {labels.map((l) => (
        <text key={l.t} x={l.x} y={l.y} fontSize="9" fill="#6d86bd">
          {l.t}
        </text>
      ))}
      {children}
    </svg>
  );
}
function Road({ pts, w = 9, faint }) {
  return (
    <g opacity={faint ? 0.7 : 1}>
      <polyline points={pstr(pts)} fill="none" stroke="#183266" strokeWidth={w + 2} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={pstr(pts)} fill="none" stroke="#25448a" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      {w > 6 && <polyline points={pstr(pts)} fill="none" stroke="#7a98d6" strokeWidth="0.8" strokeDasharray="4 5" opacity="0.6" />}
    </g>
  );
}
function Pin({ type, assigned }) {
  return (
    <g>
      {type === "pothole" && (
        <g>
          <circle r="9" fill={C.orange} stroke="#fff" strokeWidth="1.2" />
          <ellipse rx="4.5" ry="2.8" fill="#2b1200" />
        </g>
      )}
      {type === "water" && <path d="M0,-10 C5,-3 8,0 8,3.5 A8,8 0 0 1 -8,3.5 C-8,0 -5,-3 0,-10Z" fill={C.sky} stroke="#fff" strokeWidth="1.2" />}
      {type === "debris" && (
        <g>
          <polygon points="0,-10 10,8 -10,8" fill={C.amber} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
          <text y="6" textAnchor="middle" fontSize="11" fontWeight="800" fill="#2b1a00">
            !
          </text>
        </g>
      )}
      {assigned && <circle cx="8" cy="-8" r="4" fill={C.green} stroke="#071127" strokeWidth="1.2" />}
    </g>
  );
}
const lbl = { paintOrder: "stroke" };

/* =====================================================================
   TAB 1: DRIVER DASHBOARD
   ===================================================================== */
const ROUTE_A = [[20, 240], [130, 240], [130, 150], [380, 150]];
const ROUTE_B = [[260, 20], [260, 150], [260, 280]];
const JUNCTION = [260, 150];
const CYCLE = 18;
const A_AT_J = (110 + 90 + 130) / 450;
const B_OFFSET = (0.5 - A_AT_J + 1) % 1;

function wardAt(x, y) {
  if (y < 110) return x < 160 ? "Pashan" : "Shivajinagar";
  if (y > 190 && x > 240) return "Shivajinagar";
  return x < 170 ? "Baner" : "Aundh";
}

function DriverTab({ hazards, setHazards, toast, active }) {
  const [clock, setClock] = useState(0);
  const [running, setRunning] = useState(true);
  const [layers, setLayers] = useState({ pothole: true, water: true, debris: true, blind: true });
  const [alertsOn, setAlertsOn] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [reportType, setReportType] = useState("pothole");
  const [helmetOff, setHelmetOff] = useState(false);
  const [drowsy, setDrowsy] = useState(false);
  const [monitor, setMonitor] = useState(true);
  const [alertness, setAlertness] = useState(92);
  const [speed, setSpeed] = useState(42);
  const [warnCount, setWarnCount] = useState(14);

  const tgt = useRef({ speed: 42, alert: 90 });
  const monRef = useRef(true);
  monRef.current = monitor;

  useEffect(() => {
    if (!active || !running) return;
    const id = setInterval(() => {
      setClock((c) => c + 0.1);
      setSpeed((s) => s + (tgt.current.speed - s) * 0.12);
      if (monRef.current) setAlertness((a) => a + (tgt.current.alert - a) * 0.06);
    }, 100);
    return () => clearInterval(id);
  }, [active, running]);

  const f = (clock % CYCLE) / CYCLE;
  const A = pointAt(ROUTE_A, f);
  const B = pointAt(ROUTE_B, (f + B_OFFSET) % 1);
  const tA = (A_AT_J - f) * CYCLE;
  const distB = Math.round(Math.hypot(B.x - JUNCTION[0], B.y - JUNCTION[1]) * 0.9);
  const blindAlert = alertsOn && tA > 0.2 && tA < 4.6;

  let near = null;
  let nd = 1e9;
  hazards.forEach((h) => {
    if (h.status === "fixed" || !layers[h.type]) return;
    const d = Math.hypot(h.x - A.x, h.y - A.y);
    const ahead = (h.x - A.x) * Math.cos((A.a * Math.PI) / 180) + (h.y - A.y) * Math.sin((A.a * Math.PI) / 180) > 0;
    if (ahead && d < nd) {
      nd = d;
      near = h;
    }
  });
  const hazardAhead = alertsOn && near && nd < 42 ? { h: near, m: Math.round(nd * 0.9) } : null;

  const drowsyAlarm = monitor && alertness < 55;
  tgt.current = { speed: blindAlert ? 24 : hazardAhead ? 30 : 42, alert: drowsy ? 30 : 90 };

  const prevAlert = useRef(false);
  useEffect(() => {
    if (blindAlert && !prevAlert.current) setWarnCount((c) => c + 1);
    prevAlert.current = blindAlert;
  }, [blindAlert]);

  const visible = hazards.filter((h) => h.status !== "fixed" && layers[h.type]);
  const selected = hazards.find((h) => h.id === selectedId);
  const score = Math.max(20, 94 - (helmetOff ? 22 : 0) - (drowsyAlarm ? 18 : 0) - (blindAlert ? 4 : 0));
  const blinks = Math.round(6 + 10 * (Math.min(100, alertness) / 100));

  const report = () => {
    const h = {
      id: "u" + Date.now(),
      type: reportType,
      x: Math.round(A.x),
      y: Math.round(A.y),
      place: "Reported at your live location",
      ward: wardAt(A.x, A.y),
      dept: "PMC",
      cost: REPORT_COST[reportType],
      by: "Rohan Kulkarni (you)",
      ago: "just now",
      confirms: 1,
      status: "open",
    };
    setHazards((hs) => [...hs, h]);
    setSelectedId(h.id);
    toast(`${TYPE_META[reportType].label} reported in ${h.ward}. Nearby riders will be warned.`);
  };
  const confirmHaz = (id) => {
    setHazards((hs) => hs.map((h) => (h.id === id ? { ...h, confirms: h.confirms + 1 } : h)));
    toast("Thanks, your confirmation moves this up the repair queue.");
  };

  const layerChips = [
    { k: "pothole", l: "Potholes", c: C.orange },
    { k: "water", l: "Waterlogging", c: C.sky },
    { k: "debris", l: "Debris", c: C.amber },
    { k: "blind", l: "Blind junctions", c: C.red },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon="MapPin" label="Hazards on map" value={visible.length} sub="Pune, Baner to Aundh" tone={C.orange} />
        <Stat icon="AlertTriangle" label="Blind-spot warnings" value={warnCount} sub="Since 6:00 am today" tone={C.red} />
        <Stat icon="ShieldCheck" label="Ride safety score" value={score} sub={score > 80 ? "Safe riding" : "Needs attention"} tone={score > 80 ? C.green : C.amber} />
        <Stat icon="Gauge" label="Speed" value={`${Math.round(speed)} km/h`} sub={blindAlert || hazardAhead ? "Auto-slow advised" : "Within limit"} />
      </div>

      {(helmetOff || drowsyAlarm) && (
        <div className="space-y-2" role="alert">
          {helmetOff && (
            <div className="rounded-xl p-3 flex items-start gap-3 rg-flash" style={{ background: C.danger, color: "#fff" }}>
              <Icon name="HardHat" size={22} />
              <div className="text-sm">
                <b>No helmet detected.</b> Wear your helmet before riding. Helmet-less riding can attract a fine of ₹1,000 under the Motor Vehicles Act, section 194D.
              </div>
            </div>
          )}
          {drowsyAlarm && (
            <div className="rounded-xl p-3 flex items-start gap-3 rg-flash" style={{ background: "#7a2a00", color: "#fff", border: `1px solid ${C.orange}` }}>
              <Icon name="Moon" size={22} />
              <div className="text-sm flex-1">
                <b>Drowsiness detected.</b> Eyes closing for long spans. Chandani Chowk fuel stop is 2.4 km ahead.
                <div className="mt-2">
                  <Btn
                    kind="primary"
                    onClick={() => {
                      setDrowsy(false);
                      toast("Break timer started: 15 minutes. Ride safe, Rohan.");
                    }}
                  >
                    Pull over for a break
                  </Btn>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <Title
              icon="Layers"
              right={
                <Btn kind="soft" icon={running ? "Pause" : "Play"} onClick={() => setRunning((r) => !r)} aria-label={running ? "Pause simulation" : "Resume simulation"}>
                  {running ? "Pause" : "Resume"}
                </Btn>
              }
            >
              Live road map
            </Title>
            <div className="flex flex-wrap gap-2 mb-3">
              {layerChips.map((c) => (
                <button
                  key={c.k}
                  onClick={() => setLayers((l) => ({ ...l, [c.k]: !l[c.k] }))}
                  aria-pressed={layers[c.k]}
                  className="rounded-full px-3 text-xs font-semibold inline-flex items-center gap-2"
                  style={{ minHeight: 36, background: layers[c.k] ? c.c + "2b" : "transparent", color: layers[c.k] ? C.text : C.mute, border: `1px solid ${layers[c.k] ? c.c : C.line}` }}
                >
                  <span className="rounded-full" style={{ width: 8, height: 8, background: layers[c.k] ? c.c : "#3a4f86" }} />
                  {c.l}
                </button>
              ))}
            </div>

            <div className="relative">
              <CityBase
                pid="drv"
                river="M-10 290 C 70 262, 110 222, 190 226 S 330 262, 410 226"
                park={[276, 196, 96, 52]}
                label="Live map of Baner and Aundh with hazard pins and two approaching vehicles"
                labels={[
                  { x: 22, y: 56, t: "Pashan" },
                  { x: 290, y: 42, t: "Shivajinagar" },
                  { x: 24, y: 276, t: "Baner" },
                  { x: 150, y: 118, t: "Aundh" },
                  { x: 300, y: 142, t: "Baner Road" },
                  { x: 268, y: 100, t: "University Rd" },
                ]}
              >
                <Road pts={[[0, 70], [400, 70]]} w={4} faint />
                <Road pts={[[0, 205], [400, 205]]} w={4} faint />
                <Road pts={[[70, 0], [70, 300]]} w={4} faint />
                <Road pts={[[330, 0], [330, 300]]} w={4} faint />
                <Road pts={ROUTE_A} />
                <Road pts={ROUTE_B} />

                {layers.blind && (
                  <g>
                    <circle cx={JUNCTION[0]} cy={JUNCTION[1]} r="17" fill="none" stroke={C.red} strokeWidth="1.4" strokeDasharray="4 3" />
                    <text x={JUNCTION[0] + 20} y={JUNCTION[1] + 24} fontSize="8.5" fill={C.red} stroke="#071127" strokeWidth="3" style={lbl}>
                      Blind junction
                    </text>
                  </g>
                )}
                {blindAlert && (
                  <g>
                    <circle cx={JUNCTION[0]} cy={JUNCTION[1]} r="16" fill={C.red} opacity="0.35" className="rg-pulse" />
                    <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={C.red} strokeWidth="1.6" strokeDasharray="4 3" />
                  </g>
                )}

                {visible.map((h) => (
                  <g
                    key={h.id}
                    transform={`translate(${h.x} ${h.y})`}
                    onClick={() => setSelectedId(h.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelectedId(h.id);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${TYPE_META[h.type].label} at ${h.place}`}
                    style={{ cursor: "pointer" }}
                  >
                    <circle r="15" fill="transparent" />
                    {selectedId === h.id && <circle r="14" fill="none" stroke="#fff" strokeWidth="1.4" strokeDasharray="3 3" />}
                    <Pin type={h.type} assigned={h.status === "assigned"} />
                  </g>
                ))}

                <g transform={`translate(${B.x} ${B.y}) rotate(${B.a})`}>
                  <rect x="-8" y="-4.5" width="16" height="9" rx="3" fill="#dbe7ff" stroke={C.blue} strokeWidth="1.2" />
                  <rect x="-2" y="-3" width="5" height="6" rx="1.5" fill="#6d86bd" />
                </g>
                <g transform={`translate(${A.x} ${A.y})`}>
                  <circle r="9" fill={C.orange} opacity="0.3" className="rg-pulse" />
                  <g transform={`rotate(${A.a})`}>
                    <polygon points="10,0 -7,-7 -3,0 -7,7" fill={C.orange} stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
                  </g>
                </g>
              </CityBase>

              <div className="absolute left-2 right-2 top-2" role="status" aria-live="polite">
                {blindAlert ? (
                  <div className="rounded-xl p-3 flex items-center gap-3 rg-flash" style={{ background: "rgba(217,43,52,.95)", color: "#fff" }}>
                    <Icon name="AlertTriangle" size={22} />
                    <div className="text-sm leading-tight">
                      <b>Car approaching from the north</b>
                      <div>
                        {distB} m away, reaches the junction in {Math.max(0, tA).toFixed(1)} s. Slow to 25 km/h.
                      </div>
                    </div>
                  </div>
                ) : hazardAhead ? (
                  <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "rgba(122,74,0,.95)", color: "#fff", border: `1px solid ${C.amber}` }}>
                    <Icon name={TYPE_META[hazardAhead.h.type].icon} size={20} />
                    <div className="text-sm leading-tight">
                      <b>{TYPE_META[hazardAhead.h.type].label} ahead, {hazardAhead.m} m</b>
                      <div>{hazardAhead.h.place}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: C.mute }}>
              You are the orange arrow. Tap any pin for details. A hidden vehicle crosses at the blind junction every {CYCLE} seconds.
            </p>
          </Card>

          {selected && (
            <Card style={{ borderColor: TYPE_META[selected.type].color }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span style={{ color: TYPE_META[selected.type].color }}>
                    <Icon name={TYPE_META[selected.type].icon} size={22} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold">{TYPE_META[selected.type].label}</div>
                    <div className="text-sm" style={{ color: C.mute }}>
                      {selected.place}, {selected.ward}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedId(null)} aria-label="Close details" className="rounded-lg flex items-center justify-center" style={{ width: 36, height: 36, background: "transparent", color: C.mute, border: `1px solid ${C.line}` }}>
                  <Icon name="X" size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div>
                  <div className="text-xs" style={{ color: C.mute }}>Reported by</div>
                  {selected.by}, {selected.ago}
                </div>
                <div>
                  <div className="text-xs" style={{ color: C.mute }}>Confirmed by</div>
                  {selected.confirms} riders
                </div>
                <div>
                  <div className="text-xs" style={{ color: C.mute }}>Estimated repair</div>
                  {inr(selected.cost)} ({selected.dept})
                </div>
                <div>
                  <div className="text-xs" style={{ color: C.mute }}>Status</div>
                  <Chip tone={selected.status === "open" ? "bad" : selected.status === "assigned" ? "ok" : "info"}>
                    {selected.status === "open" ? "Open" : selected.status === "assigned" ? "Crew assigned" : "Fixed"}
                  </Chip>
                </div>
              </div>
              <div className="mt-3">
                <Btn kind="soft" icon="Check" onClick={() => confirmHaz(selected.id)}>
                  Confirm this hazard
                </Btn>
              </div>
            </Card>
          )}

          <Card>
            <Title icon="MapPin">Report a hazard</Title>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(TYPE_META).map(([k, m]) => (
                <button
                  key={k}
                  onClick={() => setReportType(k)}
                  aria-pressed={reportType === k}
                  className="rounded-xl px-3 text-sm font-semibold inline-flex items-center gap-2"
                  style={{ minHeight: 44, background: reportType === k ? m.color + "2b" : "transparent", color: C.text, border: `1px solid ${reportType === k ? m.color : C.line}` }}
                >
                  <span style={{ color: m.color }}>
                    <Icon name={m.icon} size={16} />
                  </span>
                  {m.label}
                </button>
              ))}
            </div>
            <Btn onClick={report} icon="Crosshair" className="w-full">
              Report at my location
            </Btn>
            <p className="text-xs mt-2" style={{ color: C.mute }}>
              The pin appears for every rider and goes to the Traffic Control work-order list.
            </p>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <Title icon="HardHat" right={<Chip tone={helmetOff ? "bad" : "ok"} icon={helmetOff ? "X" : "Check"}>{helmetOff ? "Not detected" : "Helmet on"}</Chip>}>
              Helmet check
            </Title>
            <div className="rounded-xl flex items-center justify-center mb-3" style={{ height: 96, background: "#071127", border: `1px solid ${C.line}` }}>
              <svg viewBox="0 0 120 80" width="150" height="96" role="img" aria-label="Camera view of rider with helmet detection box">
                <circle cx="60" cy="44" r="18" fill="#1b2d5a" />
                <path d="M40 40 A20 20 0 0 1 80 40 L80 46 L40 46Z" fill={helmetOff ? "none" : C.orange} opacity={helmetOff ? 0 : 1} />
                <rect x="34" y="18" width="52" height="48" rx="4" fill="none" stroke={helmetOff ? C.red : C.green} strokeWidth="1.6" strokeDasharray="5 3" />
                <text x="36" y="14" fontSize="7" fill={helmetOff ? C.red : C.green}>
                  {helmetOff ? "no helmet 0.97" : "helmet 0.99"}
                </text>
              </svg>
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Simulate: helmet removed</span>
              <Toggle on={helmetOff} onChange={setHelmetOff} label="Simulate helmet removed" />
            </label>
          </Card>

          <Card>
            <Title icon="Moon" right={<Chip tone={drowsyAlarm ? "bad" : monitor ? "ok" : "mute"}>{!monitor ? "Paused" : drowsyAlarm ? "Drowsy" : "Alert"}</Chip>}>
              Drowsiness check
            </Title>
            <div className="flex items-end justify-between mb-1">
              <span className="text-sm" style={{ color: C.mute }}>Alertness</span>
              <span className="text-xl font-extrabold" style={{ color: drowsyAlarm ? C.red : C.green, fontVariantNumeric: "tabular-nums" }}>
                {Math.round(alertness)}%
              </span>
            </div>
            <Meter v={alertness} color={drowsyAlarm ? C.red : alertness < 75 ? C.amber : C.green} h={10} />
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <div className="rounded-xl p-2" style={{ background: "#0a142e" }}>
                <div className="text-xs" style={{ color: C.mute }}>Blink rate</div>
                {blinks} per min
              </div>
              <div className="rounded-xl p-2" style={{ background: "#0a142e" }}>
                <div className="text-xs" style={{ color: C.mute }}>Eyes</div>
                {drowsyAlarm ? "Closing 1.8 s" : "Open, tracking road"}
              </div>
            </div>
            <div className="mt-3 space-y-3">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Simulate: drowsy rider</span>
                <Toggle on={drowsy} onChange={setDrowsy} label="Simulate drowsy rider" />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Camera monitoring</span>
                <Toggle on={monitor} onChange={setMonitor} label="Camera monitoring" />
              </label>
            </div>
          </Card>

          <Card>
            <Title icon="Bell">Warnings</Title>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Blind-spot and hazard alerts</span>
              <Toggle on={alertsOn} onChange={setAlertsOn} label="Blind-spot and hazard alerts" />
            </label>
            <p className="text-xs mt-2" style={{ color: C.mute }}>
              Vehicles share position through the app and roadside units, so a car you cannot see still triggers a warning.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   TAB 2: EMERGENCY & ACCIDENT RESPONSE
   ===================================================================== */
function GoldenRing({ elapsed, typical }) {
  const R = 52;
  const Cc = 2 * Math.PI * R;
  const frac = Math.min(1, elapsed / 3600);
  const ang = (typical / 60) * 360 - 90;
  return (
    <svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label={`Golden hour clock, ${mmss(elapsed)} elapsed`}>
      <circle cx="70" cy="70" r={R} fill="none" stroke="#16275a" strokeWidth="12" />
      <circle cx="70" cy="70" r={R} fill="none" stroke={frac > 0.75 ? C.red : C.orange} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${Cc * frac} ${Cc}`} transform="rotate(-90 70 70)" />
      <g transform={`rotate(${ang} 70 70)`}>
        <line x1={70 + R - 10} y1="70" x2={70 + R + 10} y2="70" stroke={C.red} strokeWidth="3" />
      </g>
      <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="800" fill={C.text}>
        {mmss(elapsed)}
      </text>
      <text x="70" y="85" textAnchor="middle" fontSize="9" fill={C.mute}>
        since impact
      </text>
    </svg>
  );
}

function EmergencyTab({ inc, speed, setSpeed, startCrash, manualSOS, sendNow, cancel, reset, mode, approve }) {
  const ph = inc.phase;
  const amb = ambPos(inc);
  const eta = etaMin(inc);
  const live = ph !== "idle";
  const saved = Math.round(TYPICAL_MIN - inc.elapsed / 60);
  const toHospVisible = ph === "dispatched" || ph === "transport" || ph === "arrived";

  let banner;
  if (ph === "idle") banner = { tone: C.green, icon: "ShieldCheck", title: "All clear", text: "Crash sensors are armed on Rohan Kulkarni's Royal Enfield (MH 12 KM 4821)." };
  else if (ph === "detected") banner = { tone: C.red, icon: "AlertTriangle", title: `Crash detected. Auto-SOS in ${Math.ceil(inc.countdown)} s`, text: "Rider is not responding. Cancel only if you are safe." };
  else if (ph === "dispatched") banner = { tone: C.orange, icon: "Ambulance", title: `Ambulance on the way, ${eta.site} min to site`, text: "Live route shared with the 108 control room and the hospital." };
  else if (ph === "transport") banner = inc.approved
    ? { tone: C.green, icon: "Route", title: `Patient on board, hospital in ${eta.hosp} min`, text: "Green corridor is clearing signals ahead of the ambulance." }
    : { tone: C.amber, icon: "TrafficCone", title: `Held at signals, hospital in ${eta.hosp} min`, text: "Corridor not approved yet. Ask Traffic Control to approve it on the Control room tab." };
  else banner = { tone: C.green, icon: "Check", title: `Reached hospital in ${Math.floor(inc.elapsed / 60)} min ${Math.floor(inc.elapsed % 60)} s`, text: saved > 0 ? `${saved} min faster than the typical ${TYPICAL_MIN} min city response today.` : "Slower than ROADGUARD target because the corridor was not approved in time." };

  const facts = [
    { l: "Impact force", v: live && !inc.manual ? "7.8 g" : "0.9 g (normal)" },
    { l: "Speed at impact", v: live && !inc.manual ? "62 km/h" : "42 km/h" },
    { l: "Airbag jacket", v: live && !inc.manual ? "Deployed" : "Armed" },
    { l: "Bike tilt", v: live && !inc.manual ? "74°, fallen" : "4°, upright" },
  ];

  return (
    <div className="space-y-4">
      <div className={"rounded-2xl p-4 flex items-start gap-3 " + (ph === "detected" ? "rg-flash" : "")} style={{ background: banner.tone + "1f", border: `1px solid ${banner.tone}` }} role="status" aria-live="polite">
        <span style={{ color: banner.tone }}>
          <Icon name={banner.icon} size={26} />
        </span>
        <div>
          <div className="font-bold text-base">{banner.title}</div>
          <div className="text-sm" style={{ color: C.mute }}>{banner.text}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <Title icon="Route" right={<span className="inline-flex items-center gap-2"><Icon name="FastForward" size={14} color={C.mute} /><Seg value={speed} onChange={setSpeed} options={[{ v: 1, l: "1x" }, { v: 2, l: "2x" }, { v: 4, l: "4x" }]} /></span>}>
              Live dispatch map
            </Title>
            <CityBase
              pid="em"
              river="M-10 128 C 90 100, 160 205, 262 182 S 380 128, 410 152"
              park={[250, 215, 110, 60]}
              label="Dispatch map showing crash site, ambulance, traffic signals and hospital"
              labels={[
                { x: 24, y: 40, t: "Hinjewadi" },
                { x: 112, y: 262, t: "Wakad" },
                { x: 296, y: 96, t: "Chinchwad" },
              ]}
            >
              <Road pts={[[0, 40], [400, 40]]} w={4} faint />
              <Road pts={[[0, 270], [400, 270]]} w={4} faint />
              <Road pts={[[30, 0], [30, 300]]} w={4} faint />
              <Road pts={[[290, 0], [290, 300]]} w={4} faint />
              <Road pts={EM.toScene} />
              <Road pts={EM.toHosp} />
              {(ph === "dispatched" || ph === "detected") && <polyline points={pstr(EM.toScene)} fill="none" stroke={C.orange} strokeWidth="2" strokeDasharray="5 5" opacity="0.7" />}
              {ph === "dispatched" && <polyline points={pstr(partial(EM.toScene, inc.p))} fill="none" stroke={C.orange} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
              {toHospVisible && <polyline points={pstr(EM.toHosp)} fill="none" stroke={C.blue} strokeWidth="2" strokeDasharray="5 5" opacity="0.7" />}
              {(ph === "transport" || ph === "arrived") && <polyline points={pstr(partial(EM.toHosp, ph === "arrived" ? 1 : inc.p))} fill="none" stroke={inc.approved ? C.green : C.amber} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}

              {SIGNALS.map((s) => {
                const pt = pointAt(EM.toHosp, s.f);
                const st = signalState(inc, s);
                return (
                  <g key={s.name} transform={`translate(${pt.x} ${pt.y})`}>
                    {st === "green" && <circle r="10" fill={C.green} opacity="0.4" className="rg-pulse" />}
                    <circle r="5.5" fill="#071127" stroke={SIG_META[st].color} strokeWidth="2" />
                    <circle r="2.4" fill={SIG_META[st].color} />
                  </g>
                );
              })}

              <g transform={`translate(${EM.base[0]} ${EM.base[1]})`}>
                <rect x="-8" y="-8" width="16" height="16" rx="4" fill="none" stroke={C.mute} strokeWidth="1.4" strokeDasharray="3 2" />
                <text y="22" textAnchor="middle" fontSize="8.5" fill={C.text} stroke="#071127" strokeWidth="3" style={lbl}>108 station, Wakad</text>
              </g>
              <g transform={`translate(${EM.scene[0]} ${EM.scene[1]})`}>
                {live && ph !== "arrived" && <circle r="12" fill={C.red} opacity="0.5" className="rg-pulse" />}
                <circle r="6" fill={live ? C.red : C.mute} stroke="#fff" strokeWidth="1.4" />
                <text x="10" y="-9" fontSize="8.5" fill={C.text} stroke="#071127" strokeWidth="3" style={lbl}>{live ? "Crash site" : "Rider location"}</text>
              </g>
              <g transform={`translate(${EM.hosp[0]} ${EM.hosp[1]})`}>
                <rect x="-9" y="-9" width="18" height="18" rx="4" fill="#fff" />
                <path d="M0 -5v10M-5 0h10" stroke={C.danger} strokeWidth="2.6" />
                <text x="0" y="-14" textAnchor="middle" fontSize="8.5" fill={C.text} stroke="#071127" strokeWidth="3" style={lbl}>Sanjeevani Trauma Centre</text>
              </g>
              <g transform={`translate(${amb.x} ${amb.y})`}>
                {(ph === "dispatched" || ph === "transport") && <circle r="10" fill={C.blue} opacity="0.4" className="rg-pulse" />}
                <rect x="-9" y="-6" width="18" height="12" rx="3" fill="#fff" stroke="#0b1736" />
                <path d="M0 -4v8M-4 0h8" stroke={C.danger} strokeWidth="2.2" />
                <circle cx="6" cy="-8" r="2" fill={C.red} className="rg-blink" />
              </g>
            </CityBase>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="rounded-xl p-2" style={{ background: "#0a142e" }}>
                <div className="text-xs" style={{ color: C.mute }}>To crash site</div>
                <div className="font-bold">{ph === "dispatched" ? `${eta.site} min` : live ? "Reached" : "-"}</div>
              </div>
              <div className="rounded-xl p-2" style={{ background: "#0a142e" }}>
                <div className="text-xs" style={{ color: C.mute }}>To hospital</div>
                <div className="font-bold">{ph === "arrived" ? "Arrived" : live && ph !== "detected" ? `${eta.hosp} min` : "-"}</div>
              </div>
              <div className="rounded-xl p-2" style={{ background: "#0a142e" }}>
                <div className="text-xs" style={{ color: C.mute }}>Green corridor</div>
                <div className="font-bold" style={{ color: inc.approved ? C.green : C.mute }}>{inc.approved ? "Active" : mode === "auto" ? "Auto" : "Manual"}</div>
              </div>
            </div>
          </Card>

          <Card>
            <Title icon="Clock">Incident timeline</Title>
            {inc.log.length === 0 ? (
              <p className="text-sm" style={{ color: C.mute }}>Nothing yet. Press SOS or simulate a crash to see every step logged with a timestamp.</p>
            ) : (
              <ol className="space-y-2" style={{ maxHeight: 230, overflowY: "auto" }}>
                {inc.log.map((e, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 font-semibold" style={{ color: C.orange, fontVariantNumeric: "tabular-nums" }}>{clockStr(e.t)}</span>
                    <span>{e.text}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className={ph === "detected" ? "rg-flash" : ""} style={{ borderColor: ph === "detected" ? C.red : C.line }}>
            <Title icon="Siren">Emergency SOS</Title>
            {ph === "idle" && (
              <div className="text-center">
                <button onClick={manualSOS} aria-label="Send SOS now" className="rounded-full flex flex-col items-center justify-center mx-auto" style={{ width: 132, height: 132, background: `radial-gradient(circle at 35% 30%, #ff7a7f, ${C.danger})`, color: "#fff", border: "4px solid #ffb3b6", boxShadow: "0 8px 30px rgba(217,43,52,.45)" }}>
                  <Icon name="Siren" size={34} />
                  <span className="font-extrabold text-xl">SOS</span>
                </button>
                <p className="text-sm mt-3" style={{ color: C.mute }}>Tap to alert 108, your family and the nearest hospital with live GPS.</p>
                <Btn kind="primary" icon="Zap" onClick={startCrash} className="w-full mt-3">Simulate crash detection</Btn>
              </div>
            )}
            {ph === "detected" && (
              <div className="text-center">
                <div className="font-extrabold" style={{ fontSize: 64, lineHeight: 1, color: C.red, fontVariantNumeric: "tabular-nums" }}>{Math.ceil(inc.countdown)}</div>
                <p className="text-sm mt-1 mb-3" style={{ color: C.mute }}>seconds until SOS is sent automatically</p>
                <div className="space-y-2">
                  <Btn kind="danger" icon="Siren" onClick={sendNow} className="w-full">Send SOS now</Btn>
                  <Btn kind="ghost" icon="Check" onClick={cancel} className="w-full">I am safe, cancel</Btn>
                </div>
              </div>
            )}
            {(ph === "dispatched" || ph === "transport" || ph === "arrived") && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Chip tone="ok" icon="Check">SOS active</Chip>
                  <span className="text-sm" style={{ color: C.mute }}>Sent at {clockStr(inc.log.length ? inc.log[0].t : 0)}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Chip tone="info" icon="Radio">108 control room</Chip>
                  <Chip tone="info" icon="Building2">Sanjeevani Trauma Centre</Chip>
                  <Chip tone="info" icon="Phone">Sneha Kulkarni (wife)</Chip>
                  <Chip tone="info" icon="Phone">Prakash Kulkarni (father)</Chip>
                </div>
                {ph !== "arrived" && inc.approved === false && mode === "manual" && (
                  <Btn kind="soft" icon="Route" onClick={() => approve("traffic")} className="w-full mb-2">Ask Traffic Control to approve corridor</Btn>
                )}
                <a href="tel:108" className="inline-flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold w-full mb-2" style={{ minHeight: 44, background: C.panel2, color: C.text, border: `1px solid ${C.line}`, textDecoration: "none" }}>
                  <Icon name="Phone" size={16} /> Call 108
                </a>
                <Btn kind="ghost" icon="RotateCcw" onClick={reset} className="w-full">Reset demo</Btn>
              </div>
            )}
          </Card>

          <Card>
            <Title icon="Timer">Golden hour</Title>
            <div className="flex items-center gap-3">
              <GoldenRing elapsed={inc.elapsed} typical={TYPICAL_MIN} />
              <div className="text-sm min-w-0">
                <p style={{ color: C.mute }}>The first 60 minutes after an injury decide survival. The red tick marks the typical {TYPICAL_MIN} min city response today.</p>
                {ph === "arrived" && saved > 0 && <div className="mt-2 font-bold" style={{ color: C.green }}>{saved} min saved</div>}
              </div>
            </div>
          </Card>

          <Card>
            <Title icon="Activity" right={<Chip tone={live && !inc.manual ? "bad" : "ok"}>{live && !inc.manual ? "Impact" : "Armed"}</Chip>}>Crash telemetry</Title>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {facts.map((x) => (
                <div key={x.l} className="rounded-xl p-2" style={{ background: "#0a142e" }}>
                  <div className="text-xs" style={{ color: C.mute }}>{x.l}</div>
                  <b>{x.v}</b>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3 mt-2 text-sm" style={{ background: "#0a142e" }}>
              <div className="text-xs" style={{ color: C.mute }}>GPS location (accuracy 4 m)</div>
              <b style={{ fontVariantNumeric: "tabular-nums" }}>18.5912° N, 73.7389° E</b>
              <div style={{ color: C.mute }}>Hinjewadi Phase 1, Rajiv Gandhi Infotech Park Road, Pune</div>
              <a href="https://maps.google.com/?q=18.5912,73.7389" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1 text-sm font-semibold" style={{ color: C.blue }}>
                <Icon name="Navigation" size={14} /> Open in Maps
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   TAB 3: HOSPITAL & TRAFFIC CONTROL ROOM
   ===================================================================== */
const PHASE_LABEL = {
  detected: "Crash detected, awaiting rider response",
  dispatched: "Ambulance heading to crash site",
  transport: "Patient on board, heading to hospital",
  arrived: "Patient handed over to trauma team",
};

function ControlTab({ inc, mode, changeMode, approve, startCrash, hazards, setHazards, toast }) {
  const ph = inc.phase;
  const eta = etaMin(inc);
  const active = ph !== "idle";
  const [prep, setPrep] = useState({ bay: false, ct: false, team: false });
  const [group, setGroup] = useState("B+");
  const [need, setNeed] = useState(2);
  const [banks, setBanks] = useState(BANKS0);
  const [resv, setResv] = useState([]);

  const journey = ph === "dispatched" ? 0.4 * inc.p : ph === "transport" ? 0.4 + 0.6 * inc.p : ph === "arrived" ? 1 : 0;
  const vit = ph === "transport" || ph === "arrived"
    ? { hr: 112 + Math.round(6 * Math.sin(inc.elapsed / 25)), spo2: 95 + Math.round(Math.sin(inc.elapsed / 40)), bp: "108/70", gcs: 14 }
    : null;
  const greenCount = SIGNALS.filter((s) => signalState(inc, s) === "green").length;
  const prepDone = Object.values(prep).filter(Boolean).length + (resv.length > 0 ? 1 : 0);

  const ranked = useMemo(() => {
    const don = DONORS[group];
    return banks
      .map((b) => {
        const exact = b.stock[group];
        const compat = don.reduce((a, g) => a + b.stock[g], 0);
        return { ...b, exact, compat, ok: exact >= need };
      })
      .sort((a, b) => (a.ok === b.ok ? (a.ok ? a.km - b.km : b.compat - a.compat) : a.ok ? -1 : 1));
  }, [banks, group, need]);

  const reserve = (bank, g) => {
    setBanks((bs) => bs.map((b) => (b.id === bank.id ? { ...b, stock: { ...b.stock, [g]: b.stock[g] - need } } : b)));
    setResv((r) => [...r.filter((x) => x.bank !== bank.id), { bank: bank.id, name: bank.name, group: g, n: need, km: bank.km }]);
    toast(`${need} units of ${g} reserved at ${bank.name}.`);
  };
  const release = (r) => {
    setBanks((bs) => bs.map((b) => (b.id === r.bank ? { ...b, stock: { ...b.stock, [r.group]: b.stock[r.group] + r.n } } : b)));
    setResv((x) => x.filter((y) => y.bank !== r.bank));
    toast("Reservation released back to stock.");
  };

  const work = hazards.filter((h) => h.status !== "fixed").sort((a, b) => b.confirms - a.confirms).slice(0, 5);
  const backlog = hazards.filter((h) => h.status !== "fixed").reduce((a, h) => a + h.cost, 0);
  const setStatus = (id, status) => {
    setHazards((hs) => hs.map((h) => (h.id === id ? { ...h, status } : h)));
    toast(status === "assigned" ? "Repair crew assigned." : "Marked fixed. Pin removed from rider maps.");
  };

  const prepItems = [
    { k: "bay", l: "Trauma bay 2 cleared", i: "Bed" },
    { k: "ct", l: "CT scan slot held", i: "Activity" },
    { k: "team", l: "Orthopaedic and neuro team paged", i: "Stethoscope" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon="Siren" label="Active incidents" value={active && ph !== "arrived" ? 1 : 0} tone={active && ph !== "arrived" ? C.red : C.green} sub={active ? "1 today" : "None right now"} />
        <Stat icon="Ambulance" label="Ambulances free" value={active && ph !== "arrived" ? 5 : 6} sub="108 fleet, Pune west" />
        <Stat icon="Bed" label="Trauma bays open" value={3 - (prep.bay ? 1 : 0)} sub="of 4" />
        <Stat icon="Route" label="Signals on priority" value={greenCount} tone={greenCount ? C.green : C.text} sub="of 5 on route" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card style={{ borderColor: active && ph !== "arrived" ? C.orange : C.line }}>
            <Title icon="Ambulance" right={active ? <Chip tone={ph === "arrived" ? "ok" : "hot"}>{ph === "arrived" ? "Handed over" : "Incoming"}</Chip> : null}>Incoming ambulance</Title>
            {!active ? (
              <div className="text-center py-4">
                <p className="text-sm mb-3" style={{ color: C.mute }}>No ambulance is heading to this hospital. Start a demo to watch pre-alerts and the green corridor react live.</p>
                <Btn icon="Zap" onClick={startCrash}>Start demo incident</Btn>
              </div>
            ) : (
              <div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs" style={{ color: C.mute }}>Unit MH-12 AMB 0108, paramedic Sunil Jadhav</div>
                    <div className="text-sm font-semibold">{PHASE_LABEL[ph]}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold" style={{ color: C.orange, fontVariantNumeric: "tabular-nums" }}>{ph === "arrived" ? "0" : ph === "detected" ? "-" : eta.hosp}</div>
                    <div className="text-xs" style={{ color: C.mute }}>min to hospital</div>
                  </div>
                </div>
                <div className="mt-3"><Meter v={journey * 100} color={C.orange} h={10} /></div>
                <div className="rounded-xl p-3 mt-3 text-sm" style={{ background: "#0a142e" }}>
                  <b>Rohan Kulkarni, 34, male.</b> Two-wheeler collision at 62 km/h, suspected femur fracture and head impact. Blood group B+ from medical ID.
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                  {[["Heart rate", vit ? vit.hr : "-"], ["SpO2", vit ? vit.spo2 + "%" : "-"], ["BP", vit ? vit.bp : "-"], ["GCS", vit ? vit.gcs : "-"]].map(([l, v]) => (
                    <div key={l} className="rounded-xl p-2" style={{ background: "#0a142e" }}>
                      <div className="text-xs" style={{ color: C.mute }}>{l}</div>
                      <div className="font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>{v}</div>
                    </div>
                  ))}
                </div>
                {!vit && <p className="text-xs mt-2" style={{ color: C.mute }}>Live vitals stream once the paramedic attaches the monitor.</p>}
              </div>
            )}
          </Card>

          <Card>
            <Title icon="Stethoscope" right={<Chip tone={prepDone === 4 ? "ok" : "warn"}>{prepDone} of 4 ready</Chip>}>Hospital pre-alert checklist</Title>
            <div className="space-y-2">
              {prepItems.map((it) => (
                <button key={it.k} onClick={() => setPrep((p) => ({ ...p, [it.k]: !p[it.k] }))} aria-pressed={prep[it.k]} className="w-full flex items-center justify-between gap-3 rounded-xl px-3 text-left text-sm" style={{ minHeight: 48, background: prep[it.k] ? "#0f3d2a" : "#0a142e", border: `1px solid ${prep[it.k] ? "#1d6b47" : C.line}`, color: C.text }}>
                  <span className="inline-flex items-center gap-2"><Icon name={it.i} size={16} color={prep[it.k] ? C.green : C.mute} />{it.l}</span>
                  <span style={{ color: prep[it.k] ? C.green : C.mute }}>{prep[it.k] ? "Ready" : "Tap to confirm"}</span>
                </button>
              ))}
              <div className="w-full flex items-center justify-between gap-3 rounded-xl px-3 text-sm" style={{ minHeight: 48, background: resv.length ? "#0f3d2a" : "#0a142e", border: `1px solid ${resv.length ? "#1d6b47" : C.line}` }}>
                <span className="inline-flex items-center gap-2"><Icon name="Droplet" size={16} color={resv.length ? C.green : C.mute} />Blood units reserved</span>
                <span style={{ color: resv.length ? C.green : C.mute }}>{resv.length ? "Ready" : "Use the panel below"}</span>
              </div>
            </div>
            {prepDone === 4 && <p className="text-sm mt-3 font-semibold" style={{ color: C.green }}>Team is ready before the ambulance arrives.</p>}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <Title icon="Route" right={<Seg value={mode} onChange={changeMode} options={[{ v: "auto", l: "Auto" }, { v: "manual", l: "Manual" }]} />}>Green corridor</Title>
            <p className="text-xs mb-3" style={{ color: C.mute }}>
              {mode === "auto" ? "Signals along the route turn green as the ambulance approaches." : "Signals stay on normal cycles until an officer approves. The ambulance is slowed to half pace without approval."}
            </p>
            {mode === "manual" && (ph === "dispatched" || ph === "transport") && (
              <Btn kind={inc.approved ? "good" : "primary"} icon={inc.approved ? "Check" : "ShieldCheck"} disabled={inc.approved} onClick={() => approve("traffic")} className="w-full mb-3">
                {inc.approved ? "Corridor approved" : "Approve green corridor"}
              </Btn>
            )}
            <div className="space-y-2">
              {SIGNALS.map((s) => {
                const st = signalState(inc, s);
                const m = SIG_META[st];
                return (
                  <div key={s.name} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ background: "#0a142e", border: `1px solid ${st === "green" ? m.color : C.line}` }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="rounded-full flex-shrink-0" style={{ width: 12, height: 12, background: m.color }} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{s.name}</div>
                        <div className="text-xs" style={{ color: C.mute }}>{s.officer} on point</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold flex-shrink-0" style={{ color: m.color }}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <Title icon="Construction" right={<Chip tone="warn">Backlog {inr(backlog)}</Chip>}>Hazard work orders</Title>
            <div className="space-y-2">
              {work.length === 0 && <p className="text-sm" style={{ color: C.mute }}>All reported hazards are fixed.</p>}
              {work.map((h) => (
                <div key={h.id} className="rounded-xl p-3" style={{ background: "#0a142e", border: `1px solid ${C.line}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span style={{ color: TYPE_META[h.type].color }}><Icon name={TYPE_META[h.type].icon} size={16} /></span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{h.place}</div>
                        <div className="text-xs" style={{ color: C.mute }}>{h.ward}, {h.dept}, {h.confirms} confirmations, {inr(h.cost)}</div>
                      </div>
                    </div>
                    <Chip tone={h.status === "assigned" ? "ok" : "bad"}>{h.status === "assigned" ? "Assigned" : "Open"}</Chip>
                  </div>
                  <div className="mt-2">
                    {h.status === "open" ? (
                      <Btn kind="soft" icon="HardHat" onClick={() => setStatus(h.id, "assigned")}>Assign crew</Btn>
                    ) : (
                      <Btn kind="good" icon="Check" onClick={() => setStatus(h.id, "fixed")}>Mark fixed</Btn>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <Title icon="Droplet" right={<Chip tone="info">Patient group {group}</Chip>}>Blood bank matching</Title>
        <div className="flex flex-wrap items-center gap-2 mb-3" role="group" aria-label="Patient blood group">
          {GROUPS.map((g) => (
            <button key={g} onClick={() => setGroup(g)} aria-pressed={group === g} className="rounded-xl px-3 text-sm font-bold" style={{ minHeight: 40, minWidth: 48, background: group === g ? C.orange : "transparent", color: group === g ? "#1a0b02" : C.text, border: `1px solid ${group === g ? C.orange : C.line}` }}>{g}</button>
          ))}
        </div>
        <div className="flex items-center gap-3 mb-3 text-sm">
          <span style={{ color: C.mute }}>Units needed</span>
          <button onClick={() => setNeed((n) => Math.max(1, n - 1))} aria-label="Fewer units" className="rounded-lg font-bold" style={{ width: 40, height: 40, background: C.panel2, color: C.text, border: `1px solid ${C.line}` }}>-</button>
          <b className="text-lg" style={{ minWidth: 20, textAlign: "center" }}>{need}</b>
          <button onClick={() => setNeed((n) => Math.min(6, n + 1))} aria-label="More units" className="rounded-lg font-bold" style={{ width: 40, height: 40, background: C.panel2, color: C.text, border: `1px solid ${C.line}` }}>+</button>
          <span style={{ color: C.mute }}>Compatible donors: {DONORS[group].join(", ")}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ranked.map((b, idx) => {
            const mine = resv.find((r) => r.bank === b.id);
            const canO = group !== "O-" && b.stock["O-"] >= need;
            return (
              <div key={b.id} className="rounded-xl p-3" style={{ background: "#0a142e", border: `1px solid ${idx === 0 && b.ok ? C.green : C.line}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold">{b.name}</div>
                    <div className="text-xs" style={{ color: C.mute }}>{b.area}, {b.km} km, about {Math.max(2, Math.round(b.km * 1.6))} min by corridor</div>
                  </div>
                  {idx === 0 && b.ok && <Chip tone="ok">Best match</Chip>}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {GROUPS.filter((g) => DONORS[group].includes(g)).map((g) => (
                    <span key={g} className="rounded-lg px-2 py-1 text-xs font-semibold" style={{ background: g === group ? C.orange + "33" : "#13224d", color: b.stock[g] === 0 ? "#5d6f9f" : C.text, border: `1px solid ${g === group ? C.orange : "transparent"}`, fontVariantNumeric: "tabular-nums" }}>{g}: {b.stock[g]}</span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mine ? (
                    <Btn kind="good" icon="Check" onClick={() => release(mine)}>Reserved {mine.n} of {mine.group}. Release</Btn>
                  ) : b.ok ? (
                    <Btn kind="primary" onClick={() => reserve(b, group)}>Reserve {need} of {group}</Btn>
                  ) : canO ? (
                    <Btn kind="soft" onClick={() => reserve(b, "O-")}>Short of {group}. Reserve {need} of O-</Btn>
                  ) : (
                    <Chip tone="bad">Not enough stock</Chip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* =====================================================================
   TAB 4: IMPACT
   ===================================================================== */
function ImpactTab({ hazards }) {
  const [sc, setSc] = useState("city");
  const [crashes, setCrashes] = useState(120);
  const [day, setDay] = useState(3);
  const [body, setBody] = useState("All");
  const [sortKey, setSortKey] = useState("open");
  const [dir, setDir] = useState(-1);

  const S = SCENARIOS[sc];
  const tw = S.without.reduce((a, b) => a + b, 0);
  const tr = S.withRG.reduce((a, b) => a + b, 0);
  const saved = r1(tw - tr);
  const pct = Math.round((saved / tw) * 100);
  const max = Math.max(60, Math.ceil(tw / 15) * 15);

  const counts = {
    total: hazards.length,
    open: hazards.filter((h) => h.status === "open").length,
    assigned: hazards.filter((h) => h.status === "assigned").length,
    fixed: hazards.filter((h) => h.status === "fixed").length,
  };
  const backlog = hazards.filter((h) => h.status !== "fixed").reduce((a, h) => a + h.cost, 0);
  const byType = Object.keys(TYPE_META).map((k) => ({ k, n: hazards.filter((h) => h.type === k && h.status !== "fixed").length }));
  const maxType = Math.max(1, ...byType.map((x) => x.n));

  const rows = useMemo(() => {
    const rs = WARDS.map((w) => {
      const userOpen = hazards.filter((h) => h.ward === w.ward && h.id.startsWith("u") && h.status !== "fixed").length;
      const crewFixed = hazards.filter((h) => h.ward === w.ward && ORIG_STATUS[h.id] && ORIG_STATUS[h.id] !== "fixed" && h.status === "fixed").length;
      return { ...w, open: Math.max(0, w.open + userOpen - crewFixed) };
    }).filter((w) => body === "All" || w.body === body);
    return rs.sort((a, b) => (typeof a[sortKey] === "string" ? a[sortKey].localeCompare(b[sortKey]) * dir : (a[sortKey] - b[sortKey]) * dir));
  }, [hazards, body, sortKey, dir]);
  const totalOpen = rows.reduce((a, r) => a + r.open, 0);
  const wSla = rows.length ? Math.round(rows.reduce((a, r) => a + r.sla * r.open, 0) / Math.max(1, totalOpen)) : 0;

  const sortBy = (k) => {
    if (k === sortKey) setDir((d) => -d);
    else {
      setSortKey(k);
      setDir(k === "ward" || k === "avg" ? 1 : -1);
    }
  };
  const fmt = (v) => (v % 1 ? r1(v) : v);
  const W = WEEK[day];

  const barRow = (title, arr, total, tone) => (
    <div className="mb-4">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-semibold">{title}</span>
        <span className="font-bold" style={{ color: tone }}>{r1(total)} min</span>
      </div>
      <div className="relative">
        <div className="flex rounded-lg overflow-hidden" style={{ height: 34, background: "#0a142e" }}>
          {arr.map((v, i) => {
            const w = (v / max) * 100;
            return (
              <div key={i} className="flex items-center justify-center text-xs font-bold" style={{ width: `${w}%`, background: STAGES[i].c, color: "#0b1020" }} title={`${STAGES[i].k}: ${fmt(v)} min`}>
                {w > 7 ? fmt(v) : ""}
              </div>
            );
          })}
        </div>
        <div className="absolute" style={{ left: `${(60 / max) * 100}%`, top: -4, bottom: -4, borderLeft: `2px dashed ${C.red}` }} />
      </div>
      <div className="text-xs mt-1" style={{ color: total <= 60 ? C.green : C.red }}>{total <= 60 ? "Inside the golden hour" : "Beyond the golden hour"}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <Title icon="Timer" right={<Seg value={sc} onChange={setSc} options={Object.entries(SCENARIOS).map(([v, s]) => ({ v, l: s.label.split(",")[0] }))} />}>Golden hour response cut</Title>
        <div className="flex items-end gap-4 mb-4">
          <div>
            <div className="font-extrabold" style={{ fontSize: 52, lineHeight: 1, color: C.orange, fontVariantNumeric: "tabular-nums" }}>{saved}</div>
            <div className="text-sm" style={{ color: C.mute }}>minutes saved from impact to hospital</div>
          </div>
          <Chip tone="ok" icon="TrendingDown">{pct}% faster</Chip>
        </div>
        {barRow("Today, without ROADGUARD", S.without, tw, C.red)}
        {barRow("With ROADGUARD", S.withRG, tr, C.green)}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-1" style={{ color: C.mute }}>
          {STAGES.map((s, i) => (
            <span key={s.k} className="inline-flex items-center gap-1">
              <span className="rounded-sm" style={{ width: 10, height: 10, background: s.c }} />
              {s.k}: {fmt(S.without[i])} to {fmt(S.withRG[i])} min
            </span>
          ))}
          <span className="inline-flex items-center gap-1"><span style={{ width: 10, borderTop: `2px dashed ${C.red}` }} />Golden hour (60 min)</span>
        </div>
        <div className="rounded-xl p-3 mt-3" style={{ background: "#0a142e" }}>
          <label className="text-sm font-semibold block mb-1" htmlFor="crashes">Serious crashes per month in the district: {crashes}</label>
          <input id="crashes" type="range" min="20" max="400" step="10" value={crashes} onChange={(e) => setCrashes(Number(e.target.value))} />
          <div className="text-sm mt-1">
            That brings care forward by <b style={{ color: C.green }}>{Math.round((crashes * saved) / 60).toLocaleString("en-IN")} patient-hours</b> every month.
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: C.mute }}>
          Stage timings come from this prototype's simulation and planning assumptions. Replace them with pilot data before quoting outside the demo. National context: India recorded about 1.68 lakh road deaths in 2022 (MoRTH).
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <Title icon="MapPin">Live hazard tracking</Title>
          <div className="grid grid-cols-4 gap-2 text-center mb-4">
            {[["Reported", counts.total, C.text], ["Open", counts.open, C.red], ["Assigned", counts.assigned, C.amber], ["Fixed", counts.fixed, C.green]].map(([l, v, c]) => (
              <div key={l} className="rounded-xl p-2" style={{ background: "#0a142e" }}>
                <div className="text-xl font-extrabold" style={{ color: c }}>{v}</div>
                <div className="text-xs" style={{ color: C.mute }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="text-sm mb-1" style={{ color: C.mute }}>Open repair backlog</div>
          <div className="text-2xl font-extrabold mb-4" style={{ color: C.orange }}>{inr(backlog)}</div>
          <div className="space-y-2 mb-4">
            {byType.map((t) => (
              <div key={t.k}>
                <div className="flex justify-between text-xs mb-1"><span>{TYPE_META[t.k].label}</span><b>{t.n}</b></div>
                <Meter v={(t.n / maxType) * 100} color={TYPE_META[t.k].color} />
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: C.mute }}>These numbers move when you report a hazard on the Driver tab or assign a crew in the Control room.</p>
        </Card>

        <Card>
          <Title icon="BarChart3">Reports and repairs this week</Title>
          <svg viewBox="0 0 320 150" className="w-full" role="img" aria-label="Bar chart of hazards reported and fixed per day">
            {WEEK.map((w, i) => {
              const x = 12 + i * 44;
              const hr = (w.rep / 64) * 100;
              const hf = (w.fix / 64) * 100;
              return (
                <g key={w.d} onClick={() => setDay(i)} style={{ cursor: "pointer" }} role="button" tabIndex={0} aria-label={`${w.d}: ${w.rep} reported, ${w.fix} fixed`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setDay(i); }}>
                  <rect x={x - 4} y="6" width="40" height="124" rx="6" fill={day === i ? "#13224d" : "transparent"} />
                  <rect x={x} y={120 - hr} width="15" height={hr} rx="3" fill={C.orange} />
                  <rect x={x + 17} y={120 - hf} width="15" height={hf} rx="3" fill={C.blue} />
                  <text x={x + 16} y="142" textAnchor="middle" fontSize="10" fill={day === i ? C.text : C.mute}>{w.d}</text>
                </g>
              );
            })}
          </svg>
          <div className="flex items-center justify-between text-sm mt-1">
            <span><b>{W.d}</b>: {W.rep} reported, {W.fix} fixed</span>
            <span className="inline-flex items-center gap-3 text-xs" style={{ color: C.mute }}>
              <span className="inline-flex items-center gap-1"><span className="rounded-sm" style={{ width: 10, height: 10, background: C.orange }} />Reported</span>
              <span className="inline-flex items-center gap-1"><span className="rounded-sm" style={{ width: 10, height: 10, background: C.blue }} />Fixed</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {[["1,284", "Reported this month"], ["71%", "Confirmed by 3+ riders"], ["4.8 days", "Median time to fix"]].map(([v, l]) => (
              <div key={l} className="rounded-xl p-2" style={{ background: "#0a142e" }}>
                <div className="font-extrabold">{v}</div>
                <div className="text-xs" style={{ color: C.mute }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <Title icon="Building2" right={<Chip tone={wSla >= 80 ? "ok" : "warn"}>SLA met {wSla}%</Chip>}>Governance by ward</Title>
        <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Filter by department">
          {["All", "PMC", "PCMC", "PMRDA", "NHAI"].map((b) => (
            <button key={b} onClick={() => setBody(b)} aria-pressed={body === b} className="rounded-full px-3 text-xs font-semibold" style={{ minHeight: 36, background: body === b ? C.orange : "transparent", color: body === b ? "#1a0b02" : C.text, border: `1px solid ${body === b ? C.orange : C.line}` }}>{b}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 440, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: C.mute }}>
                {[["ward", "Ward"], ["body", "Body"], ["open", "Open hazards"], ["avg", "Avg fix (days)"], ["sla", "SLA met"]].map(([k, l]) => (
                  <th key={k} className="text-left py-2 pr-2 font-semibold" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <button onClick={() => sortBy(k)} className="inline-flex items-center gap-1 font-semibold" style={{ background: "transparent", border: "none", color: sortKey === k ? C.orange : C.mute, minHeight: 36, padding: 0 }}>
                      {l}
                      <Icon name="ArrowUpDown" size={12} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ward} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="py-2 pr-2 font-semibold">{r.ward}</td>
                  <td className="py-2 pr-2" style={{ color: C.mute }}>{r.body}</td>
                  <td className="py-2 pr-2" style={{ fontVariantNumeric: "tabular-nums" }}>{r.open}</td>
                  <td className="py-2 pr-2" style={{ fontVariantNumeric: "tabular-nums" }}>{r.avg}</td>
                  <td className="py-2 pr-2" style={{ minWidth: 90 }}>
                    <div className="flex items-center gap-2">
                      <div style={{ flex: 1 }}><Meter v={r.sla} color={r.sla >= 80 ? C.green : r.sla >= 70 ? C.amber : C.red} h={6} /></div>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.sla}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-3" style={{ color: C.mute }}>Every hazard carries a reporter, a timestamp, a department and a repair cost in ₹, so each ward's response time can be audited. Ward figures are seeded demo data.</p>
      </Card>
    </div>
  );
}

/* =====================================================================
   APP SHELL
   ===================================================================== */
const TABS = [
  { id: "driver", label: "Driver", icon: "Navigation" },
  { id: "emergency", label: "Emergency", icon: "Siren" },
  { id: "control", label: "Control room", icon: "Building2" },
  { id: "impact", label: "Impact", icon: "BarChart3" },
];

export default function RoadGuardAI() {
  const [tab, setTab] = useState("driver");
  const [hazards, setHazards] = useState(SEED_HAZARDS);
  const [inc, setInc] = useState(INIT);
  const [mode, setMode] = useState("auto");
  const [speed, setSpeed] = useState(1);
  const [toastMsg, setToastMsg] = useState(null);
  const cfg = useRef({ mode, speed });
  cfg.current = { mode, speed };
  const timer = useRef(null);

  const toast = useCallback((msg, tone = "ok") => {
    setToastMsg({ msg, tone, id: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 3000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!["detected", "dispatched", "transport"].includes(inc.phase)) return;
    const id = setInterval(() => setInc((s) => stepInc(s, 0.1, cfg.current.speed, cfg.current.mode)), 100);
    return () => clearInterval(id);
  }, [inc.phase]);

  const prevPh = useRef("idle");
  useEffect(() => {
    const a = prevPh.current;
    const b = inc.phase;
    if (a !== b) {
      if (b === "detected") toast("Crash detected. Auto-SOS starts in 10 seconds.", "bad");
      else if (b === "dispatched") toast("SOS sent. Ambulance dispatched and hospital pre-alerted.");
      else if (b === "transport") toast(inc.approved ? "Patient on board. Green corridor active." : "Patient on board. Waiting for corridor approval.", inc.approved ? "ok" : "warn");
      else if (b === "arrived") toast("Hospital reached. Trauma team is ready.");
    }
    prevPh.current = b;
  }, [inc.phase]); // eslint-disable-line

  const startCrash = () => setInc({ ...INIT, phase: "detected", countdown: 10, log: [{ t: 0, text: "Impact detected: 7.8 g, airbag deployed, rider not moving" }] });
  const manualSOS = () => setInc(toDispatched({ ...INIT, manual: true, log: [{ t: 0, text: "Manual SOS pressed by rider" }] }, "manual"));
  const sendNow = () => setInc((s) => (s.phase === "detected" ? toDispatched(s, "rider") : s));
  const cancel = () => {
    setInc(INIT);
    toast("SOS cancelled. Rider marked safe.");
  };
  const reset = () => setInc(INIT);
  const approve = (by) =>
    setInc((s) =>
      (s.phase === "dispatched" || s.phase === "transport") && !s.approved
        ? { ...s, approved: true, log: [...s.log, { t: s.elapsed, text: by === "auto" ? "Auto mode on: green corridor activated" : "Green corridor approved by Traffic Control (Insp. Rajesh Pawar)" }] }
        : s
    );
  const changeMode = (m) => {
    setMode(m);
    if (m === "auto") approve("auto");
    toast(m === "auto" ? "Green corridor set to automatic." : "Green corridor now needs officer approval.", m === "auto" ? "ok" : "warn");
  };

  const incidentLive = inc.phase !== "idle" && inc.phase !== "arrived";
  const toneBg = { ok: "#0f3d2a", warn: "#5a3d00", bad: "#7a1218" };
  const toneBd = { ok: "#1d6b47", warn: C.amber, bad: C.red };

  return (
    <div className="rg min-h-screen" style={{ background: `linear-gradient(180deg, #07112b 0%, ${C.bg} 260px)`, color: C.text, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>
      <style>{CSS}</style>

      <header className="sticky top-0 z-30" style={{ background: "linear-gradient(180deg,#07112b,#050b1f)", borderBottom: `1px solid ${C.line}` }}>
        <div className="max-w-6xl mx-auto px-3 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 42, height: 42, background: `linear-gradient(135deg, ${C.orange}, ${C.danger})` }}>
              <Icon name="ShieldCheck" size={24} color="#fff" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-lg leading-tight" style={{ letterSpacing: "0.08em" }}>ROADGUARD AI</div>
              <div className="text-xs truncate" style={{ color: C.mute }}>Intelligent Road Safety &amp; Emergency Response</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {incidentLive && (
              <button onClick={() => setTab("emergency")} className="inline-flex items-center gap-1 rounded-full px-3 text-xs font-bold rg-flash" style={{ minHeight: 36, background: C.danger, color: "#fff", border: "none" }}>
                <Icon name="Siren" size={14} /> Incident live
              </button>
            )}
            <span className="hidden sm:inline-flex items-center gap-2 text-xs" style={{ color: C.mute }}>
              <span className="rounded-full rg-blink" style={{ width: 8, height: 8, background: C.green }} />
              Pune network live
            </span>
          </div>
        </div>
        <nav className="hidden md:flex max-w-6xl mx-auto px-6 pb-3 gap-2" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined} className="inline-flex items-center gap-2 rounded-xl px-4 text-sm font-semibold" style={{ minHeight: 42, background: tab === t.id ? C.orange : "transparent", color: tab === t.id ? "#1a0b02" : C.text, border: `1px solid ${tab === t.id ? C.orange : C.line}` }}>
              <Icon name={t.icon} size={16} />
              {t.label}
              {incidentLive && (t.id === "emergency" || t.id === "control") && <span className="rounded-full" style={{ width: 8, height: 8, background: C.red }} />}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-3 md:px-6 py-4" style={{ paddingBottom: 96 }}>
        <div style={{ display: tab === "driver" ? "block" : "none" }}>
          <DriverTab hazards={hazards} setHazards={setHazards} toast={toast} active={tab === "driver"} />
        </div>
        <div style={{ display: tab === "emergency" ? "block" : "none" }}>
          <EmergencyTab inc={inc} speed={speed} setSpeed={setSpeed} startCrash={startCrash} manualSOS={manualSOS} sendNow={sendNow} cancel={cancel} reset={reset} mode={mode} approve={approve} />
        </div>
        <div style={{ display: tab === "control" ? "block" : "none" }}>
          <ControlTab inc={inc} mode={mode} changeMode={changeMode} approve={approve} startCrash={startCrash} hazards={hazards} setHazards={setHazards} toast={toast} />
        </div>
        <div style={{ display: tab === "impact" ? "block" : "none" }}>
          <ImpactTab hazards={hazards} />
        </div>
        <p className="text-xs text-center mt-8" style={{ color: C.mute }}>
          SIH26203, Ministry of Road Transport &amp; Highways. Prototype with seeded demo data; no live traffic, patient or hospital records are used.
        </p>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4" style={{ background: "#07112b", borderTop: `1px solid ${C.line}` }} aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined} className="flex flex-col items-center justify-center gap-1 text-xs font-semibold relative" style={{ minHeight: 62, background: "transparent", border: "none", color: tab === t.id ? C.orange : C.mute }}>
            <Icon name={t.icon} size={22} />
            {t.label}
            {incidentLive && (t.id === "emergency" || t.id === "control") && <span className="absolute rounded-full" style={{ top: 8, right: "28%", width: 8, height: 8, background: C.red }} />}
          </button>
        ))}
      </nav>

      {toastMsg && (
        <div className="fixed left-0 right-0 flex justify-center px-3" style={{ bottom: 76, zIndex: 50, pointerEvents: "none" }} role="status" aria-live="polite">
          <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ maxWidth: 440, background: toneBg[toastMsg.tone] || toneBg.ok, border: `1px solid ${toneBd[toastMsg.tone] || toneBd.ok}`, color: "#fff", boxShadow: "0 10px 30px rgba(0,0,0,.45)" }}>
            {toastMsg.msg}
          </div>
        </div>
      )}
    </div>
  );
}
