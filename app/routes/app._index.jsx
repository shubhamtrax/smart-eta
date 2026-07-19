import { useLoaderData, Link } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [widgetViews, totalSearches, availableSearches, activeRules, topSearched] =
    await Promise.all([
      prisma.widgetAnalytics.count({ where: { shop, eventType: "view" } }),
      prisma.widgetAnalytics.count({ where: { shop, eventType: "search" } }),
      prisma.widgetAnalytics.count({
        where: { shop, eventType: "search", available: true },
      }),
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
    widgetViews,
    totalSearches,
    activeRules,
    availabilityRate,
    topSearched,
  };
}

export default function Dashboard() {
  const { widgetViews, totalSearches, activeRules, availabilityRate, topSearched } =
    useLoaderData();

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
