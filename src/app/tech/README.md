# Technician Backend (firefiretech.novafire.co.za)

Subdomain-ready structure for technician forms. Deploy to `firetech.novafire.co.za` or serve via same app with middleware.

## Forms
- Jobcard submission
- Cylinder refill log
- Vehicle inspection checklist
- Equipment replacement request

## Setup
1. **Auth**: Add role-based auth (technicians only). Replace `isAuthenticated` placeholder in `page.tsx`.
2. **Submission endpoint**: Set `NEXT_PUBLIC_TECH_API_URL` for custom API, or use Zoho webhooks.
3. **Subdomain**: Configure DNS and hosting (e.g. Vercel) to route `firetech.novafire.co.za` to this route.
