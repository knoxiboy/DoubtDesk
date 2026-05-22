import type { Metadata } from "next";

import FAQContent from "./FaqContent";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Find answers to common DoubtDesk questions about AI solving, classrooms, authentication, moderation, analytics, and platform usage.",
};

export default function FAQPage() {
  return <FAQContent />;
}
