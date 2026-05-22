import type { Metadata } from "next";
import FaqClient from "./FaqClient";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Find answers to common DoubtDesk questions about classrooms, AI solving, moderation, analytics, and platform usage.",
};

export default function FAQPage() {
  return <FaqClient />;
}
