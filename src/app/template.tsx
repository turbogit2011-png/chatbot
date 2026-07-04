"use client";

import { motion } from "framer-motion";

/** App Router re-mounts this on every navigation, so it animates each route
 *  in. Opacity-only keeps it safe for `position: fixed` modals in children
 *  (transform/filter would create a containing block). */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
