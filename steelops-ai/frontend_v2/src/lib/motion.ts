import type { Transition, Variants } from "framer-motion";

export const industrialEase: Transition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
};

export const pageTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
} as const;

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
};

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: industrialEase },
};

export const cardHover = {
  rest: { y: 0, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  hover: { y: -2, transition: industrialEase },
};

export const scaleTap = {
  whileTap: { scale: 0.98 },
  transition: industrialEase,
};

export const sidebarWidth: Variants = {
  expanded: { width: 260, transition: industrialEase },
  collapsed: { width: 64, transition: industrialEase },
};
