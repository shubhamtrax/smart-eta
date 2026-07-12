import { useLoaderData, Form, useActionData } from "react-router";
import { useState } from "react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  let settings = await prisma.widgetSettings.findUnique({
    where: { shop: session.shop },
  });

  if (!settings) {
    settings = await prisma.widgetSettings.create({
      data: { shop: session.shop },
    });
  }

  return { settings };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const heading = (formData.get("heading") || "").trim() || "Check Delivery Availability";
  const description = (formData.get("description") || "").trim() || "Enter your pincode to see delivery estimate.";
  const buttonText = (formData.get("buttonText") || "").trim() || "Check";
  const accentColor = formData.get("accentColor") || "#111827";
  const cornerRadius = parseInt(formData.get("cornerRadius") || "14", 10);

  await prisma.widgetSettings.upsert({
    where: { shop: session.shop },
    update: { heading, description, buttonText, accentColor, cornerRadius },
    create: {
      shop: session.shop,
      heading,
      description,
      buttonText,
      accentColor,
      cornerRadius,
    },
  });

  return { success: true };
}

export default function Widget() {
  const { settings } = useLoaderData();
  const actionData = useActionData();

  const [heading, setHeading] = useState(settings.heading);
  const [description, setDescription] = useState(settings.description);
  const [buttonText, setButtonText] = useState(settings.buttonText);
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [cornerRadius, setCornerRadius] = useState(settings.cornerRadius);

  return (
    <div className="smarteta-page">

      <div className="smarteta-page-header">
        <div>
          <h1 className="smarteta-title">Widget</h1>
          <p className="smarteta-subtitle">
            Customize the text and look of the delivery checker on your storefront —
            changes apply everywhere the widget is used, no need to edit your theme.
          </p>
        </div>
      </div>

      {actionData?.success && (
        <div className="smarteta-card smarteta-alert-success" style={{ marginBottom: "20px" }}>
          Widget settings saved. Changes appear on your storefront within a few seconds.
        </div>
      )}

      <div className="smarteta-grid">

        <div className="smarteta-card">

          <h2>Customize</h2>

          <Form method="post">

            <div className="smarteta-form-row">

              <div className="smarteta-form-group">
                <label>Heading</label>
                <input
                  type="text"
                  name="heading"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  className="smarteta-input"
                />
              </div>

              <div className="smarteta-form-group">
                <label>Description</label>
                <input
                  type="text"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="smarteta-input"
                />
              </div>

              <div className="smarteta-form-group">
                <label>Button Text</label>
                <input
                  type="text"
                  name="buttonText"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  className="smarteta-input"
                />
              </div>

              <div className="smarteta-form-group">
                <label>Accent Color</label>
                <input
                  type="color"
                  name="accentColor"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  style={{ width: "100%", height: "46px", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer" }}
                />
              </div>

              <div className="smarteta-form-group">
                <label>Corner Radius ({cornerRadius}px)</label>
                <input
                  type="range"
                  name="cornerRadius"
                  min="0"
                  max="24"
                  step="2"
                  value={cornerRadius}
                  onChange={(e) => setCornerRadius(Number(e.target.value))}
                  style={{ width: "100%", marginTop: "12px" }}
                />
              </div>

            </div>

            <div style={{ display: "flex", marginTop: "20px" }}>
              <button type="submit" className="smarteta-btn">
                Save Widget Settings
              </button>
            </div>

          </Form>

        </div>

        <div className="smarteta-card">

          <h2>Live Preview</h2>
          <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "-8px", marginBottom: "20px" }}>
            An approximation — actual storefront styling may vary slightly by theme.
          </p>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: `${cornerRadius}px`,
              padding: "24px",
              background: "#fff",
              boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.06)",
              fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
            }}
          >

            <div style={{ display: "flex", gap: "14px", marginBottom: "18px" }}>

              <div
                style={{
                  flexShrink: 0,
                  width: "38px",
                  height: "38px",
                  borderRadius: "999px",
                  background: `${accentColor}20`,
                  color: accentColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                📍
              </div>

              <div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>{heading}</div>
                <div style={{ fontSize: "13px", color: "#6b7280" }}>{description}</div>
              </div>

            </div>

            <div style={{ display: "flex", gap: "10px" }}>

              <div
                style={{
                  flex: 1,
                  height: "46px",
                  border: "1px solid #d1d5db",
                  borderRadius: `${cornerRadius * 0.6}px`,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                  color: "#9ca3af",
                  fontSize: "14px",
                }}
              >
                Enter 6-digit pincode
              </div>

              <div
                style={{
                  minWidth: "96px",
                  height: "46px",
                  background: accentColor,
                  color: "#fff",
                  borderRadius: `${cornerRadius * 0.6}px`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {buttonText}
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
