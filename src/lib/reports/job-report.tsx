import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { getChecklistForAssetType } from "@/lib/fsm/checklists";
import {
  DEFECT_SEVERITY_LABELS,
  JOB_PRIORITY_LABELS,
  JOB_TYPE_LABELS,
  resolveJobTypeLabel,
} from "@/lib/fsm/labels";
import { formatAssetDisplayName } from "@/lib/fsm/asset-display";
import { formatPartsUsedAndNotes } from "@/lib/reports/inspection-display";
import type {
  AssetType,
  DefectSeverity,
  InspectionResult,
  JobPriority,
  JobType,
} from "@/lib/fsm/types";

/** Service report & certificate PDF for a job. */

export interface JobReportData {
  job: {
    job_number: string;
    job_type: JobType;
    import_source?: string | null;
    service_category?: string | null;
    priority: JobPriority;
    scheduled_date: string;
    description: string | null;
    travel_started_at: string | null;
    checked_in_at: string | null;
    checkin_latitude: number | null;
    checkin_longitude: number | null;
    completed_at: string | null;
    next_service_due_date?: string | null;
  };
  customer: { name: string; contact_person: string | null; email: string | null };
  site: { name: string; address: string };
  technicianName: string;
  inspections: Array<{
    assetCode: string;
    customerAssetNumber: string | null;
    assetType: AssetType;
    sizeCapacity: string | null;
    assetMedium: string | null;
    assetLocation: string | null;
    legacyDescription: string | null;
    result: InspectionResult;
    checklist: Record<string, boolean | string | string[]>;
    requiresRefill: boolean;
    requiresPressureTest: boolean;
    notes: string | null;
  }>;
  defects: Array<{
    assetCode: string;
    defectType: string;
    severity: DefectSeverity;
    description: string;
    recommendedAction: string | null;
    quoteRequired: boolean;
  }>;
  stockUsed: Array<{ name: string; quantity: number }>;
  photoCount: number;
  signature: {
    signerName: string;
    signerTitle: string | null;
    signedAt: string;
    latitude: number | null;
    longitude: number | null;
    imageDataUri: string | null;
  } | null;
}

const RED = "#dc2626";
const ZINC = "#52525b";
const LIGHT = "#a1a1aa";
const BORDER = "#e4e4e7";

const s = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#18181b",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  brandAccent: { color: RED },
  docTitle: { fontSize: 11, color: ZINC, marginTop: 2 },
  jobNum: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  small: { fontSize: 8, color: LIGHT },
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: RED,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: RED,
    marginTop: 14,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  twoCol: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  label: { fontSize: 7.5, color: LIGHT, marginBottom: 1 },
  value: { fontSize: 9.5, marginBottom: 5 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#18181b",
    paddingBottom: 3,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 4,
  },
  th: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: ZINC },
  cell: { fontSize: 8.5 },
  pass: { color: "#059669", fontFamily: "Helvetica-Bold" },
  fail: { color: RED, fontFamily: "Helvetica-Bold" },
  sigImage: { width: 180, height: 70, objectFit: "contain" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
});

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fmtDate = (iso: string | null | undefined) =>
  iso
    ? new Date(`${iso}T12:00:00`).toLocaleDateString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

function failedItems(
  assetType: AssetType,
  checklist: Record<string, boolean | string | string[]>
): string {
  const items = getChecklistForAssetType(assetType);
  const failed = items
    .filter((i) => checklist[i.id] === false)
    .map((i) => i.label);
  return failed.join(", ");
}

export function JobReportDocument({ data }: { data: JobReportData }) {
  const { job, customer, site, technicianName } = data;

  return (
    <Document
      title={`${job.job_number} – Service Report`}
      author="Nova Fire"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.brand}>
              Nova<Text style={s.brandAccent}>Fire</Text>
            </Text>
            <Text style={s.docTitle}>Service Report & Certificate</Text>
          </View>
          <View>
            <Text style={s.jobNum}>{job.job_number}</Text>
            <Text style={[s.small, { textAlign: "right" }]}>
              {job.scheduled_date}
            </Text>
          </View>
        </View>
        <View style={s.divider} />

        {/* Customer & site */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionTitle}>Customer</Text>
            <Text style={s.label}>Name</Text>
            <Text style={s.value}>{customer.name}</Text>
            <Text style={s.label}>Contact</Text>
            <Text style={s.value}>
              {customer.contact_person ?? "—"}
              {customer.email ? `  ·  ${customer.email}` : ""}
            </Text>
          </View>
          <View style={s.col}>
            <Text style={s.sectionTitle}>Site</Text>
            <Text style={s.label}>Name</Text>
            <Text style={s.value}>{site.name}</Text>
            <Text style={s.label}>Address</Text>
            <Text style={s.value}>{site.address}</Text>
          </View>
        </View>

        {/* Job details */}
        <Text style={s.sectionTitle}>Job Details</Text>
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.label}>Type</Text>
            <Text style={s.value}>{resolveJobTypeLabel(job)}</Text>
            <Text style={s.label}>Priority</Text>
            <Text style={s.value}>{JOB_PRIORITY_LABELS[job.priority]}</Text>
            <Text style={s.label}>Technician</Text>
            <Text style={s.value}>{technicianName}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Checked in on site</Text>
            <Text style={s.value}>
              {fmtDateTime(job.checked_in_at)}
              {job.checkin_latitude && job.checkin_longitude
                ? `  (GPS ${job.checkin_latitude.toFixed(5)}, ${job.checkin_longitude.toFixed(5)})`
                : ""}
            </Text>
            <Text style={s.label}>Completed</Text>
            <Text style={s.value}>{fmtDateTime(job.completed_at)}</Text>
            <Text style={s.label}>Next service date</Text>
            <Text style={s.value}>{fmtDate(job.next_service_due_date)}</Text>
            <Text style={s.label}>Photo evidence on file</Text>
            <Text style={s.value}>{data.photoCount} photo(s)</Text>
          </View>
        </View>
        {job.description ? (
          <View>
            <Text style={s.label}>Work description</Text>
            <Text style={s.value}>{job.description}</Text>
          </View>
        ) : null}

        {/* Inspections */}
        <Text style={s.sectionTitle}>
          Asset Inspections ({data.inspections.length})
        </Text>
        {data.inspections.length === 0 ? (
          <Text style={s.cell}>No inspections recorded on this job.</Text>
        ) : (
          <View>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: "20%" }]}>Asset IDs</Text>
              <Text style={[s.th, { width: "24%" }]}>Asset</Text>
              <Text style={[s.th, { width: "10%" }]}>Result</Text>
              <Text style={[s.th, { width: "46%" }]}>Parts used and notes</Text>
            </View>
            {data.inspections.map((i, idx) => {
              const issues = failedItems(i.assetType, i.checklist);
              const extras = formatPartsUsedAndNotes({
                checklist: i.checklist,
                requiresRefill: i.requiresRefill,
                requiresPressureTest: i.requiresPressureTest,
                notes: i.notes,
                failedChecklistSummary: issues || null,
              });
              return (
                <View key={idx} style={s.tableRow} wrap={false}>
                  <Text style={[s.cell, { width: "20%" }]}>
                    {i.assetCode}
                    {i.customerAssetNumber
                      ? `\nCustomer #${i.customerAssetNumber}`
                      : ""}
                  </Text>
                  <Text style={[s.cell, { width: "24%" }]}>
                    {formatAssetDisplayName({
                      asset_type: i.assetType,
                      size_capacity: i.sizeCapacity,
                      customer_asset_number: null,
                      asset_medium: i.assetMedium,
                      legacy_description: i.legacyDescription,
                    })}
                    {i.assetLocation ? `\n${i.assetLocation}` : ""}
                  </Text>
                  <Text
                    style={[
                      s.cell,
                      { width: "10%" },
                      i.result === "pass" ? s.pass : s.fail,
                    ]}
                  >
                    {i.result.toUpperCase()}
                  </Text>
                  <Text style={[s.cell, { width: "46%" }]}>{extras}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Defects */}
        <Text style={s.sectionTitle}>Defects ({data.defects.length})</Text>
        {data.defects.length === 0 ? (
          <Text style={s.cell}>No defects found.</Text>
        ) : (
          <View>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: "14%" }]}>Asset ID</Text>
              <Text style={[s.th, { width: "20%" }]}>Defect</Text>
              <Text style={[s.th, { width: "12%" }]}>Severity</Text>
              <Text style={[s.th, { width: "44%" }]}>Description / Action</Text>
              <Text style={[s.th, { width: "10%" }]}>Quote</Text>
            </View>
            {data.defects.map((d, idx) => (
              <View key={idx} style={s.tableRow} wrap={false}>
                <Text style={[s.cell, { width: "14%" }]}>{d.assetCode}</Text>
                <Text style={[s.cell, { width: "20%" }]}>{d.defectType}</Text>
                <Text style={[s.cell, { width: "12%" }]}>
                  {DEFECT_SEVERITY_LABELS[d.severity]}
                </Text>
                <Text style={[s.cell, { width: "44%" }]}>
                  {d.description}
                  {d.recommendedAction ? `  →  ${d.recommendedAction}` : ""}
                </Text>
                <Text style={[s.cell, { width: "10%" }]}>
                  {d.quoteRequired ? "Yes" : "No"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Stock used */}
        {data.stockUsed.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Materials / Stock Used</Text>
            {data.stockUsed.map((u, idx) => (
              <Text key={idx} style={[s.cell, { marginBottom: 2 }]}>
                {u.quantity} × {u.name}
              </Text>
            ))}
          </View>
        )}

        {/* Sign-off */}
        <Text style={s.sectionTitle}>Customer Sign-Off</Text>
        {data.signature ? (
          <View style={s.twoCol} wrap={false}>
            <View style={s.col}>
              {data.signature.imageDataUri ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={data.signature.imageDataUri} style={s.sigImage} />
              ) : null}
              <View
                style={{
                  borderTopWidth: 0.5,
                  borderTopColor: "#18181b",
                  width: 180,
                  paddingTop: 3,
                }}
              >
                <Text style={s.cell}>
                  {data.signature.signerName}
                  {data.signature.signerTitle
                    ? ` – ${data.signature.signerTitle}`
                    : ""}
                </Text>
              </View>
            </View>
            <View style={s.col}>
              <Text style={s.label}>Signed at</Text>
              <Text style={s.value}>{fmtDateTime(data.signature.signedAt)}</Text>
              {data.signature.latitude && data.signature.longitude ? (
                <View>
                  <Text style={s.label}>GPS location</Text>
                  <Text style={s.value}>
                    {data.signature.latitude.toFixed(5)},{" "}
                    {data.signature.longitude.toFixed(5)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <Text style={s.cell}>Not yet signed off.</Text>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.small}>
            Nova Fire · Fire Protection & Compliance · novafire.co.za
          </Text>
          <Text
            style={s.small}
            render={({ pageNumber, totalPages }) =>
              `Generated ${fmtDateTime(new Date().toISOString())} · Page ${pageNumber}/${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
