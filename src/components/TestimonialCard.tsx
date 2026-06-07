/*testimonial cards*/

interface Testimonial {
  name: string;
  role: string;
  text: string;
  rating?: number;
}

export default function TestimonialCard({
  testimonial,
}: {
  testimonial: Testimonial;
}) {
  return (
    <div className="w-[320px] flex-shrink-0 rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 shadow-sm">
      <p className="text-sm italic text-slate-600 dark:text-slate-300">
        "{testimonial.text}"
      </p>

      {testimonial.rating && (
        <div className="flex gap-1 mt-4">
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <span key={i}>⭐</span>
          ))}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800">
        <h4 className="font-bold">{testimonial.name}</h4>
        <p className="text-xs text-slate-500">{testimonial.role}</p>
      </div>
    </div>
  );
}
