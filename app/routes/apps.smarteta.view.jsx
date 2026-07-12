import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Reached via https://{shop}.myshopify.com/apps/smarteta/view
// Called once by the widget when it mounts on a product page, purely to
// count impressions for the Dashboard. Failures here are non-fatal by
// design — a logging hiccup should never surface as an error to shoppers.
export async function loader({ request }) {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ success: false }, { status: 401 });
  }

  try {
    await prisma.widgetAnalytics.create({
      data: { shop: session.shop, eventType: "view" },
    });
  } catch (e) {
    console.error("Failed to log widget view", e);
  }

  return Response.json({ success: true });
}
