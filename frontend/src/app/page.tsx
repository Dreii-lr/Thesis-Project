import type { Metadata } from "next";
import LandingPage from "@/src/components/landing-page/LandingPage";

export const metadata: Metadata = {
  title: "ALS Santa Cruz | Enrollment & Learner Portal",
  description: "Hindi huli ang lahat para magtapos. Kilalanin ang ALS Santa Cruz, alamin ang enrollment requirements, at buksan ang student at teacher portal.",
};

export default function HomePage() {
  return <LandingPage />;
}
