import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
}

export default function SetupHelp() {
  const { shop } = useLoaderData();
  const themeEditorUrl = `https://${shop}/admin/themes/current/editor?template=product`;

  return (
    <div className="smarteta-page">

      <div className="smarteta-page-header">
        <div>
          <h1 className="smarteta-title">Setup &amp; Help</h1>
          <p className="smarteta-subtitle">
            Add the delivery checker widget to your product pages, and troubleshoot common issues.
          </p>
        </div>
      </div>

      <div className="smarteta-grid">

        <div className="smarteta-card">

          <h2>Theme Installation</h2>
          <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "-8px", marginBottom: "20px" }}>
            Add the SmartETA app block to your product page template in the Shopify theme editor.
          </p>

          <ol style={{ paddingLeft: "20px", lineHeight: 1.9, fontSize: "14px" }}>
            <li>Click <strong>Open theme editor</strong> below — it opens your product template directly</li>
            <li>In the left sidebar, click <strong>Add block</strong>, then select <strong>Apps</strong></li>
            <li>Find <strong>SmartETA</strong> in the list and click to add it</li>
            <li>Drag it to your preferred position — below the price or above the Add to Cart button works well — then click <strong>Save</strong></li>
          </ol>

          <div style={{ marginTop: "20px" }}>
            <a
              href={themeEditorUrl}
              target="_top"
              className="smarteta-btn"
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              Open Theme Editor
            </a>
          </div>

          <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "16px" }}>
            Can't find the app block? Make sure SmartETA is installed and refresh the theme editor.
          </p>

        </div>

        <div className="smarteta-card">

          <h2>Need help?</h2>
          <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "-8px", marginBottom: "20px" }}>
            If you run into any issues during setup, here are a few common fixes — or reach out and we'll help you get started.
          </p>

          <ul style={{ paddingLeft: "20px", lineHeight: 1.9, fontSize: "14px" }}>
            <li><strong>Configuration not saving:</strong> Reload the page and try again</li>
            <li><strong>App block missing in theme editor:</strong> Reinstall the app and refresh</li>
            <li><strong>No delivery estimates showing:</strong> Verify a pincode rule exists for the pincode you're testing, under Pincode Settings</li>
            <li><strong>Wrong delivery date:</strong> Check your Processing Days, Cutoff Time, and Holidays under Delivery Rules</li>
          </ul>

          <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />

          <p style={{ fontSize: "14px", marginBottom: "16px" }}>
            Still stuck? Contact us and include any error messages you're seeing.
          </p>

          <a
            href="mailto:support@digitaltrax.in"
            className="smarteta-btn"
            style={{ textDecoration: "none", display: "inline-block" }}
          >
            Contact Support
          </a>

        </div>

      </div>

    </div>
  );
}
