import { useLoaderData, Form, useActionData } from "react-router";
import { useState } from "react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

const RULE_TYPES = [
  { value: "product", label: "Product", hint: "Enter the product's handle (from its admin URL or online store URL)" },
  { value: "collection", label: "Collection", hint: "Enter the collection's handle" },
  { value: "vendor", label: "Vendor", hint: "Enter the vendor name exactly as it appears on the product" },
  { value: "tag", label: "Tag", hint: "Enter a product tag" },
];

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const rules = await prisma.deliveryRule.findMany({
    where: { shop: session.shop },
    orderBy: [{ ruleType: "asc" }, { createdAt: "desc" }],
  });

  return { rules };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "delete_rule") {
    const id = parseInt(formData.get("id"));
    await prisma.deliveryRule.delete({ where: { id } });
    return { deleted: true };
  }

  // add_rule (default)
  const ruleType = formData.get("ruleType");
  const rawValue = (formData.get("value") || "").trim();
  const label = (formData.get("label") || "").trim();
  const extraDays = parseInt(formData.get("extraDays") || "0", 10);

  if (!rawValue) {
    return { ruleError: "Please enter a value for this rule." };
  }

  // Vendor/tag matching is done case-insensitively (SQLite has no native
  // case-insensitive compare via Prisma), so we normalize at write time.
  const value =
    ruleType === "vendor" || ruleType === "tag"
      ? rawValue.toLowerCase()
      : rawValue.toLowerCase(); // handles are lowercase by Shopify convention too

  try {
    await prisma.deliveryRule.create({
      data: {
        shop: session.shop,
        ruleType,
        value,
        extraDays,
        label: label || null,
      },
    });
  } catch (e) {
    return { ruleError: "A rule for that value already exists — delete it first if you want to change it." };
  }

  return { ruleAdded: true };
}

export default function AdvancedRules() {
  const { rules } = useLoaderData();
  const actionData = useActionData();
  const [activeType, setActiveType] = useState("product");

  const filteredRules = rules.filter((r) => r.ruleType === activeType);
  const activeMeta = RULE_TYPES.find((t) => t.value === activeType);

  return (
    <div className="smarteta-page">

      <div className="smarteta-page-header">
        <div>
          <h1 className="smarteta-title">Advanced Rules</h1>
          <p className="smarteta-subtitle">
            Add or subtract delivery days for specific products, collections, vendors, or tags —
            stacks on top of the base pincode + processing time calculation.
          </p>
        </div>
      </div>

      {actionData?.ruleAdded && (
        <div className="smarteta-card smarteta-alert-success" style={{ marginBottom: "20px" }}>
          Rule added.
        </div>
      )}

      {actionData?.deleted && (
        <div className="smarteta-card smarteta-alert-danger" style={{ marginBottom: "20px" }}>
          Rule removed.
        </div>
      )}

      {actionData?.ruleError && (
        <div className="smarteta-card smarteta-alert-warning" style={{ marginBottom: "20px" }}>
          {actionData.ruleError}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {RULE_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setActiveType(t.value)}
            className={activeType === t.value ? "smarteta-btn" : "smarteta-secondary-btn"}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="smarteta-card">

        <h2>Add {activeMeta.label} Rule</h2>
        <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "-8px", marginBottom: "16px" }}>
          {activeMeta.hint}
        </p>

        <Form method="post">
          <input type="hidden" name="action" value="add_rule" />
          <input type="hidden" name="ruleType" value={activeType} />

          <div className="smarteta-form-row">

            <div className="smarteta-form-group">
              <label>{activeMeta.label} Value *</label>
              <input
                type="text"
                name="value"
                required
                className="smarteta-input"
                placeholder={
                  activeType === "vendor" ? "e.g. Nike" :
                  activeType === "tag" ? "e.g. handmade" :
                  "e.g. blue-cotton-rug"
                }
              />
            </div>

            <div className="smarteta-form-group">
              <label>Label (optional)</label>
              <input
                type="text"
                name="label"
                className="smarteta-input"
                placeholder="For your own reference"
              />
            </div>

            <div className="smarteta-form-group">
              <label>Extra Days</label>
              <input
                type="number"
                name="extraDays"
                defaultValue="0"
                className="smarteta-input"
              />
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                Use a negative number to speed up delivery instead.
              </div>
            </div>

          </div>

          <div style={{ display: "flex", marginTop: "20px" }}>
            <button type="submit" className="smarteta-btn">
              Add Rule
            </button>
          </div>

        </Form>

      </div>

      <div className="smarteta-card" style={{ marginTop: "20px" }}>

        <h2>{activeMeta.label} Rules</h2>

        {filteredRules.length === 0 ? (
          <div className="smarteta-empty">No {activeMeta.label.toLowerCase()} rules added yet.</div>
        ) : (
          <div className="smarteta-table-wrapper">
            <table className="smarteta-table">
              <thead>
                <tr>
                  <th>Value</th>
                  <th>Label</th>
                  <th>Extra Days</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((r) => (
                  <tr key={r.id}>
                    <td>{r.value}</td>
                    <td>{r.label || "—"}</td>
                    <td>{r.extraDays > 0 ? `+${r.extraDays}` : r.extraDays}</td>
                    <td>
                      <Form method="post">
                        <input type="hidden" name="action" value="delete_rule" />
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="smarteta-btn-danger"
                          onClick={(e) => {
                            if (!confirm(`Remove this rule for "${r.value}"?`)) {
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
  );
}
