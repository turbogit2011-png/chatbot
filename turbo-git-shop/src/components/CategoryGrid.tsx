"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { categories } from "@/lib/data";

const brandLetterColors: Record<string, string> = {
  Audi: "#FF7A00",
  BMW: "#0066B1",
  Ford: "#003399",
  Mercedes: "#00A878",
  Volkswagen: "#001E50",
  Volvo: "#003057",
  Renault: "#FFCC00",
  Opel: "#FFD700",
  Toyota: "#EB0A1E",
  Peugeot: "#003189",
  Skoda: "#4BA82E",
  Hyundai: "#002C5F",
};

const brandGradients: Record<string, string> = {
  Audi: "from-orange-500 to-red-500",
  BMW: "from-blue-500 to-cyan-400",
  Ford: "from-blue-600 to-blue-400",
  Mercedes: "from-emerald-500 to-teal-400",
  Volkswagen: "from-blue-700 to-blue-500",
  Volvo: "from-blue-900 to-blue-700",
  Renault: "from-yellow-400 to-orange-400",
  Opel: "from-yellow-500 to-amber-400",
  Toyota: "from-red-600 to-red-400",
  Peugeot: "from-blue-700 to-indigo-500",
  Skoda: "from-green-600 to-green-400",
  Hyundai: "from-slate-700 to-slate-500",
};

export default function CategoryGrid() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45 },
    },
  };

  return (
    <section
      id="kategorie"
      ref={sectionRef}
      className="py-20 bg-[#06080D] relative"
    >
      {/* Background accents */}
      <div className="absolute inset-0 dot-matrix opacity-40 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="section-label justify-center mb-4">
            Kategorie
          </span>
          <h2 className="font-display text-5xl lg:text-6xl text-white mt-4 leading-none">
            WYBIERZ MARKĘ
            <br />
            <span className="text-gradient">POJAZDU</span>
          </h2>
          <p className="text-[#94A3B8] mt-4 max-w-xl mx-auto">
            Turbosprężarki regenerowane do wszystkich popularnych marek.
            Szybka dostawa i gwarancja 24 miesięcy.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4"
        >
          {categories.map((cat) => {
            const gradient = brandGradients[cat.name] || "from-orange-500 to-amber-500";
            const firstLetter = cat.name.charAt(0);

            return (
              <motion.a
                key={cat.slug}
                href={`#sklep`}
                variants={itemVariants}
                className="cat-card group"
              >
                {/* Brand letter/logo area */}
                <div className="mb-3 mx-auto w-14 h-14 rounded-xl relative flex items-center justify-center overflow-hidden">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-15 group-hover:opacity-25 transition-opacity`}
                  />
                  <span
                    className="font-display text-3xl relative z-10"
                    style={{ color: brandLetterColors[cat.name] || "#FF7A00" }}
                  >
                    {firstLetter}
                  </span>
                </div>

                {/* Brand name */}
                <div className="font-bold text-white text-sm group-hover:text-[#FF7A00] transition-colors">
                  {cat.name}
                </div>

                {/* Count */}
                <div className="text-[11px] text-[#4A6080] mt-1">
                  ({cat.count} modeli)
                </div>
              </motion.a>
            );
          })}
        </motion.div>

        {/* Bottom link */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-10"
        >
          <a
            href="#sklep"
            className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-[#FF7A00] transition-colors text-sm group"
          >
            <span>Zobacz wszystkie marki</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
