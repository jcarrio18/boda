import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Plus, Trash2, UserPlus } from "lucide-react";

const guestSchema = z.object({
  name: z.string().min(2, "Introduce el nombre del acompañante"),
  dietary: z.string().optional(),
  type: z.enum(["adult", "child"], {
    message: "Selecciona si es adulto o niño"
  }),
});

const rsvpSchema = z.object({
  name: z.string().min(2, "Por favor, introduce tu nombre completo"),
  email: z.string().email("Por favor, introduce un email válido"),
  dietary: z.string().optional(),
  attending: z.enum(["yes_all", "only_ceremony", "only_dinner", "no"], {
    message: "Por favor, dinos si podrás venir"
  }),
  additional_guests: z.array(guestSchema).optional(),
  bus_trip: z.enum(["one_way", "round_trip_1", "round_trip_2", "none"]).optional(),
  songs: z.string().optional(),
  message: z.string().optional(),
});

type RSVPData = z.infer<typeof rsvpSchema>;

export default function RSVPForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RSVPData>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      additional_guests: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "additional_guests",
  });

  const isAttending = watch("attending");

  const onSubmit = async (data: RSVPData) => {
    setSubmitError(null);
    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to submit RSVP");
      }

      setIsSubmitted(true);
    } catch (error: any) {
      console.error("Error submitting RSVP:", error);
      setSubmitError(error.message || "Hubo un error al enviar tu respuesta. Por favor, inténtalo de nuevo.");
    }
  };

  return (
    <section id="rsvp" className="py-24 bg-med-cream">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif mb-4">Confirmar Asistencia</h2>
          <p className="text-med-olive italic">Puede rellenar una persona y añadir participantes adicionales al indicar su asistencia.<br />Por favor, responde lo antes posible :)</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          {/* Main Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-semibold text-med-olive">Nombre Completo</label>
              <input
                {...register("name")}
                className="w-full bg-transparent border-b border-med-olive/30 py-2 focus:border-med-terracotta outline-none transition-colors"
                placeholder="Tu nombre"
              />
              {errors.name && <p className="text-xs text-med-terracotta">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-semibold text-med-olive">Email</label>
              <input
                {...register("email")}
                className="w-full bg-transparent border-b border-med-olive/30 py-2 focus:border-med-terracotta outline-none transition-colors"
                placeholder="tu@email.com"
              />
              {errors.email && <p className="text-xs text-med-terracotta">{errors.email.message}</p>}
            </div>
          </div>

          {/* Dietary Requirements for Main Guest */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest font-semibold text-med-olive">Alérgenos / Preferencias Alimentarias</label>
            <input
              {...register("dietary")}
              className="w-full bg-transparent border-b border-med-olive/30 py-2 focus:border-med-terracotta outline-none transition-colors"
              placeholder="Vegetariano, celíaco, etc. (opcional)"
            />
          </div>

          {/* Attendance */}
          <div className="space-y-4">
            <label className="text-xs uppercase tracking-widest font-semibold text-med-olive block">¿Asistirás?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { value: "yes_all", label: "Sí, a todo" },
                { value: "only_ceremony", label: "Solo a la ceremonia" },
                { value: "only_dinner", label: "Solo al banquete" },
                { value: "no", label: "No" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-3 cursor-pointer group p-3 border border-med-olive/10 rounded-xl hover:bg-white/50 transition-colors">
                  <input
                    type="radio"
                    value={option.value}
                    {...register("attending")}
                    className="w-4 h-4 accent-med-terracotta"
                  />
                  <span className="text-med-ink group-hover:text-med-terracotta transition-colors">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.attending && <p className="text-xs text-med-terracotta">{errors.attending.message}</p>}
          </div>

          {/* Additional Guests Section */}
          {["yes_all", "only_ceremony", "only_dinner"].includes(isAttending || "") && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between border-b border-med-olive/10 pb-4">
                <label className="text-xs uppercase tracking-widest font-semibold text-med-olive">¿Con quién más vendrás?</label>
                <button
                  type="button"
                  onClick={() => append({ name: "", dietary: "", type: "adult" })}
                  className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-med-terracotta hover:text-med-olive transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Añadir persona
                </button>
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {fields.map((field, index) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white/40 p-6 rounded-2xl border border-med-olive/5 relative group"
                    >
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="absolute top-4 right-4 text-med-ink/30 hover:text-med-terracotta transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-med-olive/60">Nombre</label>
                          <input
                            {...register(`additional_guests.${index}.name` as const)}
                            className="w-full bg-transparent border-b border-med-olive/20 py-1 focus:border-med-terracotta outline-none transition-colors text-sm"
                            placeholder="Nombre del acompañante"
                          />
                          {errors.additional_guests?.[index]?.name && (
                            <p className="text-[10px] text-med-terracotta">{errors.additional_guests[index]?.name?.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-med-olive/60">Tipo</label>
                          <div className="flex gap-4 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs">
                              <input
                                type="radio"
                                value="adult"
                                {...register(`additional_guests.${index}.type` as const)}
                                className="w-3 h-3 accent-med-terracotta"
                              />
                              Adulto
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs">
                              <input
                                type="radio"
                                value="child"
                                {...register(`additional_guests.${index}.type` as const)}
                                className="w-3 h-3 accent-med-terracotta"
                              />
                              Niño
                            </label>
                          </div>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-med-olive/60">Alérgenos / Preferencias</label>
                          <input
                            {...register(`additional_guests.${index}.dietary` as const)}
                            className="w-full bg-transparent border-b border-med-olive/20 py-1 focus:border-med-terracotta outline-none transition-colors text-sm"
                            placeholder="Vegetariano, celíaco, etc."
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Bus Usage */}
          {["yes_all", "only_ceremony", "only_dinner"].includes(isAttending || "") && (
            <div className="space-y-4 pt-4">
              <label className="text-xs uppercase tracking-widest font-semibold text-med-olive block">
                ¿Harías uso del autobús?
                <span className="block text-[10px] normal-case font-normal opacity-60 mt-1 italic">
                  Por favor, tenlo en cuenta para ayudarnos a concretar los horarios.
                </span>
              </label>
              <div className="space-y-3">
                {[
                  { value: "one_way", label: "Solo ida" },
                  { value: "round_trip_1", label: "Ida y vuelta (primer turno - 01:00h)" },
                  { value: "round_trip_2", label: "Ida y vuelta (segundo turno - 04:00h)" },
                  { value: "none", label: "No haré uso del autobús" },
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      value={option.value}
                      {...register("bus_trip")}
                      className="w-4 h-4 accent-med-terracotta"
                    />
                    <span className="text-sm text-med-ink group-hover:text-med-terracotta transition-colors">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Songs */}
          <div className="space-y-2 pt-4">
            <label className="text-xs uppercase tracking-widest font-semibold text-med-olive">¿Qué canción o canciones no deberían faltar en la fiesta?</label>
            <textarea
              {...register("songs")}
              rows={2}
              className="w-full bg-transparent border-b border-med-olive/30 py-2 focus:border-med-terracotta outline-none transition-colors resize-none"
              placeholder="¡Queremos veros bailar!"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest font-semibold text-med-olive">Mensaje para la pareja</label>
            <textarea
              {...register("message")}
              rows={3}
              className="w-full bg-transparent border-b border-med-olive/30 py-2 focus:border-med-terracotta outline-none transition-colors resize-none"
              placeholder="Opcional"
            />
          </div>

          <div className="text-center pt-8">
            <button
              type="submit"
              disabled={isSubmitting || isSubmitted}
              className="bg-med-olive text-med-cream px-12 py-4 rounded-full text-sm uppercase tracking-widest hover:bg-med-terracotta transition-all duration-300 disabled:opacity-50 shadow-lg shadow-med-terracotta/20"
            >
              {isSubmitting ? "Enviando..." : isSubmitted ? "Enviado" : "Enviar Respuesta"}
            </button>

            <AnimatePresence>
              {submitError && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-red-600 mt-4 text-sm"
                >
                  {submitError}
                </motion.p>
              )}
              {isSubmitted && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-med-olive mt-4 text-sm italic font-serif text-lg"
                >
                  ¡Gracias! Tu respuesta ha sido recibida.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </form>
      </div>
    </section>
  );
}
