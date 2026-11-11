# Nova Fire Ops API v1 — Customers, Sites, Assets

Secure HTTP API to read and update customer master data, site information, and site-specific equipment/devices (assets).

## Auth (required)

One of:

1. **Ops API key** (recommended for integrations)
   - Header: `x-api-key: <secret>` (or `x-novafire-api-key`)
   - Env: `NOVAFIRE_OPS_API_KEY` (Production/Preview on Vercel)
   - Uses the service-role client server-side; never expose this key in browsers

2. **Admin user**
   - Signed-in admin session cookie, or
   - `Authorization: Bearer <supabase_access_token>`
   - Profile must be `role=admin` and `is_active=true`

## Base URL

`https://www.novafire.co.za/api/v1`

## Endpoints

### Customers

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/customers?q=&limit=&offset=` | List / search |
| GET | `/customers/:id` | Fetch one |
| PATCH | `/customers/:id` | Update fields |

Updatable fields: `name`, `trading_name`, `contact_person`, `phone`, `email`, `vat_number`, `registration_number`, `billing_address`, `physical_address`, `notes`, `status` (`active`\|`inactive`), `is_sla_client`.

Duplicate name/email/phone matches return **409** unless `confirm_duplicates: true`.

### Sites

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/sites?customer_id=&limit=&offset=` | List (optionally by customer) |
| GET | `/sites/:id` | Fetch one |
| PATCH | `/sites/:id` | Update fields |

Updatable fields: `customer_id`, `name`, `address`, `latitude`, `longitude`, `contact_person`, `contact_phone`, `access_notes`.

### Assets (equipment / devices)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/assets?site_id=&customer_id=&limit=&offset=` | List by site or customer |
| GET | `/assets/:id` | Fetch one |
| PATCH | `/assets/:id` | Update fields |

Updatable fields: `site_id`, `asset_type`, `asset_medium`, `size_capacity`, `customer_asset_number`, `serial_number`, `location_description`, service/test dates (`YYYY-MM-DD`), `status`, `notes`.

**Not updatable via API:** `asset_code`, `qr_token` (stable identifiers).

Fire extinguishers still require `asset_medium`, `size_capacity`, and `location_description`.

## Examples

```bash
# Update customer
curl -X PATCH "https://www.novafire.co.za/api/v1/customers/<uuid>" \
  -H "x-api-key: $NOVAFIRE_OPS_API_KEY" \
  -H "content-type: application/json" \
  -d '{"phone":"0662700293","physical_address":"123 Main Rd"}'

# Update site
curl -X PATCH "https://www.novafire.co.za/api/v1/sites/<uuid>" \
  -H "x-api-key: $NOVAFIRE_OPS_API_KEY" \
  -H "content-type: application/json" \
  -d '{"access_notes":"Gate code 4521. Report to reception."}'

# Update equipment on a site
curl -X PATCH "https://www.novafire.co.za/api/v1/assets/<uuid>" \
  -H "x-api-key: $NOVAFIRE_OPS_API_KEY" \
  -H "content-type: application/json" \
  -d '{"location_description":"Kitchen, left of exit","next_service_date":"2027-03-01"}'

# List devices for a site
curl "https://www.novafire.co.za/api/v1/assets?site_id=<uuid>" \
  -H "x-api-key: $NOVAFIRE_OPS_API_KEY"
```

## Setup checklist

1. Restore/active Supabase project
2. Confirm Vercel `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Add `NOVAFIRE_OPS_API_KEY` (long random secret) for Production + Preview
4. Redeploy
5. Call PATCH endpoints with the key

## Notes

- Zoho Books remains authoritative for financial customer/commercial records. This API updates **operational** Nova Fire records.
- Customer PATCH still writes `customer_update_history` via the existing DB trigger when using a user session (`auth.uid()`). API-key updates may log `updated_by` as null.
- Do not put the ops API key in frontend code or public repos.
