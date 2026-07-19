export default function SubscriptionPlan() {
  return (
    <div className="smarteta-page">

      <div className="smarteta-page-header">
        <div>
          <h1 className="smarteta-title">Subscription Plan</h1>
          <p className="smarteta-subtitle">
            Choose the plan that works for your store.
          </p>
        </div>
      </div>

      <div className="smarteta-card" style={{ maxWidth: "560px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h2 style={{ margin: 0 }}>Free Plan</h2>
          <span
            style={{
              background: "#d1fae5",
              color: "#065f46",
              fontSize: "12px",
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: "999px",
            }}
          >
            Free
          </span>
        </div>

        <div style={{ fontSize: "34px", fontWeight: 700, margin: "12px 0 4px" }}>
          $0<span style={{ fontSize: "16px", fontWeight: 400, color: "#6b7280" }}>/month</span>
        </div>

        <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
          Everything SmartETA offers today, on us while we're getting started.
        </p>

        <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 16px" }} />

        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "14px", lineHeight: 2.2 }}>
          <li>✅ Pincode-level delivery checking</li>
          <li>✅ Unlimited pincode rules</li>
          <li>✅ Holiday &amp; weekend exclusions</li>
          <li>✅ Product, collection, vendor &amp; tag rules</li>
          <li>✅ Countdown timer</li>
          <li>✅ Widget customization</li>
          <li>✅ CSV import / export</li>
          <li>✅ Analytics dashboard</li>
        </ul>

        <div style={{ marginTop: "20px" }}>
          <span
            style={{
              background: "#f3f4f6",
              color: "#111827",
              fontSize: "13px",
              fontWeight: 600,
              padding: "8px 14px",
              borderRadius: "8px",
              display: "inline-block",
            }}
          >
            Free — Active
          </span>
        </div>

      </div>

      <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "20px", maxWidth: "560px" }}>
        SmartETA is free for all stores during our early access period. We may introduce paid plans
        with additional features in the future — existing users will be notified in advance of any changes.
      </p>

    </div>
  );
}
