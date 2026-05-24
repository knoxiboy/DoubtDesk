import {
  FileText,
  Shield,
  UserCheck,
  Ban,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

export const metadata = {
  title: "Terms of Service",
  description: "Read the rules, responsibilities, and conditions for using DoubtDesk.",
};

export default function TermsOfServicePage() {
  const sections = [
    {
      icon: UserCheck,
      title: "User Responsibilities",
      content:
        "By using DoubtDesk, users agree to interact respectfully, provide accurate information, and avoid misuse of the platform. Users are responsible for maintaining the security of their accounts and activities performed under them.",
    },
    {
      icon: Shield,
      title: "Acceptable Use",
      content:
        "Users must not engage in harmful, abusive, illegal, or disruptive behavior while using the platform. Any activity that compromises security, violates laws, or negatively impacts other users may result in account restrictions or removal.",
    },
    {
      icon: FileText,
      title: "Content Ownership",
      content:
        "Users retain ownership of the content they create or upload. However, by using DoubtDesk, users grant the platform permission to display and process submitted content for educational and platform-related purposes.",
    },
    {
      icon: Ban,
      title: "Account Suspension & Termination",
      content:
        "DoubtDesk reserves the right to suspend or terminate accounts that violate platform policies, misuse services, or engage in activities that threaten the safety and integrity of the community.",
    },
    {
      icon: AlertTriangle,
      title: "Limitation of Liability",
      content:
        "DoubtDesk is provided on an 'as-is' basis. While we strive for reliability and accuracy, we do not guarantee uninterrupted access or error-free functionality. Users are responsible for evaluating the suitability of the platform for their needs.",
    },
    {
      icon: RefreshCw,
      title: "Policy Updates",
      content:
        "These Terms of Service may be updated periodically to reflect platform improvements, legal requirements, or policy changes. Continued use of DoubtDesk after updates constitutes acceptance of the revised terms.",
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
            <FileText className="h-4 w-4" />
            Platform Guidelines & Policies
          </div>

          <h1 className="mb-6 bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-5xl font-black tracking-tight text-transparent md:text-6xl">
            Terms of Service
          </h1>

          <p className="mx-auto max-w-3xl text-lg leading-8 text-slate-300">
            These Terms of Service outline the rules, responsibilities, and
            conditions for using DoubtDesk. By accessing or using the platform,
            you agree to comply with these terms and community guidelines.
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
            Fair Usage & Community Safety
          </h3>

          <p className="mx-auto max-w-2xl leading-7 text-slate-300">
            Our goal is to maintain a respectful, secure, and collaborative
            learning environment for every student and contributor on
            DoubtDesk.
          </p>
        </div>
      </div>
    </div>
  );
}