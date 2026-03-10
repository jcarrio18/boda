import { motion } from "motion/react";

export default function Hero() {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://sanjuandelhospital.es/wp-content/uploads/2016/05/Elena-e-Ignacio-boda-web.jpg?q=70&w=1920&auto=format&fit=crop"
          alt="Interior de la Iglesia"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-med-cream/80 backdrop-blur-[2px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 text-center px-4"
      >
        <span className="text-med-olive uppercase tracking-[0.3em] text-sm font-semibold mb-6 block">
          Save the Date
        </span>
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif text-med-ink mb-8 leading-tight">
          Cristina <span className="italic font-light">&</span> Joan
        </h1>
        <div className="w-24 h-px bg-med-olive mx-auto mb-8"></div>
        <p className="text-xl md:text-2xl font-serif italic text-med-olive mb-12">
          10 de Octubre, 2026 • Valencia
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-med-olive text-med-cream px-10 py-4 rounded-full text-sm uppercase tracking-widest hover:bg-med-olive transition-colors duration-300"
          onClick={() => document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Rellena el formulario
        </motion.button>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-med-olive opacity-50"
      >
        <div className="w-px h-12 bg-med-olive mx-auto"></div>
      </motion.div>
    </section>
  );
}
