export async function loader() {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// Plain HTML response, deliberately outside the embedded-admin layout —
// this needs to load standalone since it's a public URL Shopify's App
// Store review team and merchants will visit directly, not through the
// Shopify admin iframe.
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SmartETA — Privacy Policy</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      max-width: 760px;
      margin: 0 auto;
      padding: 48px 24px;
      color: #111827;
      line-height: 1.6;
    }
    h1 { font-size: 28px; margin-bottom: 4px; }
    .updated { color: #6b7280; font-size: 14px; margin-bottom: 32px; }
    h2 { font-size: 19px; margin-top: 36px; }
    ul { padding-left: 20px; }
    a { color: #2563eb; }
  </style>
</head>
<body>

<h1>SmartETA Privacy Policy</h1>
<p class="updated">Last updated: July 19, 2026</p>

<p>This Privacy Policy describes how SmartETA ("the App," "we," "us") collects, uses, and handles information when a merchant installs the App on their Shopify store, and when a merchant's customers interact with the App's storefront widget.</p>

<h2>Information We Collect</h2>

<p><strong>From merchants (store owners):</strong><br>
When you install SmartETA, we access and store the following, scoped to your store:</p>
<ul>
  <li>Your store's <code>.myshopify.com</code> domain</li>
  <li>Delivery configuration you set: pincode rules, processing/shipping days, cutoff times, holiday dates, product/collection/vendor/tag delivery adjustments</li>
  <li>Widget customization settings (text, colors) you configure</li>
  <li>Aggregate usage analytics: which pincodes were searched on your storefront widget, and whether delivery was available for them</li>
</ul>

<p><strong>From your customers (storefront visitors):</strong><br>
The App does <strong>not</strong> collect or store any customer-identifying information. Specifically, we do not collect or store customer names, email addresses, phone numbers, accounts, order history, or any data that identifies an individual shopper.</p>

<p>When a customer uses the delivery-checker widget, we log only the pincode they searched and whether delivery was available — this is stored against your store, not against any individual customer, and cannot be used to identify who searched it.</p>

<h2>How We Use Information</h2>
<p>We use the information above solely to operate the App's core functionality, provide you with analytics about widget usage on your store, and provide customer support when you contact us. We do not sell, rent, or share merchant or customer data with third parties for marketing purposes.</p>

<h2>Data Retention and Deletion</h2>
<ul>
  <li>Your store's configuration data is retained for as long as the App remains installed on your store.</li>
  <li>If you uninstall the App, we retain your data for a limited grace period in case you reinstall, after which it is permanently deleted in accordance with Shopify's data protection requirements.</li>
  <li>You may request deletion of your store's data at any time by contacting us at <a href="mailto:support@digitaltrax.in">support@digitaltrax.in</a>.</li>
</ul>

<h2>GDPR Compliance</h2>
<p>SmartETA is subscribed to Shopify's mandatory compliance webhooks (<code>customers/data_request</code>, <code>customers/redact</code>, <code>shop/redact</code>). Because the App does not store customer-identifying data, customer data requests and redaction requests have no app-specific data to act on beyond what Shopify itself holds. Shop-level data is fully erased upon confirmed uninstallation per Shopify's data retention policy.</p>

<h2>Third-Party Services</h2>
<p>SmartETA is hosted on Render and uses a managed PostgreSQL database to store the data described above. These providers act as data processors on our behalf and are bound by their own security and privacy commitments.</p>

<h2>Changes to This Policy</h2>
<p>We may update this Privacy Policy from time to time. Material changes will be reflected by updating the "Last updated" date above.</p>

<h2>Contact Us</h2>
<p>If you have questions about this Privacy Policy or how your data is handled, contact us at <a href="mailto:support@digitaltrax.in">support@digitaltrax.in</a>.</p>

</body>
</html>`;
