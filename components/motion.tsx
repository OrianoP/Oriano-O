"use client";

import { MotionConfig, motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

/** Honours the OS "reduce motion" setting for every animation on the site. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 260, damping: 30 }}>{children}</MotionConfig>;
}

export const spring = { type: "spring", stiffness: 300, damping: 32, mass: 0.9 } as const;
export const softSpring = { type: "spring", stiffness: 180, damping: 26 } as const;
export const easeOut = [0.16, 1, 0.3, 1] as const;

/** Fades + rises content into view the first time it scrolls on screen. */
export function Reveal({ children, delay = 0, y = 22, className, as = "div", once = true }: {
  children: ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "section" | "li" | "p" | "span"; once?: boolean;
}) {
  const M = motion[as];
  return (
    <M
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.7, ease: easeOut, delay }}
      className={className}
    >
      {children}
    </M>
  );
}

/** Staggers its children (each wrapped in <Item>) as the group enters view. */
export function Stagger({ children, className, gap = 0.07 }: { children: ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
export function Item({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  const M = motion[as];
  return (
    <M variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } } }} className={className}>
      {children}
    </M>
  );
}

/** Slow vertical drift tied to scroll, for hero and story photos. */
export function Parallax({ children, className, amount = 60 }: { children: ReactNode; className?: string; amount?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useSpring(useTransform(scrollYProgress, [0, 1], [reduce ? 0 : -amount, reduce ? 0 : amount]), { stiffness: 120, damping: 28 });
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }} className="h-full w-full">{children}</motion.div>
    </div>
  );
}

/** Number that counts up when it scrolls into view (e.g. "45"). */
export function Pop({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ ...spring, delay }}
      className={className}
    >
      {children}
    </motion.span>
  );
}
