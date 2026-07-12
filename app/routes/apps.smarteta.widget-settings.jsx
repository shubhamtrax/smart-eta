import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Reached via https://{shop}.myshopify.com/apps/smarteta/widget-settings
// Called by the widget on load so admin-configured text/colors take effect
// everywhere the widget is used, without needing a Theme Editor edit.
export async function loader({ request }) {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ success: false }, { status: 401 });
  }

  try {
    const settings = await prisma.widgetSettings.findUnique({
      where: { shop: session.shop },
    });

    if (!settings) {
      // No customization saved yet — let the widget fall back to its
      // Liquid block defaults rather than creating a row on every read.
      return Response.json({ success: true, settings: null });
    }

    return Response.json({
      success: true,
      settings: {
        heading: settings.heading,
        description: settings.description,
        buttonText: settings.buttonText,
        accentColor: settings.accentColor,
        cornerRadius: settings.cornerRadius,
      },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ success: false }, { status: 500 });
  }
}
