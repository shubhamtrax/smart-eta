import { useLoaderData, Form, useActionData, Link } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  let settings = await prisma.deliverySettings.findUnique({
    where: {
      shop: session.shop,
    },
  });

  if (!settings) {
    settings = await prisma.deliverySettings.create({
      data: {
        shop: session.shop,
      },
    });
  }

  const holidays = await prisma.holiday.findMany({
    where: { shop: session.shop },
    orderBy: { date: "asc" },
  });

  return { settings, holidays };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "add_holiday") {
    const date = formData.get("date");
    const label = formData.get("label") || "";

    if (!date) {
      return { holidayError: "Please choose a date." };
    }

    try {
      await prisma.holiday.create({
        data: {
          shop: session.shop,
          date,
          label: label.trim() || null,
        },
      });
    } catch (e) {
      return { holidayError: "That date is already marked as a holiday." };
    }

    return { holidayAdded: true };
  }

  if (actionType === "delete_holiday") {
    const id = parseInt(formData.get("id"));

    await prisma.holiday.delete({
      where: { id },
    });

    return { holidayDeleted: true };
  }

  const processingDays = parseInt(
    formData.get("processingDays") || "1"
  );

  const cutoffTime =
    formData.get("cutoffTime") || "14:00";

  const weekendDelivery =
    formData.get("weekendDelivery") === "on";

  await prisma.deliverySettings.upsert({
    where: {
      shop: session.shop,
    },
    update: {
      processingDays,
      cutoffTime,
      weekendDelivery,
    },
    create: {
      shop: session.shop,
      processingDays,
      cutoffTime,
      weekendDelivery,
    },
  });

  return {
    success: true,
  };
}

export default function Rules() {
  const { settings, holidays } = useLoaderData();
  const actionData = useActionData();

  return (
    <div className="smarteta-page">

      <div className="smarteta-page-header">
        <div>
          <h1 className="smarteta-title">Delivery Rules</h1>
          <p className="smarteta-subtitle">
            Configure how estimated delivery dates are calculated across your store.
          </p>
        </div>
      </div>

      {actionData?.success && (
        <div className="smarteta-card smarteta-alert-success" style={{ marginBottom: "20px" }}>
          Settings saved successfully.
        </div>
      )}

      <div className="smarteta-grid">

        <div className="smarteta-card">

          <h2>General Settings</h2>

          <Form method="post">
            <input type="hidden" name="action" value="save_settings" />

            <div className="smarteta-form-row">

              <div className="smarteta-form-group">
                <label>Processing Days</label>
                <input
                  type="number"
                  name="processingDays"
                  defaultValue={settings.processingDays}
                  className="smarteta-input"
                />
              </div>

              <div className="smarteta-form-group">
                <label>Cutoff Time</label>
                <input
                  type="time"
                  name="cutoffTime"
                  defaultValue={settings.cutoffTime}
                  className="smarteta-input"
                />
              </div>

              <div className="smarteta-form-group">
                <label>Weekend Delivery</label>
                <div style={{ height: "46px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    name="weekendDelivery"
                    defaultChecked={settings.weekendDelivery}
                  />
                  Allow delivery on Sundays
                </div>
              </div>

            </div>

            <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "14px" }}>
              Looking for a fallback delivery estimate for pincodes you haven't added yet?
              That's under <Link to="/app/settings">Settings → Default ETA</Link>.
            </p>

            <div style={{ display: "flex", marginTop: "20px" }}>
              <button type="submit" className="smarteta-btn">
                Save Settings
              </button>
            </div>

          </Form>

        </div>

        <div className="smarteta-card">

          <h2>Holidays</h2>
          <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "-12px", marginBottom: "20px" }}>
            Dates marked here are skipped when calculating estimated delivery dates on the storefront widget.
          </p>

          {actionData?.holidayAdded && (
            <div className="smarteta-card smarteta-alert-success" style={{ padding: "14px 18px", marginBottom: "16px" }}>
              Holiday added.
            </div>
          )}

          {actionData?.holidayDeleted && (
            <div className="smarteta-card smarteta-alert-danger" style={{ padding: "14px 18px", marginBottom: "16px" }}>
              Holiday removed.
            </div>
          )}

          {actionData?.holidayError && (
            <div className="smarteta-card smarteta-alert-warning" style={{ padding: "14px 18px", marginBottom: "16px" }}>
              {actionData.holidayError}
            </div>
          )}

          <Form method="post">
            <input type="hidden" name="action" value="add_holiday" />

            <div className="smarteta-form-row">

              <div className="smarteta-form-group">
                <label>Date</label>
                <input type="date" name="date" required className="smarteta-input" />
              </div>

              <div className="smarteta-form-group">
                <label>Label (optional)</label>
                <input
                  type="text"
                  name="label"
                  placeholder="e.g. Diwali"
                  className="smarteta-input"
                />
              </div>

            </div>

            <div style={{ display: "flex", marginTop: "20px" }}>
              <button type="submit" className="smarteta-btn">
                Add Holiday
              </button>
            </div>

          </Form>

          {holidays.length === 0 ? (
            <div className="smarteta-empty">No holidays added yet.</div>
          ) : (
            <div className="smarteta-table-wrapper" style={{ marginTop: "24px" }}>
              <table className="smarteta-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Label</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h) => (
                    <tr key={h.id}>
                      <td>{h.date}</td>
                      <td>{h.label || "—"}</td>
                      <td>
                        <Form method="post">
                          <input type="hidden" name="action" value="delete_holiday" />
                          <input type="hidden" name="id" value={h.id} />
                          <button
                            type="submit"
                            className="smarteta-btn-danger"
                            onClick={(e) => {
                              if (!confirm(`Remove ${h.date} as a holiday?`)) {
                                e.preventDefault();
                              }
                            }}
                          >
                            Remove
                          </button>
                        </Form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}