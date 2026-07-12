import { Form, useLoaderData, useActionData } from "react-router";
import { useState, useEffect } from "react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

// Minimal CSV parser that handles quoted fields (so city/state names
// containing commas still work), CRLF and LF line endings.
function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\n") {
      pushField();
      pushRow();
    } else if (char === "\r") {
      // skip, \n handles the row break
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  return rows.filter(
    (r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ""),
  );
}

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const pincodes = await prisma.pincodeRule.findMany({
    where: {
      shop: session.shop,
    },
    orderBy: {
      id: "desc",
    },
  });

  return { pincodes };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();

  const actionType = formData.get("action");

  // IMPORT CSV
  if (actionType === "import") {
    const file = formData.get("file");

    if (!file || typeof file === "string" || file.size === 0) {
      return { importError: "Please choose a CSV file to import." };
    }

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length === 0) {
      return { importError: "That CSV file appears to be empty." };
    }

    // Skip a header row if the first cell looks like a "pincode" label.
    const firstCell = (rows[0][0] || "").trim().toLowerCase();
    const dataRows = firstCell === "pincode" ? rows.slice(1) : rows;

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of dataRows) {
      const [
        rawPincode,
        city = "",
        state = "",
        rawDays = "2",
        rawCod = "yes",
      ] = row;

      const pincode = (rawPincode || "").trim();

      // Basic sanity check so junk rows don't get saved silently.
      if (!/^\d{4,6}$/.test(pincode)) {
        skipped++;
        continue;
      }

      const deliveryDays = parseInt(rawDays, 10) || 2;

      const codAvailable = ["yes", "true", "1"].includes(
        (rawCod || "").trim().toLowerCase(),
      );

      const existing = await prisma.pincodeRule.findFirst({
        where: { shop: session.shop, pincode },
      });

      if (existing) {
        await prisma.pincodeRule.update({
          where: { id: existing.id },
          data: {
            city: city.trim(),
            state: state.trim(),
            deliveryDays,
            codAvailable,
          },
        });
        updated++;
      } else {
        await prisma.pincodeRule.create({
          data: {
            shop: session.shop,
            pincode,
            city: city.trim(),
            state: state.trim(),
            deliveryDays,
            codAvailable,
          },
        });
        added++;
      }
    }

    return { imported: true, added, updated, skipped };
  }

  // EDIT PINCODE
  if (actionType === "edit") {
    const id = parseInt(formData.get("id"));
    const pincode = formData.get("pincode");
    const city = formData.get("city");
    const state = formData.get("state");

    const deliveryDays = parseInt(
      formData.get("deliveryDays") || "1"
    );

    const codAvailable = formData.get("codAvailable") === "on";

    // Prevent renaming into a pincode that already exists on a different row.
    const duplicate = await prisma.pincodeRule.findFirst({
      where: {
        shop: session.shop,
        pincode,
        NOT: { id },
      },
    });

    if (duplicate) {
      return { editError: "Another row already uses that pincode." };
    }

    await prisma.pincodeRule.update({
      where: { id },
      data: {
        pincode,
        city,
        state,
        deliveryDays,
        codAvailable,
      },
    });

    return { edited: true };
  }

  // DELETE PINCODE
  if (actionType === "delete") {
    const id = parseInt(formData.get("id"));

    await prisma.pincodeRule.delete({
      where: {
        id,
      },
    });

    return {
      deleted: true,
    };
  }

  // ADD PINCODE
  const pincode = formData.get("pincode");
  const city = formData.get("city");
  const state = formData.get("state");

  const deliveryDays = parseInt(
    formData.get("deliveryDays") || "1"
  );

  const codAvailable =
    formData.get("codAvailable") === "on";

  // Prevent Duplicate Pincode
  const existing = await prisma.pincodeRule.findFirst({
    where: {
      shop: session.shop,
      pincode,
    },
  });

  if (existing) {
    return {
      error: "Pincode already exists",
    };
  }

  await prisma.pincodeRule.create({
    data: {
      shop: session.shop,
      pincode,
      city,
      state,
      deliveryDays,
      codAvailable,
    },
  });

  return {
    success: true,
  };
}

function escapeCsvField(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename, rows) {
  const csvContent = rows.map((r) => r.map(escapeCsvField).join(",")).join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Pincodes() {
  const { pincodes } = useLoaderData();
  const actionData = useActionData();

  const [search, setSearch] = useState("");
  const [codFilter, setCodFilter] = useState("all");
  const [showImport, setShowImport] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    if (actionData?.edited) {
      setEditingItem(null);
    }
  }, [actionData]);

  const handleExport = () => {
    const header = ["pincode", "city", "state", "deliveryDays", "codAvailable"];
    const rows = [
      header,
      ...pincodes.map((p) => [
        p.pincode,
        p.city,
        p.state,
        p.deliveryDays,
        p.codAvailable ? "yes" : "no",
      ]),
    ];
    downloadCsv("smarteta-pincodes.csv", rows);
  };

  const handleSampleDownload = () => {
    const header = ["pincode", "city", "state", "deliveryDays", "codAvailable"];
    const rows = [
      header,
      ["110001", "New Delhi", "Delhi", "2", "yes"],
      ["400001", "Mumbai", "Maharashtra", "3", "yes"],
      ["600001", "Chennai", "Tamil Nadu", "4", "no"],
    ];
    downloadCsv("smarteta-sample-pincodes.csv", rows);
  };

  const filteredPincodes = pincodes.filter((item) => {
    const matchesSearch =
      item.pincode?.toLowerCase().includes(search.toLowerCase()) ||
      item.city?.toLowerCase().includes(search.toLowerCase()) ||
      item.state?.toLowerCase().includes(search.toLowerCase());

    const matchesCod =
      codFilter === "all"
        ? true
        : codFilter === "yes"
        ? item.codAvailable
        : !item.codAvailable;

    return matchesSearch && matchesCod;
  });

  const codCount = pincodes.filter(
    (item) => item.codAvailable
  ).length;

  const nonCodCount = pincodes.filter(
    (item) => !item.codAvailable
  ).length;

  return (
    <div className="smarteta-page">

      <div className="smarteta-page-header">

        <div>
          <h1 className="smarteta-title">
            Pincode Settings
          </h1>
        </div>

        <div className="smarteta-header-actions">

          <button
            type="button"
            className="smarteta-secondary-btn"
            onClick={handleExport}
          >
            Export CSV
          </button>

          <button
            type="button"
            className="smarteta-btn"
            onClick={() => setShowImport((v) => !v)}
          >
            Import CSV
          </button>

        </div>

      </div>

      {showImport && (
        <div className="smarteta-card" style={{ marginBottom: "20px" }}>

          <h2>Import Pincodes from CSV</h2>

          <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "4px" }}>
            Columns expected: <code>pincode, city, state, deliveryDays, codAvailable</code>.
            A pincode that already exists for this store will be updated instead of duplicated.
          </p>

          <Form
            method="post"
            encType="multipart/form-data"
            style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "14px", flexWrap: "wrap" }}
          >

            <input type="hidden" name="action" value="import" />

            <input
              type="file"
              name="file"
              accept=".csv"
              required
              className="smarteta-input"
            />

            <button type="submit" className="smarteta-btn">
              Upload &amp; Import
            </button>

            <button
              type="button"
              className="smarteta-secondary-btn"
              onClick={handleSampleDownload}
            >
              Download Sample CSV
            </button>

          </Form>

        </div>
      )}

      {/* Smart Header */}

      {/* <div className="smarteta-stats">
        <div className="smarteta-stat-card">
          <div>Total Pincodes</div>
          <div className="smarteta-stat-number">
            {pincodes.length}
          </div>
        </div>

        <div className="smarteta-stat-card">
          <div>COD Available</div>
          <div className="smarteta-stat-number">
            {codCount}
          </div>
        </div>

        <div className="smarteta-stat-card">
          <div>Non COD</div>
          <div className="smarteta-stat-number">
            {nonCodCount}
          </div>
        </div>
      </div> */}

      {actionData?.imported && (
        <div
          className="smarteta-card"
          style={{
            background: "#d1fae5",
            color: "#065f46",
            marginBottom: "20px",
          }}
        >
          Import complete — {actionData.added} added, {actionData.updated} updated
          {actionData.skipped > 0 ? `, ${actionData.skipped} skipped (invalid pincode)` : ""}.
        </div>
      )}

      {actionData?.importError && (
        <div
          className="smarteta-card"
          style={{
            background: "#fef3c7",
            color: "#92400e",
            marginBottom: "20px",
          }}
        >
          {actionData.importError}
        </div>
      )}

      {actionData?.success && (
        <div
          className="smarteta-card smarteta-alert-warning"
          style={{
            background: "#d1fae5",
            color: "#065f46",
            marginBottom: "20px",
          }}
        >
          Pincode Added Successfully
        </div>
      )}

      {actionData?.deleted && (
        <div
          className="smarteta-card smarteta-alert-danger"
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            marginBottom: "20px",
          }}
        >
          Pincode Deleted Successfully
        </div>
      )}

      {actionData?.editError && (
        <div
          className="smarteta-card"
          style={{
            background: "#fef3c7",
            color: "#92400e",
            marginBottom: "20px",
          }}
        >
          {actionData.editError}
        </div>
      )}

      {actionData?.error && (
        <div
          className="smarteta-card"
          style={{
            background: "#fef3c7",
            color: "#92400e",
            marginBottom: "20px",
          }}
        >
          {actionData.error}
        </div>
      )}

      <div className="smarteta-grid">

        <div className="smarteta-card">

          <h2>Add New Pincode</h2>

          <Form method="post">

            <div className="smarteta-form-row">

              <div className="smarteta-form-group">
                <label>Pincode *</label>
                <input
                  name="pincode"
                  required
                  className="smarteta-input"
                  placeholder="Enter pincode"
                />
              </div>

              <div className="smarteta-form-group">
                <label>City</label>
                <input
                  name="city"
                  className="smarteta-input"
                  placeholder="Enter city"
                />
              </div>

              <div className="smarteta-form-group">
                <label>State</label>
                <input
                  name="state"
                  className="smarteta-input"
                  placeholder="Enter state"
                />
              </div>

              <div className="smarteta-form-group">
                <label>Delivery Days *</label>
                <input
                  type="number"
                  name="deliveryDays"
                  defaultValue="2"
                  className="smarteta-input"
                />
              </div>

              <div className="smarteta-form-group">
                <label>COD Available</label>

                <div style={{marginTop:"12px"}}>
                  <input
                    type="checkbox"
                    name="codAvailable"
                    defaultChecked
                  />
                  {" "}Yes
                </div>
              </div>

            </div>

            <div
              style={{
                display:"flex",
                gap:"10px",
                marginTop:"20px"
              }}
            >

              <button
                type="submit"
                className="smarteta-btn"
              >
                Add Pincode
              </button>

              <button
                type="reset"
                className="smarteta-secondary-btn"
              >
                Reset
              </button>

            </div>

          </Form>

        </div>

        <div className="smarteta-card">

          <div className="smarteta-table-toolbar">

            <input
              type="text"
              placeholder="Search by pincode, city or state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="smarteta-input"
            />

            <select
              value={codFilter}
              onChange={(e) => setCodFilter(e.target.value)}
              className="smarteta-select"
            >
              <option value="all">
                All COD
              </option>

              <option value="yes">
                COD Available
              </option>

              <option value="no">
                COD Not Available
              </option>
            </select>

            <div className="smarteta-total">
              Total: {filteredPincodes.length}
            </div>

          </div>

          <h2>
            Saved Pincodes ({filteredPincodes.length})
          </h2>

        <div className="smarteta-table-wrapper">
          <table className="smarteta-table">

            <thead>
              <tr>
                <th>Pincode</th>
                <th>City</th>
                <th>State</th>
                <th>Days</th>
                <th>COD</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredPincodes.length > 0 ? (

                filteredPincodes.map((item) => (
                  <tr key={item.id}>
                    <td>{item.pincode}</td>
                    <td>{item.city}</td>
                    <td>{item.state}</td>
                    <td>{item.deliveryDays}</td>

                    <td>
                      <span
                        className={`smarteta-badge ${
                          item.codAvailable
                            ? "smarteta-success"
                            : "smarteta-danger"
                        }`}
                      >
                        {item.codAvailable
                          ? "Available"
                          : "Not Available"}
                      </span>
                    </td>

                    <td>

                       <div className="smarteta-action-group">

                        <button
                          type="button"
                          className="smarteta-edit-btn"
                          onClick={() => setEditingItem(item)}
                        >
                          Edit
                        </button>

                      <Form method="post">

                        <input
                          type="hidden"
                          name="action"
                          value="delete"
                        />

                        <input
                          type="hidden"
                          name="id"
                          value={item.id}
                        />

                        <button
                          type="submit"
                          className="smarteta-btn-danger"
                          onClick={(e) => {
                            if (
                              !confirm(
                                "Are you sure you want to delete this pincode?"
                              )
                            ) {
                              e.preventDefault();
                            }
                          }}
                        >
                          Delete
                        </button>

                      </Form>

                      </div>

                    </td>
                  </tr>
                ))

              ) : (

                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: "center",
                      padding: "30px",
                    }}
                  >
                    No matching pincodes found
                  </td>
                </tr>

              )}

            </tbody>

          </table>
        </div>

          <div className="smarteta-help-card">

              <div>
                <strong>Need help?</strong>

                <div>
                  You can import multiple pincodes at once using CSV import.
                </div>
              </div>

              <button
                type="button"
                className="smarteta-secondary-btn"
                onClick={handleSampleDownload}
              >
                View Sample CSV
              </button>

            </div>

        </div>

      </div>

      {editingItem && (
        <div
          className="smarteta-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingItem(null);
          }}
        >
          <div className="smarteta-modal">

            <h2>Edit Pincode</h2>

            <Form method="post" key={editingItem.id}>

              <input type="hidden" name="action" value="edit" />
              <input type="hidden" name="id" value={editingItem.id} />

              <div className="smarteta-form-row">

                <div className="smarteta-form-group">
                  <label>Pincode *</label>
                  <input
                    name="pincode"
                    required
                    defaultValue={editingItem.pincode}
                    className="smarteta-input"
                  />
                </div>

                <div className="smarteta-form-group">
                  <label>City</label>
                  <input
                    name="city"
                    defaultValue={editingItem.city ?? ""}
                    className="smarteta-input"
                  />
                </div>

                <div className="smarteta-form-group">
                  <label>State</label>
                  <input
                    name="state"
                    defaultValue={editingItem.state ?? ""}
                    className="smarteta-input"
                  />
                </div>

                <div className="smarteta-form-group">
                  <label>Delivery Days *</label>
                  <input
                    type="number"
                    name="deliveryDays"
                    defaultValue={editingItem.deliveryDays}
                    className="smarteta-input"
                  />
                </div>

                <div className="smarteta-form-group">
                  <label>COD Available</label>
                  <div style={{ marginTop: "12px" }}>
                    <input
                      type="checkbox"
                      name="codAvailable"
                      defaultChecked={editingItem.codAvailable}
                    />
                    {" "}Yes
                  </div>
                </div>

              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>

                <button type="submit" className="smarteta-btn">
                  Save Changes
                </button>

                <button
                  type="button"
                  className="smarteta-secondary-btn"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </button>

              </div>

            </Form>

          </div>
        </div>
      )}

    </div>
  );
}