export type ComplianceAnswer = "yes" | "no" | "unsure";

export const INDUSTRY_OPTIONS = [
  "Hospitality & Lodges",
  "Commercial Property",
  "Industrial",
  "Retail",
  "Education",
  "Healthcare",
  "Estates & Complexes",
  "Other",
] as const;

export const EMPLOYEE_RANGES = [
  "1–10",
  "11–50",
  "51–200",
  "200+",
] as const;

export const COMPLIANCE_QUESTIONS = [
  {
    id: "extinguishers_on_site",
    question: "Do you have portable fire extinguishers on site?",
    hint: "Required for most commercial and hospitality facilities.",
  },
  {
    id: "extinguishers_serviced",
    question: "Were extinguishers serviced within the last 12 months?",
    hint: "SANS-aligned servicing keeps equipment audit-ready.",
  },
  {
    id: "fixed_equipment_maintained",
    question: "Is fixed fire equipment (hose reels / hydrants) maintained where required?",
    hint: "Applies if your site has fixed installations.",
  },
  {
    id: "risk_assessment",
    question: "Has a fire risk assessment been completed in the last 12 months?",
    hint: "Identifies gaps before an inspector or insurer does.",
  },
  {
    id: "staff_training",
    question: "Have staff received fire safety training in the last 12 months?",
    hint: "Evacuation drills and extinguisher use reduce incident risk.",
  },
  {
    id: "detection_tested",
    question: "Is your fire detection / alarm system tested regularly?",
    hint: "Select “Not applicable” if you have no detection system.",
    allowNa: true,
  },
  {
    id: "evacuation_plan",
    question: "Do you have a documented evacuation plan?",
    hint: "Should be visible to staff and updated when layouts change.",
  },
  {
    id: "records_available",
    question: "Are inspection and service records available for audit?",
    hint: "Documentation is what keeps you operational after an inspection.",
  },
] as const;

export type ComplianceQuestionId = (typeof COMPLIANCE_QUESTIONS)[number]["id"];

const ANSWER_POINTS: Record<ComplianceAnswer, number> = {
  yes: 1,
  unsure: 0.5,
  no: 0,
};

export function calculateComplianceScore(
  answers: Partial<Record<ComplianceQuestionId, ComplianceAnswer | "na">>
): number {
  let earned = 0;
  let possible = 0;

  for (const item of COMPLIANCE_QUESTIONS) {
    const answer = answers[item.id];
    if (!answer) continue;
    if (answer === "na" && "allowNa" in item && item.allowNa) continue;
    possible += 1;
    if (answer === "yes" || answer === "unsure" || answer === "no") {
      earned += ANSWER_POINTS[answer];
    }
  }

  if (possible === 0) return 0;
  return Math.round((earned / possible) * 100);
}

export function complianceBand(score: number): {
  label: string;
  tone: "high" | "medium" | "low";
  summary: string;
} {
  if (score >= 80) {
    return {
      label: "Strong",
      tone: "high",
      summary:
        "Your responses suggest solid baseline compliance. A professional inspection can confirm records and catch minor gaps.",
    };
  }
  if (score >= 55) {
    return {
      label: "Needs attention",
      tone: "medium",
      summary:
        "Several areas may expose you during an audit. We recommend scheduling an on-site compliance assessment soon.",
    };
  }
  return {
    label: "At risk",
    tone: "low",
    summary:
      "Your responses indicate significant compliance exposure. Book a professional inspection to avoid shutdown or liability.",
  };
}
