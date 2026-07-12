import { useLoaderData, Form, useActionData } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "India Standard Time (Kolkata)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (Dubai)" },
  { value: "Asia/Singapore", label: "Singapore Time" },
  { value: "Europe/London", label: "UK Time (London)" },
  { value: "America/New_York", label: "US Eastern Time (New York)" },
  { value: "America/Los_Angeles", label: "US Pacific Time (Los Angeles)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (Sydney)" },
  { value: "UTC", label: "UTC" },
];

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  let settings = await prisma.deliverySettings.findUnique({
    where: { shop: session.shop },
  });

  if (!settings) {
    settings = await prisma.deliverySettings.create({
      data: { shop: session.shop },
    });
  }

  return { settings };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();

  const dateFormat = formData.get("dateFormat") || "long";
  const timezone = formData.get("timezone") || "Asia/Kolkata";

  const rawDefaultDays = formData.get("defaultDeliveryDays");
  const defaultDeliveryDays =
    rawDefaultDays && rawDefaultDays.trim() !== ""
      ? parseInt(rawDefaultDays, 10)
      : null;

  const defaultCodAvailable = formData.get("defaultCodAvailable") === "on";

  await prisma.deliverySettings.upsert({
    where: { shop: session.shop },
    update: {
      dateFormat,
      timezone,
      defaultDeliveryDays,
      defaultCodAvailable,
    },
    create: {
      shop: session.shop,
      dateFormat,
      timezone,
      defaultDeliveryDays,
      defaultCodAvailable,
    },
  });

  return { success: true };
}

export default function Settings() {
  const { settings } = useLoaderData();
  const actionData = useActionData();

  return (
    <div className="smarteta-page">

      <div className="smarteta-page-header">
        <div>
          <h1 className="smarteta-title">Settings</h1>
          <p className="smarteta-subtitle">
            Control how dates are displayed and what customers see when their pincode isn't in your list.
          </p>
        </div>
      </div>

      {actionData?.success && (
        <div className="smarteta-card smarteta-alert-success" style={{ marginBottom: "20px" }}>
          Settings saved successfully.
        </div>
      )}

      <div className="smarteta-grid">

        <div className="smarteta-card">

          <h2>Date &amp; Time</h2>

          <Form method="post">

            <div className="smarteta-form-row">

              <div className="smarteta-form-group">
                <label>Date Format</label>
                <select
                  name="dateFormat"
                  defaultValue={settings.dateFormat}
                  className="smarteta-select"
                >
                  <option value="long">Tuesday, 14 July</option>
                  <option value="short">Tue, 14 Jul</option>
                  <option value="numeric">14/07/2026</option>
                </select>
              </div>

              <div className="smarteta-form-group">
                <label>Store Timezone</label>
                <select
                  name="timezone"
                  defaultValue={settings.timezone}
                  className="smarteta-select"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "14px" }}>
              Timezone determines when your Cutoff Time (set under Delivery Rules) actually applies —
              important if your store server and customers aren't in the same region.
            </p>

            <div style={{ display: "flex", marginTop: "20px" }}>
              <button type="submit" className="smarteta-btn">
                Save Settings
              </button>
            </div>

          </Form>

        </div>

        <div className="smarteta-card">

          <h2>Default ETA</h2>
          <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "-12px", marginBottom: "20px" }}>
            Shown when a customer enters a pincode you haven't added under Pincode Settings — instead of
            telling them delivery isn't available, they'll see a general estimate. Leave delivery days
            blank to keep showing "not available" for unmatched pincodes.
          </p>

          <Form method="post">

            <div className="smarteta-form-row">

              <div className="smarteta-form-group">
                <label>Default Delivery Days</label>
                <input
                  type="number"
                  name="defaultDeliveryDays"
                  min="0"
                  placeholder="e.g. 5"
                  defaultValue={settings.defaultDeliveryDays ?? ""}
                  className="smarteta-input"
                />
              </div>

              <div className="smarteta-form-group">
                <label>Default COD Availability</label>
                <div style={{ height: "46px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    name="defaultCodAvailable"
                    defaultChecked={settings.defaultCodAvailable}
                  />
                  COD available by default
                </div>
              </div>

            </div>

            <div style={{ display: "flex", marginTop: "20px" }}>
              <button type="submit" className="smarteta-btn">
                Save Default ETA
              </button>
            </div>

          </Form>

        </div>

      </div>

    </div>
  );
}
