import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import Hero from "./components/Hero";
import Story from "./components/Story";
import Roadmap from "./components/Roadmap";
import RSVPForm from "./components/RSVPForm";
import Gifts from "./components/Gifts";
import EnvelopeIntro from "./components/EnvelopeIntro";

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Nuestra Historia", href: "#story" },
    { name: "Información", href: "#info" },
    { name: "Asistencia", href: "#rsvp" },
    { name: "Regalos", href: "#gifts" },
  ];

  return (
    <div className="min-h-screen selection:bg-med-gold selection:text-white">
      <AnimatePresence>
        {showIntro && <EnvelopeIntro onOpen={() => setShowIntro(false)} />}
      </AnimatePresence>

      {/* Navigation */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-med-cream/90 backdrop-blur-md py-4 shadow-sm" : "bg-transparent py-8"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <a href="#" className="font-serif text-2xl tracking-tighter text-med-ink">
            C<span className="italic text-med-gold">&</span>J
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-12">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-xs uppercase tracking-[0.2em] font-semibold text-med-ink/70 hover:text-med-gold transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-med-ink"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-med-cream flex flex-center items-center justify-center md:hidden"
          >
            <div className="flex flex-col items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-2xl font-serif text-med-ink hover:text-med-gold transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main>
        <Hero />
        <Story />
        <Roadmap />
        <RSVPForm />
        <Gifts />
      </main>

      {/* Footer */}
      <footer className="py-12 bg-med-cream border-t border-med-olive/10 text-center">
        <p className="font-serif italic text-med-olive mb-4 text-xl">
          Tenemos muchas ganas de celebrar con vosotros.
        </p>
        <div className="text-[10px] uppercase tracking-[0.3em] text-med-ink/40">
          10 de Octubre, 2026 • Valencia
        </div>
      </footer>
    </div>
  );
}
