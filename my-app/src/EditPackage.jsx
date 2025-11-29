import React, { useEffect, useState } from "react";
import "./EditPackage.css";

/*
  Props:
    initialPackage: {
      id, Package_Name, Description, NumTables, NumRoundTables,
      NumChairs, NumTent, NumPlatform, Package_Amount,
      photos (array) or Photo (string)
    }
    onSave(formObject, selectedFile)
    onCancel()
*/

export default function EditPackageButton({ packageId, onSaved, className, children, buttonProps }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pkg, setPkg] = useState(null);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    id: "",
    Package_Name: "",
    Description: "",
    NumTables: 0,
    NumRoundTables: 0,
    NumChairs: 0,
    NumTent: 0,
    NumPlatform: 0,
    Package_Amount: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open || !packageId) return;

    let mounted = true;
    setLoading(true);
    setError("");

    fetch(`http://localhost:3001/api/packages/${encodeURIComponent(packageId)}`)
      .then(async (r) => {
        const ct = r.headers.get("content-type") || "";
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`HTTP ${r.status}: ${text.slice(0,200)}`);
        }
        if (!ct.includes("application/json")) {
          const text = await r.text();
          throw new Error("Expected JSON but received non-JSON response: " + text.slice(0,200));
        }
        return r.json();
      })
      .then((json) => {
        if (!mounted) return;
        if (json?.status === "success" && json.package) {
          const p = json.package;
          setPkg(p);

          // Fill form with package data
          setForm({
            id: p.id,
            Package_Name: p.Package_Name || "",
            Description: p.Description || "",
            NumTables: p.NumTables || 0,
            NumRoundTables: p.NumRoundTables || 0,
            NumChairs: p.NumChairs || 0,
            NumTent: p.NumTent || 0,
            NumPlatform: p.NumPlatform || 0,
            Package_Amount: p.Package_Amount || ""
          });

          // Set preview image
          const img = p.Photo || (Array.isArray(p.photos) ? p.photos[0] : null) || null;
          setPreview(img);
          setSelectedFile(null);
        } else {
          setError(json?.message || "Failed to load package");
        }
      })
      .catch((e) => {
        console.error(e);
        setError(e.message || "Network error loading package");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [open, packageId]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!open) {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
      setPkg(null);
      setSelectedFile(null);
      setPreview(null);
      setForm(emptyForm);
      setError("");
      setSaving(false);
    }
  }, [open]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);

    const url = URL.createObjectURL(f);
    setPreview(url);
    setSelectedFile(f);
  };

  const handleSave = async () => {
    setError("");
    if (!form.Package_Name) {
      setError("Package name required");
      return;
    }
    if (!form.id) {
      setError("Package ID missing");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("id", form.id);
      fd.append("Package_Name", form.Package_Name);
      fd.append("Description", form.Description ?? "");
      fd.append("NumTables", String(form.NumTables ?? 0));
      fd.append("NumRoundTables", String(form.NumRoundTables ?? 0));
      fd.append("NumChairs", String(form.NumChairs ?? 0));
      fd.append("NumTent", String(form.NumTent ?? 0));
      fd.append("NumPlatform", String(form.NumPlatform ?? 0));
      fd.append("Package_Amount", String(form.Package_Amount ?? ""));

      if (selectedFile) fd.append("photo", selectedFile);

      const res = await fetch("http://localhost:3001/api/packages/update", {
        method: "POST",
        body: fd,
      });

      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0,200)}`);
      }
      if (!ct.includes("application/json")) {
        const text = await res.text();
        throw new Error("Expected JSON but received non-JSON response: " + text.slice(0,200));
      }

      const json = await res.json();
      if (json?.status === "success") {
        onSaved && onSaved();
        setOpen(false);
      } else {
        throw new Error(json?.message || "Save failed");
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={
          className ??
          "inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        }
        onClick={() => setOpen(true)}
        {...buttonProps}
      >
        {children ?? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M4 13.5V20h6.5L20.818 9.682a2 2 0 0 0 0-2.828L17.146 3.182a2 2 0 0 0-2.828 0L4 13.5z" />
            </svg>
            <span>Edit</span>
          </>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.5)"
          }}
        >
          <div style={{ position: "relative", width: "100%", maxWidth: "1000px", margin: "0 16px" }}>
            <div className="bg-white rounded-xl shadow-xl overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">Edit Package</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loading ? (
                <div className="p-6 text-center">Loading...</div>
              ) : error ? (
                <div className="p-6 text-red-600">{error}</div>
              ) : (
                <div className="md:flex">
                  {/* LEFT - Image Preview */}
                  <div className="md:w-2/5 p-6 bg-gray-50">
                    <div
                      className="w-full rounded-xl border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center bg-gray-100"
                      style={{ height: 300 }}
                    >
                      {preview ? (
                        <img src={preview} alt="preview" className="object-cover w-full h-full" />
                      ) : (
                        <div className="text-gray-500">No Image</div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-3">
                      <label className="px-4 py-2 bg-green-100 text-green-800 rounded cursor-pointer text-sm">
                        Choose Files
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      </label>
                      <button
                        type="button"
                        className="px-4 py-2 border border-gray-300 rounded text-gray-700 text-sm"
                        onClick={() => {
                          setSelectedFile(null);
                          const orig = pkg?.Photo || (pkg?.photos ? pkg.photos[0] : null) || null;
                          if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
                          setPreview(orig);
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* RIGHT - Form */}
                  <div className="md:w-3/5 p-6">
                    <div className="space-y-4">
                      {/* Package Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={form.Package_Name}
                          onChange={(e) => setForm({ ...form, Package_Name: e.target.value })}
                        />
                      </div>

                      {/* Grid Layout for Numbers */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tables</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            value={form.NumTables}
                            onChange={(e) => setForm({ ...form, NumTables: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Round Tables</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            value={form.NumRoundTables}
                            onChange={(e) => setForm({ ...form, NumRoundTables: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Chairs</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            value={form.NumChairs}
                            onChange={(e) => setForm({ ...form, NumChairs: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tents</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            value={form.NumTent}
                            onChange={(e) => setForm({ ...form, NumTent: Number(e.target.value) })}
                          />
                        </div>
                      </div>

                      {/* Platform with checkbox */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <label className="block text-sm font-medium text-gray-700">Platform</label>
                          <input
                            type="checkbox"
                            checked={form.NumPlatform > 0}
                            onChange={(e) => setForm({ ...form, NumPlatform: e.target.checked ? 1 : 0 })}
                          />
                          <span className="text-sm text-gray-500">Include Platform</span>
                        </div>
                      </div>

                      {/* Photos label (for consistency with design) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Photos</label>
                        <div className="text-sm text-gray-500">See preview on the left</div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          rows="4"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={form.Description}
                          onChange={(e) => setForm({ ...form, Description: e.target.value })}
                        />
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={form.Package_Amount}
                          onChange={(e) => setForm({ ...form, Package_Amount: e.target.value })}
                        />
                      </div>

                      {error && <div className="text-red-600 text-sm">{error}</div>}

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save Package"}
                        </button>
                        <button
                          onClick={() => setOpen(false)}
                          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Keep this for backward compatibility if other files import EditPackage
export { EditPackageButton as EditPackage };
