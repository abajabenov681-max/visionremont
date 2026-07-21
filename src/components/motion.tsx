"use client";

import { motion } from "framer-motion";

/* Общие анимационные примитивы приложения.
   Ограничение: ничего дольше 400-500ms, анимации не блокируют флоу. */

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

/** Контейнер списка карточек: дети-`MotionItem` появляются каскадом (stagger ~60ms). */
export function MotionList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={listVariants} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function MotionItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

/** Одиночное появление блока (fade + подъём), например карточки сертификата. */
export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Fade-переход между экранами (используется в template.tsx зон). */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
      {children}
    </motion.div>
  );
}

/** Галочка с отрисовкой SVG-пути (~350ms) для подтверждения успеха. */
export function CheckDraw({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" className={className} fill="none">
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        stroke="currentColor"
        strokeWidth="3"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
      <motion.path
        d="M15 27 L23 34 L37 19"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
      />
    </svg>
  );
}
