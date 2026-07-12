import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { nowInTimeZone } from "../utils/delivery-date.server";

// Reached via https://{shop}.myshopify.com/apps/smarteta/countdown
// Returns how many seconds remain until today's cutoff, computed in the
// shop's configured timezone — the client just displays/ticks this down,
// it never has to do its own timezone math.
export async function loader({ request }) {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ success: false }, { status: 401 });
  }

  const shop = session.shop;

  try {
    const settings = await prisma.deliverySettings.findUnique({
      where: { shop },
    });

    const timezone = settings?.timezone ?? "Asia/Kolkata";
    const cutoffTime = settings?.cutoffTime ?? "14:00";

    const [cutoffHour, cutoffMinute] = cutoffTime.split(":").map((n) => parseInt(n, 10) || 0);

    const localNow = nowInTimeZone(timezone);
    const cutoff = new Date(localNow);
    cutoff.setHours(cutoffHour, cutoffMinute, 0, 0);

    const secondsRemaining = Math.floor((cutoff.getTime() - localNow.getTime()) / 1000);
    const cutoffPassed = secondsRemaining <= 0;

    return Response.json({
      success: true,
      cutoffPassed,
      secondsRemaining: cutoffPassed ? 0 : secondsRemaining,
      cutoffTime,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ success: false }, { status: 500 });
  }
}
