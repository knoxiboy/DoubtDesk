/* testimonial marquee*/
"use client";

import TestimonialCard from "./TestimonialCard";

interface Testimonial {
  name: string;
  role: string;
  text: string;
  rating?: number;
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

      <div className="marquee-container overflow-hidden relative">
        <div className="marquee-track flex gap-6 w-max">
          {duplicatedTestimonials.map((testimonial, index) => (
            <TestimonialCard
              key={`${testimonial.name}-${index}`}
              testimonial={testimonial}
            />
          ))}
        </div>
      </div>
    </>
  );
}
