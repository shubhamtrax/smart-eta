import prisma from "../db.server";

// Plain, non-embedded route — deliberately outside /app/* so it isn't
// subject to Shopify's per-shop OAuth session (which would only ever let
// a shop see its own data). Protected instead by a shared secret so only
// you can use it: https://yourapp.com/internal/support?key=SECRET&shop=some-shop.myshopify.com
//
// Set INTERNAL_SUPPORT_KEY in your production environment variables —
// pick something long and random, never commit it to source control.
export async function loader({ request }) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const shop = url.searchParams.get("shop");

  if (!process.env.INTERNAL_SUPPORT_KEY || key !== process.env.INTERNAL_SUPPORT_KEY) {
    return new Response("Not found", { status: 404 });
  }

  if (!shop) {
    return htmlResponse(`
      <h1>SmartETA Support Lookup</h1>
      <p>Add <code>&shop=some-shop.myshopify.com</code> to the URL.</p>
    `);
  }

  const [settings, widgetSettings, pincodeCount, holidayCount, ruleCount, recentActivity, totalSearches, totalViews] =
    await Promise.all([
      prisma.deliverySettings.findUnique({ where: { shop } }),
      prisma.widgetSettings.findUnique({ where: { shop } }),
      prisma.pincodeRule.count({ where: { shop } }),
      prisma.holiday.count({ where: { shop } }),
      prisma.deliveryRule.count({ where: { shop } }),
      prisma.widgetAnalytics.findMany({
        where: { shop },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.widgetAnalytics.count({ where: { shop, eventType: "search" } }),
      prisma.widgetAnalytics.count({ where: { shop, eventType: "view" } }),
    ]);

  return htmlResponse(`
    <h1>${escapeHtml(shop)}</h1>

    <h2>Delivery Settings</h2>
    <pre>${escapeHtml(JSON.stringify(settings, null, 2))}</pre>

    <h2>Widget Settings</h2>
    <pre>${escapeHtml(JSON.stringify(widgetSettings, null, 2))}</pre>

    <h2>Counts</h2>
    <ul>
      <li>Pincode rules: ${pincodeCount}</li>
      <li>Holidays: ${holidayCount}</li>
      <li>Advanced rules: ${ruleCount}</li>
      <li>Total widget views: ${totalViews}</li>
      <li>Total pincode searches: ${totalSearches}</li>
    </ul>

    <h2>Last 30 Activity Events</h2>
    <table border="1" cellpadding="6" style="border-collapse:collapse;">
      <tr><th>When</th><th>Type</th><th>Pincode</th><th>Available</th></tr>
      ${recentActivity
        .map(
          (a) => `
        <tr>
          <td>${new Date(a.createdAt).toLocaleString()}</td>
          <td>${escapeHtml(a.eventType)}</td>
          <td>${escapeHtml(a.pincode || "—")}</td>
          <td>${a.available === null ? "—" : a.available ? "Yes" : "No"}</td>
        </tr>`,
        )
        .join("")}
    </table>
  `);
}

function htmlResponse(bodyHtml) {
  return new Response(
    `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>SmartETA Support</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 32px; max-width: 900px; margin: 0 auto; color: #111827; }
          pre { background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; }
          table { width: 100%; margin-top: 12px; font-size: 13px; }
          th { text-align: left; background: #f3f4f6; }
        </style>
      </head>
      <body>${bodyHtml}</body>
    </html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
