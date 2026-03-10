import { Gift, Banknote, CreditCard } from "lucide-react";
import { motion } from "motion/react";

export default function Gifts() {
  const accountNumber = "ES70 2080 3804 1730 4013 4359";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(accountNumber.replace(/\s/g, ""));
    alert("Número de cuenta copiado al portapapeles");
  };

  return (
    <section id="gifts" className="py-24 bg-white relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-med-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-med-terracotta/5 rounded-full blur-3xl" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Gift className="w-12 h-12 mx-auto mb-6 text-med-gold" />
          <h2 className="text-4xl md:text-5xl font-serif mb-4 text-med-ink">
            Lista de Regalos
          </h2>
          <p className="text-lg text-med-olive/80 max-w-2xl mx-auto leading-relaxed">
            Vuestra presencia es el mejor regalo que podemos recibir. Si aún así deseáis hacernos un detalle, 
            os damos algunas opciones:
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Cash Option - Preferred */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-med-gold to-med-terracotta rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative bg-white p-8 rounded-2xl border-2 border-med-gold/30 hover:border-med-gold/60 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <Banknote className="w-10 h-10 text-med-gold" />
                <span className="text-xs uppercase tracking-widest font-semibold text-med-gold bg-med-gold/10 px-3 py-1 rounded-full">
                  Preferido
                </span>
              </div>
              <h3 className="text-2xl font-serif mb-3 text-med-ink">Efectivo</h3>
              <p className="text-med-olive/70 leading-relaxed">
                Si lo preferís, podéis entregarnos un detalle en efectivo en cuanto podáis.
                Es nuestra opción favorita. 💝
              </p>
            </div>
          </motion.div>

          {/* Bank Transfer Option */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative group"
          >
            <div className="relative bg-med-cream/50 p-8 rounded-2xl border-2 border-med-olive/20 hover:border-med-olive/40 transition-all duration-300">
              <CreditCard className="w-10 h-10 text-med-olive mb-4" />
              <h3 className="text-2xl font-serif mb-3 text-med-ink">Transferencia</h3>
              <p className="text-med-olive/70 mb-4 leading-relaxed">
                También podéis hacer una transferencia a nuestra cuenta bancaria:
              </p>
              <div className="bg-white rounded-xl p-4 border border-med-olive/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-med-olive/60 font-semibold">
                    Número de Cuenta
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="text-xs text-med-terracotta hover:text-med-terracotta/80 font-semibold transition-colors"
                  >
                    Copiar
                  </button>
                </div>
                <code className="text-sm font-mono text-med-ink block break-all">
                  {accountNumber}
                </code>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-med-olive/60 italic text-sm max-w-xl mx-auto">
            Lo más importante para nosotros es compartir este día tan especial con vosotros. 
            ¡Muchísimas gracias por vuestro cariño! 💕
          </p>
        </motion.div>
      </div>
    </section>
  );
}
