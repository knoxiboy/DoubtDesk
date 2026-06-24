import {
  Activity,
  Clipboard,
  LayoutGrid,
  Map,
  MessageCircle,
  Users,
} from "lucide-react";

export type LandingFeature = {
  slug: string;
  title: string;
  description: string;
  // Stored as a React component type (lucide icons)
  icon: React.ComponentType<{ className?: string }>;
};


export type LandingHowItWorksStep = {
  title: string;
  description: string;
};

export type LandingTestimonial = {
  id: string;
  name: string;
  role: string;
  institution: string;
  avatarUrl: string;
  quote: string;
  rating: number;
};

export const features: LandingFeature[] = [
  {
    slug: "collaborative-discussions",
    title: "Real-time collaborative discussions",
    description:
      "Share questions, answers, and classroom updates instantly across study groups.",
    icon: MessageCircle,
  },
  {
    slug: "classroom-management",
    title: "Smart classroom management",
    description:
      "Organize learning spaces, schedules, and teacher workflows with ease.",
    icon: LayoutGrid,
  },
  {
    slug: "notes-resource-sharing",
    title: "Notes and resource sharing",
    description:
      "Keep study materials, highlights, and shared guides organized in one hub.",
    icon: Clipboard,
  },
  {
    slug: "learning-roadmaps",
    title: "Learning roadmaps and guidance",
    description:
      "Follow curated study paths that keep learners focused on milestones.",
    icon: Map,
  },
  {
    slug: "ai-powered-doubt-solving",
    title: "AI-powered doubt solving",
    description:
      "Get instant, context-aware answers to questions with smart AI support.",
    icon: Activity,
  },
  {
    slug: "study-collaboration",
    title: "Organized study collaboration",
    description:
      "Coordinate projects, peer review, and group work with clear tools and structure.",
    icon: Users,
  },
];

export const howItWorks: LandingHowItWorksStep[] = [
  {
    title: "Join or create a classroom",
    description: "Teachers set up rooms, students join using invite codes.",
  },
  {
    title: "Ask doubts instantly",
    description: "Post questions using text or image and get AI + peer help.",
  },
  {
    title: "Get clear answers & insights",
    description:
      "AI explanations, teacher guidance, and analytics all in one place.",
  },
];

export const testimonials: LandingTestimonial[] = [
  {
    id: "1",
    name: "Aarav Sharma",
    role: "B.Tech Student",
    institution: "DTU",
    avatarUrl: "/avatars/arav.png",
    quote:
      "DoubtDesk helped me resolve doubts 3x faster during exams. The AI explanations are incredibly clear.",
    rating: 5,
  },
  {
    id: "2",
    name: "Neha Verma",
    role: "CS Student",
    institution: "Punjab University",
    avatarUrl: "/avatars/neha.png",
    quote:
      "Everything is organized in one place. No more scrolling through endless chat groups.",
    rating: 5,
  },
  {
    id: "3",
    name: "Rohit Mehta",
    role: "Teaching Assistant",
    institution: "NIT Jalandhar",
    avatarUrl: "/avatars/rohit.png",
    quote:
      "Analytics help me quickly identify where students struggle the most.",
    rating: 5,
  },
  {
    id: "4",
    name: "Priya Singh",
    role: "MBA Student",
    institution: "IIM Indore",
    avatarUrl: "/avatars/priya.png",
    quote:
      "My exam preparation became much more efficient after switching to DoubtDesk.",
    rating: 5,
  },
  {
    id: "5",
    name: "Karan Gupta",
    role: "Engineering Student",
    institution: "PEC Chandigarh",
    avatarUrl: "/avatars/karan.png",
    quote:
      "Instant answers saved hours of searching through notes and forums.",
    rating: 5,
  },
  {
    id: "6",
    name: "Ananya Kapoor",
    role: "Professor",
    institution: "Chitkara University",
    avatarUrl: "/avatars/ananya.png",
    quote:
      "Managing classroom discussions has become significantly easier.",
    rating: 5,
  },
];

