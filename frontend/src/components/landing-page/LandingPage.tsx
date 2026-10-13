import LandingHeader from "./LandingHeader";
import HeroSection from "./HeroSection";
import { AboutSystemSection, EnrollmentGuideSection, FeaturesSection, ProgramPathsSection } from "./InformationSections";
import LearningCenterDirectory from "./LearningCenterDirectory";
import FrequentlyAskedQuestions from "./FrequentlyAskedQuestions";
import LandingFooter, { EnrollmentCallToAction } from "./LandingFooter";

export default function LandingPage() {
  return (
    <div id="top" lang="fil" className="min-h-screen bg-[#f6f8fc] text-base leading-[1.7] text-[#17265b] [&_section[id]]:scroll-mt-36 max-sm:[&_section[id]]:scroll-mt-32 [&_:is(a,button,select,summary)]:focus-visible:outline-3 [&_:is(a,button,select,summary)]:focus-visible:outline-offset-4 [&_:is(a,button,select,summary)]:focus-visible:outline-amber-700">
      <a href="#main-content" className="fixed left-3 top-3 z-50 -translate-y-[180%] rounded-lg bg-white px-5 py-3.5 text-[#17265b] focus:translate-y-0">Lumaktaw sa pangunahing nilalaman</a>
      <LandingHeader />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <HeroSection />
        <AboutSystemSection />
        <FeaturesSection />
        <ProgramPathsSection />
        <EnrollmentGuideSection />
        <LearningCenterDirectory />
        <FrequentlyAskedQuestions />
        <EnrollmentCallToAction />
      </main>
      <LandingFooter />
    </div>
  );
}
