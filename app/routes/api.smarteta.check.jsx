import prisma from "../db.server";

export async function loader({ request }) {
  try {
    const url = new URL(request.url);

    const shop = url.searchParams.get("shop");
    const pincode = url.searchParams.get("pincode");

    if (!shop || !pincode) {
      return Response.json(
        {
          success: false,
          message: "Missing parameters",
        },
        {
          status: 400,
        },
      );
    }

    const rule = await prisma.pincodeRule.findFirst({
      where: {
        shop,
        pincode,
      },
    });

    if (!rule) {
      return Response.json({
        success: false,
        available: false,
        message: "Delivery not available",
      });
    }

    return Response.json({
      success: true,
      available: true,

      pincode: rule.pincode,
      city: rule.city,
      state: rule.state,

      deliveryDays: rule.deliveryDays,
      codAvailable: rule.codAvailable,
    });
  } catch (err) {
    console.error(err);

    return Response.json(
      {
        success: false,
        message: "Server Error",
      },
      {
        status: 500,
      },
    );
  }
}