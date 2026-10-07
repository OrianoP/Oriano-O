import type { MenuProduct } from "@/lib/types";

/**
 * Illustrated food art for menu items without a photo. Pizzas are drawn from
 * their base (label) and the toppings named in the description, with a stable
 * layout per product so every pie looks the same on every visit.
 */

function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const SAUCE: Record<string, { sauce: string; cheese: string }> = {
  red: { sauce: "#d8361b", cheese: "#ffe9a8" },
  white: { sauce: "#f7edd8", cheese: "#fff3c9" },
  vodka: { sauce: "#f07a4e", cheese: "#ffe2a6" },
  truffle: { sauce: "#d9c29a", cheese: "#f6e6bd" },
  bbq: { sauce: "#8a3415", cheese: "#ffe1a0" },
  salad: { sauce: "#f2e3c2", cheese: "#fff5d6" },
};

function baseOf(label: string, description: string) {
  const s = `${label} ${description}`.toLowerCase();
  if (s.includes("truffle")) return "truffle";
  if (s.includes("vodka")) return "vodka";
  if (s.includes("bbq base")) return "bbq";
  if (s.includes("pizza salad") || s.includes("olive oil base")) return "salad";
  if (s.includes("white")) return "white";
  return "red";
}

type Topping = { kind: string; count: number };

function toppingsOf(name: string, description: string): Topping[] {
  const s = `${name} ${description}`.toLowerCase();
  const t: Topping[] = [];
  const has = (...w: string[]) => w.some((x) => s.includes(x));
  if (has("pepperoni")) t.push({ kind: "pepperoni", count: has("overload", "triple") ? 16 : 10 });
  if (has("chorizo")) t.push({ kind: "chorizo", count: 11 });
  if (has("sausage") && !has("chorizo")) t.push({ kind: "sausage", count: 12 });
  if (has("ham")) t.push({ kind: "ham", count: 9 });
  if (has("chicken")) t.push({ kind: "chicken", count: 11 });
  if (has("mushroom")) t.push({ kind: "mushroom", count: 8 });
  if (has("onion")) t.push({ kind: "onion", count: 7 });
  if (has("jalape")) t.push({ kind: "jalapeno", count: 7 });
  if (has("artichoke")) t.push({ kind: "artichoke", count: 6 });
  if (has("goat", "blue cheese", "four cheese", "ricotta")) t.push({ kind: "cheese", count: 8 });
  if (has("cherry tomato")) t.push({ kind: "tomato", count: 7 });
  if (has("mesclun", "arugula", "rocca")) t.push({ kind: "greens", count: 14 });
  if (has("margherita", "basil", "oregano")) t.push({ kind: "basil", count: 6 });
  if (has("truffle")) t.push({ kind: "truffle", count: 16 });
  return t;
}

function drizzleOf(name: string, description: string) {
  const s = `${name} ${description}`.toLowerCase();
  if (s.includes("hot honey") || s.includes("honey")) return "#f2a20c";
  if (s.includes("ranch")) return "#fffaf0";
  if (s.includes("bbq drizzle") || (s.includes("bbq") && !s.includes("bbq base"))) return "#5c1d07";
  if (s.includes("balsamic")) return "#3b1f12";
  return null;
}

function ToppingShape({ kind, x, y, r, rot }: { kind: string; x: number; y: number; r: () => number; rot: number }) {
  const t = `translate(${x} ${y}) rotate(${rot})`;
  switch (kind) {
    case "pepperoni":
      return (
        <g transform={t}>
          <circle r="8.5" fill="#b3261e" />
          <circle r="8.5" fill="none" stroke="#8e1b15" strokeWidth="1.2" />
          <circle cx="-2.5" cy="-2" r="1.3" fill="#7c1611" opacity="0.7" />
          <circle cx="3" cy="2.5" r="1" fill="#7c1611" opacity="0.7" />
        </g>
      );
    case "chorizo":
      return (
        <g transform={t}>
          <circle r="7.5" fill="#9b2617" />
          <circle cx="-2" cy="1" r="1.6" fill="#f3c48e" opacity="0.8" />
          <circle cx="2.5" cy="-2" r="1.2" fill="#f3c48e" opacity="0.8" />
        </g>
      );
    case "sausage":
      return <path transform={t} d="M-5 -3 Q0 -7 5 -3 Q7 2 2 5 Q-4 6 -6 1 Z" fill="#7a3b1c" />;
    case "ham":
      return <rect transform={t} x="-6" y="-4.5" width="12" height="9" rx="2" fill="#f2a3a0" stroke="#d97f7b" strokeWidth="1" />;
    case "chicken":
      return <path transform={t} d="M-6 -2 Q-3 -6 3 -5 Q7 -2 5 3 Q0 6 -5 3 Z" fill="#e8c38d" stroke="#c9995a" strokeWidth="1" />;
    case "mushroom":
      return (
        <g transform={t}>
          <path d="M-7 1 Q0 -9 7 1 Z" fill="#cdb594" stroke="#a88d6a" strokeWidth="1" />
          <rect x="-2" y="0" width="4" height="5" rx="1.5" fill="#e6d6bb" />
        </g>
      );
    case "onion":
      return <circle transform={t} r="6" fill="none" stroke="#9b5ba5" strokeWidth="2" opacity="0.85" />;
    case "jalapeno":
      return (
        <g transform={t}>
          <circle r="5" fill="#4f9a2f" />
          <circle r="2.4" fill="#cde9a6" />
        </g>
      );
    case "artichoke":
      return <path transform={t} d="M0 -7 L5 0 L0 7 L-5 0 Z" fill="#7c9a4b" stroke="#5b7634" strokeWidth="1" />;
    case "cheese":
      return <path transform={t} d="M-6 -1 Q-4 -7 2 -6 Q7 -3 5 3 Q0 7 -5 3 Z" fill="#fffdf6" stroke="#eadfc8" strokeWidth="1" />;
    case "tomato":
      return (
        <g transform={t}>
          <circle r="5.5" fill="#e23b2e" />
          <circle cx="-1.5" cy="-1.8" r="1.4" fill="#ff8a7a" />
        </g>
      );
    case "greens":
      return <path transform={t} d="M-8 0 Q-2 -7 8 -1 Q0 6 -8 0 Z" fill={r() > 0.5 ? "#4f9a2f" : "#7cba4a"} />;
    case "basil":
      return <path transform={t} d="M-7 0 Q0 -8 7 0 Q0 8 -7 0 Z" fill="#2f8a33" stroke="#1f6a24" strokeWidth="0.8" />;
    case "truffle":
      return <circle transform={t} r="1.6" fill="#3b2a20" opacity="0.8" />;
    default:
      return null;
  }
}

export function PizzaArt({ product, labelName = "", className }: { product: MenuProduct; labelName?: string; className?: string }) {
  const desc = product.description || "";
  const base = SAUCE[baseOf(labelName, desc)];
  const tops = toppingsOf(product.name, desc);
  const drizzle = drizzleOf(product.name, desc);
  const r = rng(product.id * 7 + 3);

  // Cheese pools
  const pools = Array.from({ length: 9 }, () => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 58;
    return { x: 100 + Math.cos(a) * d, y: 100 + Math.sin(a) * d, rx: 12 + r() * 12, ry: 9 + r() * 9, rot: r() * 180 };
  });

  // Crust char spots
  const char = Array.from({ length: 22 }, () => {
    const a = r() * Math.PI * 2;
    const d = 80 + r() * 9;
    return { x: 100 + Math.cos(a) * d, y: 100 + Math.sin(a) * d, s: 1.2 + r() * 2.4 };
  });

  const pieces = tops.flatMap((tp) =>
    Array.from({ length: tp.count }, () => {
      const a = r() * Math.PI * 2;
      const d = 8 + Math.sqrt(r()) * 60;
      return { kind: tp.kind, x: 100 + Math.cos(a) * d, y: 100 + Math.sin(a) * d, rot: r() * 360 };
    }),
  );

  // Two loose, wavy drizzle lines across the pie.
  const zig = drizzle
    ? [62, 118].map((y0) => {
        let d = `M38 ${y0 + r() * 10}`;
        for (let x = 38; x < 160; x += 30) d += ` Q${x + 15} ${y0 - 18 + r() * 8} ${x + 30} ${y0 + r() * 10}`;
        return d;
      }).join(" ")
    : null;

  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={product.name}>
      <defs>
        <radialGradient id={`crust-${product.id}`} cx="50%" cy="45%" r="55%">
          <stop offset="78%" stopColor="#e7a85a" />
          <stop offset="92%" stopColor="#c97f35" />
          <stop offset="100%" stopColor="#a8622a" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="108" rx="92" ry="90" fill="#2b1a12" opacity="0.12" />
      <circle cx="100" cy="100" r="92" fill={`url(#crust-${product.id})`} />
      {char.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={c.s} fill="#6e3b16" opacity="0.55" />)}
      <circle cx="100" cy="100" r="78" fill={base.sauce} />
      {pools.map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} transform={`rotate(${p.rot} ${p.x} ${p.y})`} fill={base.cheese} opacity="0.92" />
      ))}
      {pieces.map((p, i) => <ToppingShape key={i} kind={p.kind} x={p.x} y={p.y} r={r} rot={p.rot} />)}
      {zig && <path d={zig} fill="none" stroke={drizzle!} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />}
      <circle cx="100" cy="100" r="78" fill="none" stroke="#b86d2c" strokeWidth="1.5" opacity="0.35" />
      {/* slice cuts */}
      {[0, 45, 90, 135].map((deg) => (
        <line key={deg} x1="100" y1="10" x2="100" y2="190" stroke="#fff6ec" strokeWidth="1.2" opacity="0.35" transform={`rotate(${deg} 100 100)`} />
      ))}
    </svg>
  );
}

const CAN_COLORS: [RegExp, string, string][] = [
  [/pepsi max/i, "#111111", "#1e4fd8"],
  [/pepsi diet/i, "#c9d3e6", "#1e4fd8"],
  [/pepsi/i, "#1e4fd8", "#e32636"],
  [/7up diet/i, "#e9f5e1", "#1f8a3b"],
  [/7up/i, "#1f8a3b", "#ffd60a"],
  [/miranda diet/i, "#ffe8cc", "#ff7a00"],
  [/miranda/i, "#ff7a00", "#ffd60a"],
  [/peach/i, "#f7a35c", "#7a3b1c"],
  [/red fruit/i, "#c2185b", "#ffd6e5"],
];

export function DrinkArt({ name, className }: { name: string; className?: string }) {
  const isWater = /water/i.test(name);
  if (isWater) {
    const sparkling = /sparkling/i.test(name);
    return (
      <svg viewBox="0 0 200 200" className={className} role="img" aria-label={name}>
        <ellipse cx="100" cy="182" rx="42" ry="8" fill="#2b1a12" opacity="0.12" />
        <rect x="84" y="22" width="32" height="18" rx="4" fill={sparkling ? "#1f8a3b" : "#1e88e5"} />
        <path d="M78 46 Q78 40 86 40 L114 40 Q122 40 122 46 L132 70 Q136 80 136 92 L136 168 Q136 180 124 180 L76 180 Q64 180 64 168 L64 92 Q64 80 68 70 Z" fill="#d9f0ff" stroke="#9fd2f5" strokeWidth="2" />
        <rect x="64" y="104" width="72" height="40" fill={sparkling ? "#e8f6ec" : "#ffffff"} stroke="#9fd2f5" />
        <text x="100" y="129" textAnchor="middle" fontSize="13" fontWeight="800" fill={sparkling ? "#1f8a3b" : "#1e88e5"}>{sparkling ? "BUBBLES" : "WATER"}</text>
        {sparkling && [0, 1, 2, 3, 4].map((i) => <circle key={i} cx={78 + i * 11} cy={160 - (i % 2) * 8} r="2.5" fill="#9fd2f5" />)}
      </svg>
    );
  }
  const [, body, accent] = CAN_COLORS.find(([re]) => re.test(name)) || [/./, "#ff3300", "#ffd60a"];
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={name}>
      <ellipse cx="100" cy="182" rx="44" ry="8" fill="#2b1a12" opacity="0.12" />
      <rect x="62" y="34" width="76" height="144" rx="14" fill={body} />
      <rect x="66" y="26" width="68" height="14" rx="6" fill="#c9ced6" />
      <rect x="62" y="74" width="76" height="52" fill={accent} opacity="0.92" />
      <path d="M62 100 Q100 80 138 100" fill="none" stroke="#ffffff" strokeWidth="5" opacity="0.85" />
      <rect x="74" y="40" width="8" height="128" rx="4" fill="#ffffff" opacity="0.18" />
    </svg>
  );
}

export function SideArt({ name, className }: { name: string; className?: string }) {
  if (/fries/i.test(name)) {
    return (
      <svg viewBox="0 0 200 200" className={className} role="img" aria-label={name}>
        <ellipse cx="100" cy="182" rx="56" ry="9" fill="#2b1a12" opacity="0.12" />
        {Array.from({ length: 11 }, (_, i) => (
          <rect key={i} x={58 + i * 8} y={30 + (i % 3) * 10} width="10" height="90" rx="3" fill={i % 2 ? "#ffcf4a" : "#f5b82e"} transform={`rotate(${(i - 5) * 3} ${63 + i * 8} 120)`} />
        ))}
        <path d="M48 90 L152 90 L140 178 L60 178 Z" fill="#ff3300" />
        <path d="M48 90 L152 90 L149 106 L51 106 Z" fill="#e62e00" />
        <text x="100" y="148" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff6ec" fontFamily="Georgia, serif">NY</text>
      </svg>
    );
  }
  // Dipping sauce cup
  const color = /bbq/i.test(name) ? "#7a2a10" : /buffalo/i.test(name) ? "#e8541c" : /honey/i.test(name) ? "#f2a20c" : "#fffaf0";
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={name}>
      <ellipse cx="100" cy="168" rx="56" ry="10" fill="#2b1a12" opacity="0.12" />
      <path d="M48 92 L152 92 L140 160 Q100 172 60 160 Z" fill="#ffffff" stroke="#eadfc8" strokeWidth="2" />
      <ellipse cx="100" cy="92" rx="52" ry="16" fill="#f3ead9" stroke="#eadfc8" strokeWidth="2" />
      <ellipse cx="100" cy="94" rx="44" ry="11" fill={color} />
      <ellipse cx="88" cy="91" rx="12" ry="3" fill="#ffffff" opacity="0.35" />
    </svg>
  );
}

export function FoodArt({ product, labelName, className }: { product: MenuProduct; labelName?: string; className?: string }) {
  if (product.itemType === "pizza") return <PizzaArt product={product} labelName={labelName} className={className} />;
  if (product.itemType === "drink") return <DrinkArt name={product.name} className={className} />;
  return <SideArt name={product.name} className={className} />;
}
