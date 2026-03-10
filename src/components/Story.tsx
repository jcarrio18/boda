import { motion } from "motion/react";

export default function Story() {
  return (
    <section id="story" className="py-24 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-t-full overflow-hidden border-[12px] border-med-cream shadow-2xl">
              <img
                src="https://lh3.googleusercontent.com/d/1-oHnypGNSU1nY36m5VmZ6iapyhBcIY19"
                alt="The Couple"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-8 -right-8 w-38 h-38 bg-med-olive rounded-full flex items-center justify-center text-med-cream p-8 text-center rotate-12 shadow-xl">
              <p className="font-serif italic text-lg">Desde 2022</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-med-terracotta uppercase tracking-[0.3em] text-xs font-semibold mb-4 block">
              Nuestra historia
            </span>
            <h2 className="text-5xl font-serif mb-8 leading-tight">
              Desde Noruega hasta España y por una <span className="italic">vida juntos.</span>
            </h2>
            <div className="space-y-6 text-med-ink/80 leading-relaxed font-light">
              <p>
                Todo empezó en una pequeña cabaña en medio de la nada de Noruega, donde en un cumpleaños de nuestro amigo en común, nos tiramos hablando casi toda la tarde. Decidimos retomar la conversación en un Burger King al dia siguiente y, lo que se suponía que iba a ser una cena rápida se convirtió en un paseo al día siguiente y horas de conversación sobre nuestras vidas.
              </p>
              <p>
                Desde ahí y durante los últimos casi 4 años; hemos explorado países, comidas, compartido momentos en familia y construido un hogar juntos. Fue al volver donde todo empezó, donde decidimos de nuevo, comenzar otra historia de amor.
              </p>
              <p className="font-serif italic text-med-olive text-xl pt-4">
                "Para sacar el máximo rendimiento de la alegría hay que tener con quién compartirla."
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
