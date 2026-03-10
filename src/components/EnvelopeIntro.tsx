import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function EnvelopeIntro({ onOpen }: { onOpen: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    
    const handleInteraction = () => {
      if (!isOpenRef.current) {
        handleOpen();
      }
    };

    window.addEventListener("wheel", handleInteraction);
    window.addEventListener("touchmove", handleInteraction);
    
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("wheel", handleInteraction);
      window.removeEventListener("touchmove", handleInteraction);
    };
  }, []);

  const handleOpen = () => {
    if (isOpenRef.current) return;
    isOpenRef.current = true;
    setIsOpen(true);
    
    setTimeout(() => {
      document.body.style.overflow = "auto";
    }, 1000);

    setTimeout(() => {
      onOpen();
    }, 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={isOpen ? { opacity: 0, pointerEvents: "none" } : { opacity: 1 }}
      transition={{ duration: 1, delay: 1.5 }}
      className="fixed inset-0 z-[100] bg-med-cream flex flex-col items-center justify-center cursor-pointer"
      onClick={handleOpen}
      style={{ perspective: "1000px" }}
    >
      <div className="relative w-[90vw] max-w-2xl aspect-[3/2]">
        {/* Back of envelope (inside) */}
        <div className="absolute inset-0 bg-[#4A5D4E] shadow-2xl rounded-sm"></div>
        
        {/* Letter inside */}
        <motion.div 
          animate={isOpen ? { y: "-60%", opacity: 0 } : { y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: "easeInOut" }}
          className="absolute inset-x-4 top-4 bottom-4 bg-white shadow-inner flex items-center justify-center rounded-sm z-0"
        >
          <div className="text-center">
            <span className="text-med-terracotta uppercase tracking-[0.3em] text-xs font-semibold mb-4 block">
              Save the Date
            </span>
            <h2 className="text-4xl font-serif text-med-ink">
              Cristina <span className="italic font-light">&</span> Joan
            </h2>
          </div>
        </motion.div>

        {/* Envelope Bottom/Sides (Front) */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-sm">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <polygon points="0,0 50,50 0,100" fill="#526556" />
            <polygon points="100,0 50,50 100,100" fill="#526556" />
            <polygon points="0,100 50,50 100,100" fill="#5A6D5E" />
          </svg>
        </div>

        {/* Envelope Flap (Top) */}
        <motion.div
          animate={isOpen ? { rotateX: 180 } : { rotateX: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ transformOrigin: "top", transformStyle: "preserve-3d" }}
          className="absolute top-0 left-0 right-0 h-[60%] z-20"
        >
          {/* Front of flap */}
          <div 
            className="absolute inset-0" 
            style={{ backfaceVisibility: "hidden" }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full drop-shadow-md">
              <polygon points="0,0 100,0 50,100" fill="#627566" />
            </svg>
            
            {/* Wax Seal */}
            <motion.div 
              animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
              transition={{ duration: 0.1 }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-20 h-20 bg-[#8B3A3A] rounded-full shadow-lg flex items-center justify-center border-2 border-[#7A2A2A] z-30"
            >
              <div className="w-16 h-16 rounded-full border border-[#9C4A4A] flex items-center justify-center">
                <span className="font-serif text-[#E8DCC4] text-2xl tracking-tighter">
                  C<span className="italic">&</span>J
                </span>
              </div>
            </motion.div>
          </div>
          
          {/* Back of flap (visible when open) */}
          <div 
            className="absolute inset-0" 
            style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
              <polygon points="0,100 100,100 50,0" fill="#4A5D4E" />
            </svg>
          </div>
        </motion.div>
      </div>
      
      <motion.p 
        animate={isOpen ? { opacity: 0 } : { opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: isOpen ? 0 : Infinity }}
        className="absolute bottom-12 text-med-olive font-serif italic text-lg"
      >
        Haz click o desliza para abrir
      </motion.p>
    </motion.div>
  );
}
