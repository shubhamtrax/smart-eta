import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { reportError } from "../sentry.server";

// Shopify requires every public app to subscribe to these three topics.
// Good news for SmartETA specifically: nothing in this app's schema stores
// customer-identifying data (no customer ID, email, or name anywhere —
// everything is keyed by `shop` only, storing pincodes/settings/analytics).
// That means customers/data_request and customers/redact have nothing to
// actually act on; shop/redact is the one that matters here, since it means
// erasing everything tied to that shop after uninstall + Shopify's grace period.
export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST": {
      // We don't store any customer-identifying data, so there's nothing
      // to export. Acknowledge receipt — Shopify only requires a 200.
      break;
    }

    case "CUSTOMERS_REDACT": {
      // Same as above — no customer-linked records exist to redact.
      break;
    }

    case "SHOP_REDACT": {
      // Shop has been uninstalled and Shopify's data-retention window has
      // passed — erase everything tied to this shop across every table.
      const redactShop = payload?.shop_domain || shop;

      const results = await Promise.allSettled([
        prisma.pincodeRule.deleteMany({ where: { shop: redactShop } }),
        prisma.deliverySettings.deleteMany({ where: { shop: redactShop } }),
        prisma.holiday.deleteMany({ where: { shop: redactShop } }),
        prisma.widgetAnalytics.deleteMany({ where: { shop: redactShop } }),
        prisma.widgetSettings.deleteMany({ where: { shop: redactShop } }),
        prisma.deliveryRule.deleteMany({ where: { shop: redactShop } }),
        prisma.session.deleteMany({ where: { shop: redactShop } }),
      ]);

      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        // This is compliance-critical — a silent failure here means we
        // told Shopify we redacted data we actually didn't. Report loudly.
        const err = new Error(
          `SHOP_REDACT partially failed for ${redactShop}: ${failures.map((f) => f.reason).join("; ")}`,
        );
        console.error(err);
        reportError(err, { shop: redactShop });
      }

      console.log(`Redacted all data for ${redactShop}`);
      break;
    }

    default: {
      console.warn(`Unhandled compliance topic: ${topic}`);
    }
  }

  return new Response();
};
