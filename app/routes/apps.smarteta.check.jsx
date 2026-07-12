import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  calculateEstimatedDelivery,
  formatDeliveryDate,
  toDateKey,
} from "../utils/delivery-date.server";

// This route is reached via the Shopify App Proxy at:
//   https://{shop}.myshopify.com/apps/smarteta/check
// Shopify verifies the request signature and forwards it here.
// authenticate.public.appProxy() re-verifies the HMAC signature and
// resolves the offline session for the shop, so `shop` below is trusted
// (unlike a raw ?shop= query param, which anyone could spoof).
export async function loader({ request }) {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const shop = session.shop;
  const url = new URL(request.url);
  const pincode = url.searchParams.get("pincode")?.trim();

  if (!pincode) {
    return Response.json(
      { success: false, message: "Missing pincode" },
      { status: 400 },
    );
  }

  // Product context, sent by the widget from the Liquid block's data
  // attributes — used to match Advanced Rules (product/collection/vendor/tag).
  const productHandle = url.searchParams.get("productHandle")?.trim().toLowerCase();
  const vendor = url.searchParams.get("vendor")?.trim().toLowerCase();
  const tags = (url.searchParams.get("tags") || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const collectionHandles = (url.searchParams.get("collections") || "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  try {
    // Best-effort logging — a failure here should never break the actual
    // pincode check response the customer is waiting on.
    const logSearch = async (available) => {
      try {
        await prisma.widgetAnalytics.create({
          data: { shop, eventType: "search", pincode, available },
        });
      } catch (e) {
        console.error("Failed to log search analytics", e);
      }
    };

    const settings = await prisma.deliverySettings.findUnique({
      where: { shop },
    });

    const rule = await prisma.pincodeRule.findFirst({
      where: { shop, pincode },
    });

    // Advanced Rules — product/collection/vendor/tag extra-day modifiers.
    // Only queried when the widget actually sent product context (it won't
    // on pages without a `product` object in scope, e.g. a generic page).
    const ruleConditions = [];
    if (productHandle) ruleConditions.push({ ruleType: "product", value: productHandle });
    if (vendor) ruleConditions.push({ ruleType: "vendor", value: vendor });
    for (const tag of tags) ruleConditions.push({ ruleType: "tag", value: tag });
    for (const handle of collectionHandles) ruleConditions.push({ ruleType: "collection", value: handle });

    const matchedRules = ruleConditions.length
      ? await prisma.deliveryRule.findMany({
          where: { shop, OR: ruleConditions },
        })
      : [];

    const ruleExtraDays = matchedRules.reduce((sum, r) => sum + r.extraDays, 0);

    // Only need holidays from today onward — past ones can't affect anything.
    const todayKey = toDateKey(new Date());
    const holidays = await prisma.holiday.findMany({
      where: { shop, date: { gte: todayKey } },
    });

    const buildEstimate = (transitDays) =>
      calculateEstimatedDelivery({
        processingDays: settings?.processingDays ?? 1,
        transitDays: transitDays + ruleExtraDays,
        cutoffTime: settings?.cutoffTime ?? "14:00",
        weekendDelivery: settings?.weekendDelivery ?? false,
        holidayDates: holidays.map((h) => h.date),
        timezone: settings?.timezone ?? "Asia/Kolkata",
      });

    const dateFormat = settings?.dateFormat ?? "long";

    if (!rule) {
      // No exact match for this pincode. If the merchant has configured a
      // default ETA, show a generic (non-guaranteed) estimate instead of
      // flatly saying delivery isn't available.
      if (settings?.defaultDeliveryDays) {
        const estimatedDate = buildEstimate(settings.defaultDeliveryDays);

        await logSearch(true);

        return Response.json({
          success: true,
          available: true,
          isEstimate: true,
          pincode,
          city: null,
          state: null,
          deliveryDays: settings.defaultDeliveryDays + ruleExtraDays,
          codAvailable: settings.defaultCodAvailable,
          ruleAdjustmentDays: ruleExtraDays,
          estimatedDeliveryDate: toDateKey(estimatedDate),
          estimatedDeliveryLabel: formatDeliveryDate(estimatedDate, dateFormat),
        });
      }

      await logSearch(false);

      return Response.json({
        success: false,
        available: false,
        message: "Delivery not available",
      });
    }

    const estimatedDate = buildEstimate(rule.deliveryDays);

    await logSearch(true);

    return Response.json({
      success: true,
      available: true,
      pincode: rule.pincode,
      city: rule.city,
      state: rule.state,
      deliveryDays: rule.deliveryDays + ruleExtraDays,
      codAvailable: rule.codAvailable,
      ruleAdjustmentDays: ruleExtraDays,
      estimatedDeliveryDate: toDateKey(estimatedDate),
      estimatedDeliveryLabel: formatDeliveryDate(estimatedDate, dateFormat),
    });
  } catch (err) {
    console.error(err);
    return Response.json(
      { success: false, message: "Server Error" },
      { status: 500 },
    );
  }
}
