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

    </div>
  );
}
