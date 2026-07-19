import { useLoaderData, useActionData, Link, Form } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let widgetSettings = await prisma.widgetSettings.findUnique({
    where: { shop },
  });

  if (!widgetSettings) {
    widgetSettings = await prisma.widgetSettings.create({ data: { shop } });
  }

  const [widgetViews, totalSearches, availableSearches, activeRules, pincodeCount, topSearched] =
    await Promise.all([
      prisma.widgetAnalytics.count({ where: { shop, eventType: "view" } }),
      prisma.widgetAnalytics.count({ where: { shop, eventType: "search" } }),
      prisma.widgetAnalytics.count({
        where: { shop, eventType: "search", available: true },
      }),
      prisma.pincodeRule.count({ where: { shop } }),
      prisma.pincodeRule.count({ where: { shop } }),
      prisma.widgetAnalytics.groupBy({
        by: ["pincode"],
        where: { shop, eventType: "search", pincode: { not: null } },
        _count: { pincode: true },
        orderBy: { _count: { pincode: "desc" } },
        take: 5,
      }),
    ]);

  const availabilityRate =
    totalSearches > 0
      ? Math.round((availableSearches / totalSearches) * 100)
      : null;

  return {
    shop,
    widgetSettings,
    widgetViews,
    totalSearches,
    activeRules,
    pincodeCount,
    availabilityRate,
    topSearched,
  };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "confirm_widget_added") {
    await prisma.widgetSettings.update({
      where: { shop: session.shop },
      data: { widgetAddedConfirmed: true },
    });
    return { confirmed: "widget_added" };
  }

  if (actionType === "confirm_working") {
    await prisma.widgetSettings.update({
      where: { shop: session.shop },
      data: { setupConfirmed: true },
    });
    return { confirmed: "working" };
  }

  if (actionType === "feedback") {
    const sentiment = formData.get("sentiment");
    await prisma.widgetAnalytics.create({
      data: {
        shop: session.shop,
        eventType: sentiment === "good" ? "feedback_positive" : "feedback_negative",
      },
    });
    return { feedbackSent: true };
  }

  return null;
}

export default function Dashboard() {
  const {
    shop,
    widgetSettings,
    widgetViews,
    totalSearches,
    activeRules,
    pincodeCount,
    availabilityRate,
    topSearched,
  } = useLoaderData();
  const actionData = useActionData();

  const themeEditorUrl = `https://${shop}/admin/themes/current/editor?template=product`;

  const steps = [
    { done: pincodeCount > 0, label: "Add your delivery pincodes" },
    { done: widgetSettings.widgetAddedConfirmed, label: "Add the widget to your product pages" },
    { done: widgetSettings.setupConfirmed, label: "Confirm it's working on your storefront" },
  ];
  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  return (
    <div className="smarteta-page">

      <div className="smarteta-page-header">
        <div>
          <h1 className="smarteta-title">SmartETA Dashboard</h1>
          <p className="smarteta-subtitle">
            Live activity from your storefront delivery widget.
          </p>
        </div>
      </div>

      {!allDone && (
        <div className="smarteta-card" style={{ marginBottom: "24px" }}>

          <h2 style={{ marginBottom: "2px" }}>Setup guide</h2>
          <p style={{ color: "#6b7280", fontSize: "14px", marginTop: 0, marginBottom: "12px" }}>
            Follow these steps to start using SmartETA.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
              {completedCount} / {steps.length} completed
            </span>
            <div style={{ flex: 1, height: "6px", background: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(completedCount / steps.length) * 100}%`,
                  background: "#111827",
                  borderRadius: "999px",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          </div>

          {/* Step 1 */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 0" }}>
            <StepIcon done={steps[0].done} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>Add your delivery pincodes</div>
              {!steps[0].done && (
                <div style={{ marginTop: "8px" }}>
                  <Link to="/app/pincodes" className="smarteta-secondary-btn" style={{ textDecoration: "none" }}>
                    Go to Pincode Settings
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 0" }}>
            <StepIcon done={steps[1].done} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>Add the widget to your product pages</div>
              {!steps[1].done && (
                <>
                  <p style={{ color: "#6b7280", fontSize: "13px", margin: "4px 0 10px" }}>
                    Open the theme editor, add the SmartETA app block to your product page template, and save.
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <a
                      href={themeEditorUrl}
                      target="_top"
                      className="smarteta-secondary-btn"
                      style={{ textDecoration: "none" }}
                    >
                      Open Theme Editor
                    </a>
                    <Form method="post">
                      <input type="hidden" name="action" value="confirm_widget_added" />
                      <button type="submit" className="smarteta-btn">
                        I've added it
                      </button>
                    </Form>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 0" }}>
            <StepIcon done={steps[2].done} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>Confirm it's working on your storefront</div>
              {!steps[2].done && (
                <>
                  <p style={{ color: "#6b7280", fontSize: "13px", margin: "4px 0 10px" }}>
                    Visit a product page and test the widget with a pincode you've added. Let us know if you run into issues.
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <Form method="post">
                      <input type="hidden" name="action" value="confirm_working" />
                      <button type="submit" className="smarteta-btn">
                        Everything is great
                      </button>
                    </Form>
                    <a
                      href="mailto:support@digitaltrax.in"
                      className="smarteta-secondary-btn"
                      style={{ textDecoration: "none" }}
                    >
                      Contact support
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      )}

      <div className="smarteta-stats">

        <div className="smarteta-stat-card">
          <h3>Widget Views</h3>
          <div className="smarteta-stat-number">{widgetViews}</div>
        </div>

        <div className="smarteta-stat-card">
          <h3>Pincode Searches</h3>
          <div className="smarteta-stat-number">{totalSearches}</div>
        </div>

        <div className="smarteta-stat-card">
          <h3>Active Rules</h3>
          <div className="smarteta-stat-number">{activeRules}</div>
        </div>

        <div className="smarteta-stat-card">
          <h3>Availability Rate</h3>
          <div className="smarteta-stat-number">
            {availabilityRate === null ? "—" : `${availabilityRate}%`}
          </div>
        </div>

      </div>

      <div className="smarteta-card" style={{ marginTop: "24px" }}>

        <h2>Top Searched Pincodes</h2>

        {topSearched.length === 0 ? (
          <div className="smarteta-empty">
            No searches yet — once customers use the widget on your storefront, the most
            searched pincodes will show up here.
          </div>
        ) : (
          <div className="smarteta-table-wrapper">
            <table className="smarteta-table">
              <thead>
                <tr>
                  <th>Pincode</th>
                  <th>Searches</th>
                </tr>
              </thead>
              <tbody>
                {topSearched.map((row) => (
                  <tr key={row.pincode}>
                    <td>{row.pincode}</td>
                    <td>{row._count.pincode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: "16px" }}>
          <Link to="/app/analytics" className="smarteta-secondary-btn">
            View Full Analytics
          </Link>
        </div>

      </div>

      <div
        className="smarteta-card"
        style={{
          marginTop: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>How's it going?</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "14px" }}>
            {actionData?.feedbackSent
              ? "Thanks for letting us know!"
              : "Quick feedback helps us prioritize what to build next."}
          </p>
        </div>

        {!actionData?.feedbackSent && (
          <div style={{ display: "flex", gap: "10px" }}>
            <Form method="post">
              <input type="hidden" name="action" value="feedback" />
              <input type="hidden" name="sentiment" value="bad" />
              <button type="submit" className="smarteta-secondary-btn">
                👎 Not good
              </button>
            </Form>
            <Form method="post">
              <input type="hidden" name="action" value="feedback" />
              <input type="hidden" name="sentiment" value="good" />
              <button type="submit" className="smarteta-btn">
                👍 Great
              </button>
            </Form>
          </div>
        )}
      </div>

      <div
        className="smarteta-card"
        style={{
          marginTop: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Need help?</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "14px" }}>
            If something isn't working as expected, or you have a question about setting up SmartETA,
            reach out and we'll help you sort it out.
          </p>
        </div>

        <a
          href="mailto:support@digitaltrax.in"
          className="smarteta-btn"
          style={{ textDecoration: "none", whiteSpace: "nowrap" }}
        >
          Contact Support
        </a>
      </div>

    </div>
  );
}

function StepIcon({ done }) {
  if (done) {
    return (
      <div
        style={{
          flexShrink: 0,
          width: "22px",
          height: "22px",
          borderRadius: "999px",
          background: "#111827",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "13px",
          marginTop: "1px",
        }}
      >
        ✓
      </div>
    );
  }

  return (
    <div
      style={{
        flexShrink: 0,
        width: "22px",
        height: "22px",
        borderRadius: "999px",
        border: "2px dashed #d1d5db",
        marginTop: "1px",
      }}
    />
  );
}
