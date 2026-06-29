import { TechLayout } from "../components/layout/TechLayout";
import { BobBeforeAfter } from "../components/bob/BobBeforeAfter";

export function TechBob() {
  return (
    <TechLayout
      accent="purple"
      name="IBM BOB"
      tagline="Product Design Intelligence"
      explanation="IBM BOB served as the design and product refinement assistant during the production polishing phase. Its conversational design patterns guided the transformation of Kronos from a functional prototype into an enterprise-grade SaaS experience with clear information architecture, consistent visual hierarchy, and polished interaction design."
      whySection="The Kronos frontend began as a functional dark-theme interface with minimal structure. BOB was consulted to review the product against enterprise UX standards. Its recommendations shaped the transition to a light theme, the introduction of gradient-wrapped content sections, the two-row CommandHeader layout, the storytelling narrative on the landing page, and the green-amber-red status system. Every page, component, and interaction was refined through BOB's UX lens — not by adding features, but by clarifying what already existed."
      integrationSection="BOB's integration was consultative rather than code-level. During the production polishing phase, each page and component was presented to BOB for UX review. BOB assessed visual hierarchy, layout consistency, color contrast, labeling clarity, and responsive behavior. Recommendations were implemented iteratively — the Landing page storytelling flow, the CommandHeader metrics row, the consistent card pattern with gradient backgrounds, and the bracket-text coloring system all originated from BOB-driven design reviews. The result is a cohesive interface where every visual element serves the analyst's decision-making process."
      realUsageContent={<BobBeforeAfter />}
      realUsageCaption="Side-by-side comparison of the landing page hero before and after BOB-driven UX refinement."
      realUsageExplanation="The before panel shows the original dark-theme hero with flat styling, minimal hierarchy, and generic CTAs. The after panel demonstrates the current production interface — light theme, green brand accent, gradient backgrounds, styled buttons with hover states, and product-oriented labeling. Every visible improvement in the current UI reflects a BOB recommendation implemented during the polishing phase."
      contributions={[
        "Product design review that drove the dark-to-light theme transition and established the green brand identity across all five pages",
        "Information architecture recommendations that produced the storytelling narrative flow on the landing page (Observe → Understand → Inspect → Trust)",
        "UX refinement of the CommandHeader — separating live metrics from navigation into a clean two-row layout with active-state indicators",
        "Messaging guidance that renamed 'War Room' to 'Live Intelligence' and aligned all page labels with product-oriented, user-first language",
        "Visual hierarchy improvements including gradient section wrappers, consistent card patterns, bracket-text coloring, and the unified status badge system",
        "Production readiness polish — hover transitions, focus-visible ring styling, responsive grid behavior, and consistent spacing across all viewports",
      ]}
    />
  );
}
