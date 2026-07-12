import { useLoaderData } from "react-router";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [
    totalViews,
    totalSearches,
    availableSearches,
    topSearched,
    topUnavailable,
    recent,
  ] = await Promise.all([
    prisma.widgetAnalytics.count({ where: { shop, eventType: "view" } }),
    prisma.widgetAnalytics.count({ where: { shop, eventType: "search" } }),
    prisma.widgetAnalytics.count({
      where: { shop, eventType: "search", available: true },
    }),
    prisma.widgetAnalytics.groupBy({
      by: ["pincode"],
      where: { shop, eventType: "search", pincode: { not: null } },
      _count: { pincode: true },
      orderBy: { _count: { pincode: "desc" } },
      take: 10,
    }),
    prisma.widgetAnalytics.groupBy({
      by: ["pincode"],
      where: {
        shop,
        eventType: "search",
        available: false,
        pincode: { not: null },
      },
      _count: { pincode: true },
      orderBy: { _count: { pincode: "desc" } },
      take: 10,
    }),
    prisma.widgetAnalytics.findMany({
      where: { shop, eventType: "search" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const availabilityRate =
    totalSearches > 0
      ? Math.round((availableSearches / totalSearches) * 100)
      : null;

  return {
    totalViews,
    totalSearches,
    availabilityRate,
    topSearched,
    topUnavailable,
    recent,
  };
}

export default function Analytics() {
  const {
    totalViews,
    totalSearches,
    availabilityRate,
    topSearched,
    topUnavailable,
    recent,
  } = useLoaderData();

  return (
    <div className="smarteta-page">

      <div className="smarteta-page-header">
        <div>
          <h1 className="smarteta-title">Analytics</h1>
          <p className="smarteta-subtitle">
            How customers are using the delivery checker on your storefront.
          </p>
        </div>
      </div>

      <div className="smarteta-stats">

        <div className="smarteta-stat-card">
          <h3>Widget Views</h3>
          <div className="smarteta-stat-number">{totalViews}</div>
        </div>

        <div className="smarteta-stat-card">
          <h3>Pincode Searches</h3>
          <div className="smarteta-stat-number">{totalSearches}</div>
        </div>

        <div className="smarteta-stat-card">
          <h3>Availability Rate</h3>
          <div className="smarteta-stat-number">
            {availabilityRate === null ? "—" : `${availabilityRate}%`}
          </div>
        </div>

      </div>

      <div className="smarteta-grid">

        <div className="smarteta-card">

          <h2>Top Searched Pincodes</h2>
          <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "-8px", marginBottom: "16px" }}>
            Where demand is coming from — useful for deciding where to expand coverage.
          </p>

          {topSearched.length === 0 ? (
            <div className="smarteta-empty">No searches recorded yet.</div>
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

        </div>

        <div className="smarteta-card">

          <h2>Unserved Demand</h2>
          <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "-8px", marginBottom: "16px" }}>
            Pincodes customers searched for that you don't currently deliver to —
            candidates for adding under Pincode Settings.
          </p>

          {topUnavailable.length === 0 ? (
            <div className="smarteta-empty">
              No unserved searches — either you cover everything customers have searched
              for, or there isn't enough search data yet.
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
                  {topUnavailable.map((row) => (
                    <tr key={row.pincode}>
                      <td>{row.pincode}</td>
                      <td>{row._count.pincode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

      <div className="smarteta-card" style={{ marginTop: "24px" }}>

        <h2>Recent Activity</h2>

        {recent.length === 0 ? (
          <div className="smarteta-empty">No activity yet.</div>
        ) : (
          <div className="smarteta-table-wrapper">
            <table className="smarteta-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Pincode</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                    <td>{row.pincode}</td>
                    <td>
                      <span
                        className={`smarteta-badge ${
                          row.available ? "smarteta-success" : "smarteta-danger"
                        }`}
                      >
                        {row.available ? "Available" : "Not Available"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
