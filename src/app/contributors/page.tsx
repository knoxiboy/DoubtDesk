import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Github,
  Users,
  GitPullRequest,
  ArrowRight,
} from "lucide-react";
import { GitHubContributor } from "@/types";

async function getContributors() {
  const res = await fetch(
    "https://api.github.com/repos/knoxiboy/DoubtDesk/contributors",
    {
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch contributors");
  }

  return res.json() as Promise<GitHubContributor[]>;
}

const stats = [
  {
    title: "Contributors",
    value: "25+",
    icon: Users,
  },
  {
    title: "Pull Requests",
    value: "100+",
    icon: GitPullRequest,
  },
  {
    title: "Open Source",
    value: "Community Driven",
    icon: Github,
  },
];

export const metadata = {
  title: "Contributors",
  description: "Meet the open-source contributors who build and maintain DoubtDesk.",
};

export default async function ContributorsPage() {
  const contributors = await getContributors();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden transition-colors duration-300">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/20 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-400/10 dark:bg-cyan-500/10 blur-3xl rounded-full" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <section className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 dark:border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Open Source Community
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Meet Our{" "}
            <span className="bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 bg-clip-text text-transparent">
              Contributors
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-slate-600 dark:text-slate-300 text-lg md:text-xl leading-relaxed">
            DoubtDesk is powered by amazing open-source contributors from around
            the world who help improve collaborative AI-powered education.
          </p>
        </section>

        {/* Stats Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-white/5 backdrop-blur-xl text-center hover:border-blue-500/50 dark:hover:border-cyan-400/60 hover:-translate-y-2 hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-cyan-500/20 transition-all duration-300"
              >
                <div className="w-10 h-10 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
                  <Icon className="w-7 h-7 text-blue-500 dark:text-cyan-300" />
                </div>

                <h3 className="text-3xl font-bold mb-2">
                  {stat.title === "Contributors"
                    ? `${contributors.length}+`
                    : stat.value}
                </h3>

                <p className="text-slate-600 dark:text-slate-400">
                  {stat.title}
                </p>
              </div>
            );
          })}
        </section>

        {/* Contributors Grid */}
        <section className="mb-24">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold mb-4">
              Community Contributors
            </h2>

            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              The incredible developers helping DoubtDesk grow through
              open-source collaboration and innovation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {contributors.map((contributor) => (
              <Link
                key={contributor.id}
                href={contributor.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-white/5 backdrop-blur-xl hover:border-blue-500/50 dark:hover:border-cyan-400/60 hover:-translate-y-2 hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-cyan-500/20 transition-all duration-300"
              >
                {/* Glow Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.15),transparent_40%)]" />

                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-300" />

                    <Image
                      src={contributor.avatar_url}
                      alt={contributor.login}
                      width={88}
                      height={88}
                      className="relative rounded-full border-4 border-slate-200 dark:border-slate-700 group-hover:border-blue-500/50 dark:group-hover:border-cyan-400/60 transition-all duration-300"
                    />
                  </div>

                  <h3 className="text-xl font-bold mb-1">
                    {contributor.login}
                  </h3>

                  <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">
                    {contributor.contributions} contributions
                  </p>

                  <div className="inline-flex px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm text-blue-700 dark:text-cyan-300 mb-6">
                    Contributor
                  </div>

                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-medium hover:scale-105 transition-all duration-300">
                    <Github className="w-4 h-4" />
                    View GitHub
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <div className="relative overflow-hidden p-10 rounded-3xl border border-blue-200 dark:border-blue-500/20 bg-gradient-to-br from-blue-100/70 to-cyan-100/70 dark:from-blue-500/10 dark:to-cyan-500/10 backdrop-blur-xl shadow-sm dark:shadow-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.15),transparent_40%)]" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-sm mb-6">
                <Sparkles className="w-4 h-4" />
                Join the Community
              </div>

              <h2 className="text-4xl font-bold mb-5">
                Want to Contribute to DoubtDesk?
              </h2>

              <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed max-w-3xl mx-auto mb-8">
                Help improve collaborative education technology, contribute new
                features, fix bugs, and become part of the growing DoubtDesk
                open-source community.
              </p>

              <Link
                href="https://github.com/knoxiboy/DoubtDesk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:scale-105 transition-all duration-300 font-semibold text-white shadow-lg shadow-blue-500/20"
              >
                Start Contributing
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}