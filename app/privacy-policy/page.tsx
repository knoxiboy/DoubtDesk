import {
  ShieldCheck,
  Database,
  Cookie,
  Lock,
  Globe,
  Mail,
} from "lucide-react";

export const metadata = {
  title: "Privacy Policy",
  description: "Understand how DoubtDesk collects, stores, and protects your data.",
};

export default function PrivacyPolicyPage() {
  const sections = [
    {
      icon: ShieldCheck,
      title: "Information We Collect",
      content:
        "We collect basic account information such as your name, email address, authentication details, and profile information to provide a personalized and secure experience across DoubtDesk.",
    },
    {
      icon: Database,
      title: "How We Use Your Data",
      content:
        "Your information is used to improve platform functionality, enhance user experience, maintain account security, and provide personalized support and recommendations within the platform.",
    },
    {
      icon: Cookie,
      title: "Cookies & Authentication",
      content:
        "DoubtDesk may use cookies, authentication tokens, and session storage to securely maintain user sessions, remember preferences, and improve website performance.",
    },
    {
      icon: Globe,
      title: "Third-Party Services",
      content:
        "We may integrate trusted third-party services such as authentication providers, analytics tools, and cloud infrastructure services to improve reliability and functionality.",
    },
    {
      icon: Lock,
      title: "Data Protection & Security",
      content:
        "We prioritize user privacy and implement appropriate technical and organizational measures to protect your personal information from unauthorized access or misuse.",
    },
    {
      icon: Mail,
      title: "Contact & Policy Updates",
      content:
        "This Privacy Policy may be updated periodically as the platform evolves. Users are encouraged to review this page regularly. For any privacy-related concerns, please contact the DoubtDesk team.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">

      {/* Background Glow Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">

        <div className="absolute top-0 left-0 h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-20">

        {/* Hero Section */}
        <div className="mb-16 text-center">

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4" />
            Privacy & Transparency
          </div>

          <h1 className="mb-6 bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-5xl font-black tracking-tight text-transparent md:text-6xl">
            Privacy Policy
          </h1>

          <p className="mx-auto max-w-3xl text-lg leading-8 text-slate-300">
            At DoubtDesk, protecting user privacy and maintaining transparency
            is a priority. This page explains how your data is collected,
            stored, and used while interacting with the platform.
          </p>

          <div className="mt-6 text-sm text-slate-400">
            Last updated: May 2026
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">

          {sections.map((section, index) => {
            const Icon = section.icon;

            return (
              <div
                key={index}
                className="
                  group
                  relative
                  overflow-hidden

                  rounded-3xl

                  border
                  border-white/10

                  bg-white/[0.03]

                  p-8

                  backdrop-blur-xl

                  transition-all
                  duration-300

                  hover:border-blue-500/30
                  hover:bg-white/[0.05]
                "
              >

                {/* Glow */}
                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-indigo-500/5" />

                <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-start">

                  {/* Icon */}
                  <div
                    className="
                      flex
                      h-14
                      w-14
                      items-center
                      justify-center

                      rounded-2xl

                      bg-gradient-to-br
                      from-blue-500/20
                      to-cyan-500/20

                      border
                      border-blue-500/10

                      shadow-lg
                      shadow-blue-500/10
                    "
                  >
                    <Icon className="h-6 w-6 text-blue-300" />
                  </div>

                  {/* Text */}
                  <div className="flex-1">

                    <h2 className="mb-3 text-2xl font-bold text-white">
                      {section.title}
                    </h2>

                    <p className="leading-8 text-slate-300">
                      {section.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Note */}
        <div className="mt-16 rounded-3xl border border-blue-500/10 bg-blue-500/[0.03] p-8 text-center backdrop-blur-xl">

          <h3 className="mb-3 text-2xl font-bold text-white">
            Your Privacy Matters
          </h3>

          <p className="mx-auto max-w-2xl leading-7 text-slate-300">
            DoubtDesk is committed to maintaining a safe, transparent, and
            secure environment for all students and contributors using the
            platform.
          </p>
        </div>
      </div>
    </div>
  );
}