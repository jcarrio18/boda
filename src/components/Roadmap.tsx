import { motion } from "motion/react";
import { Church, Bus, Utensils, Clock, MapPin } from "lucide-react";

const events = [
  {
    title: "La Ceremonia",
    time: "19:00h",
    location: "Iglesia San Juan del Hospital (Valencia)",
    description: "La iglesia más antigua de la ciudad de Valencia acogerá nuestro enlace.",
    icon: Church,
    distance: "Origen",
  },
  {
    title: "Servicio Autobús",
    time: "20:15h",
    location: "Plaza de Tetuán",
    description: "Desde aquí os esperarán unos autobuses para llevaros al lugar de la celebración.",
    icon: Bus,
    distance: "5 min a pie",
  },
  {
    title: "Banquete y celebración",
    time: "20:45",
    location: "Huerto de Santa María (El Puig)",
    description: "Cóctel, cena, fiesta y hasta recena... No se puede describir mejor!",
    icon: Utensils,
    distance: "20 km / 30 min en bús",
  },
  {
    title: "Primer turno de vuelta",
    time: "01:00h",
    location: "Huerto de Santa María",
    description: "Primer autobús de regreso al punto de origen (Plaza de Tetuán).",
    icon: Bus,
    distance: "Pendiente de confirmar",
  },
  {
    title: "Segundo turno de vuelta",
    time: "04:00h",
    location: "Huerto de Santa María",
    description: "Último autobús de regreso para los que aguanten hasta el final.",
    icon: Bus,
    distance: "Pendiente de confirmar",
  },
];

export default function Roadmap() {
  return (
    <section id="info" className="py-24 bg-med-cream">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-serif mb-4">El Día de la Boda</h2>
          <p className="text-med-olive italic">Un mapa de nuestra celebración</p>
        </div>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px roadmap-line -translate-x-1/2 block"></div>

          <div className="space-y-24">
            {events.map((event, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className={`relative flex flex-row md:items-center ${
                  index % 2 === 0 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Icon Circle */}
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 w-12 h-12 bg-med-olive rounded-full flex items-center justify-center z-10 border-4 border-med-cream top-0 md:top-auto">
                  <event.icon className="w-5 h-5 text-med-cream" />
                </div>

                {/* Content */}
                <div className={`w-full md:w-5/12 ml-20 md:ml-0 ${
                  index % 2 === 0 ? "md:pr-16 text-left md:text-right" : "md:pl-16 text-left"
                }`}>
                  <div className="flex items-center gap-2 mb-2 text-med-terracotta font-semibold uppercase tracking-widest text-sm justify-start md:justify-end">
                    {index % 2 === 0 ? (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>{event.time}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>{event.time}</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-2xl font-serif mb-2">{event.title}</h3>
                  <div className="flex items-center gap-1 text-med-olive mb-4 text-sm opacity-80 justify-start md:justify-end">
                    <MapPin className="w-3 h-3" />
                    <span>{event.location}</span>
                  </div>
                  <p className="text-med-ink/70 leading-relaxed mb-4">
                    {event.description}
                  </p>
                  <span className="inline-block px-3 py-1 bg-med-olive/10 text-med-olive text-xs rounded-full">
                    {event.distance}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
