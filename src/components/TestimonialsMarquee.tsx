"use client";

import TestimonialCard from "./TestimonialCard";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  institution?: string;
  avatarUrl?: string;
  quote: string;
  rating: number;
}

export default function TestimonialsMarquee({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  const duplicatedTestimonials = [...testimonials, ...testimonials];

  return (
    <>
      <style jsx>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .marquee-track {
          animation: marquee 30s linear infinite;
        }

        .marquee-container:hover .marquee-track {
          animation-play-state: paused;
        }

        @media (max-width: 768px) {
          .marquee-track {
            animation-duration: 18s;
          }
        }
      `}</style>

      <section className="w-full">
        {/* Social Proof Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 text-center">
          <div>
            <h3 className="text-3xl font-bold">10,000+</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Students
            </p>
          </div>

          <div>
            <h3 className="text-3xl font-bold">500+</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Educators
            </p>
          </div>

          <div>
            <h3 className="text-3xl font-bold">1M+</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Doubts Solved
            </p>
          </div>

          <div>
            <h3 className="text-3xl font-bold">95%</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Satisfaction Rate
            </p>
          </div>
        </div>

        {/* Testimonial Marquee */}
        <div className="marquee-container overflow-hidden relative">
          <div className="marquee-track flex gap-6 w-max py-2">
            {duplicatedTestimonials.map((testimonial, index) => (
              <TestimonialCard
                key={`${testimonial.id}-${index}`}
                testimonial={testimonial}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <h3 className="text-2xl font-bold mb-3">
            Ready to stop searching through endless chat groups?
          </h3>

          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Join thousands of students getting answers faster with DoubtDesk.
          </p>

          <button className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            Get Started with DoubtDesk →
          </button>
        </div>
      </section>
    </>
  );
}
