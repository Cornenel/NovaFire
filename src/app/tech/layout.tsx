/**
 * Technician Backend – Subdomain Ready
 *
 * For firetech.novafire.co.za:
 * - Deploy this route group to the subdomain, or
 * - Use Next.js middleware to route by hostname
 *
 * AUTH: Placeholder for role-based authentication (technicians only).
 * SUBMISSION ENDPOINT: Configure via env (NEXT_PUBLIC_TECH_API_URL or Zoho webhooks).
 */

export const metadata = {
  title: "Technician Portal | Nova Fire",
  description: "Jobcard submission, cylinder refill logs, vehicle inspection, equipment requests.",
};

export default function TechLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
