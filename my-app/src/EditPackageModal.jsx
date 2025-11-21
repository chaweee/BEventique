import React, { useEffect, useState } from "react";

/*
Props:
 - isOpen: boolean
 - packageId: id to load
 - onClose(): close modal
 - onSaved(): called after successful save (parent should refresh list)
*/
export default function EditPackageModal({ isOpen, packageId, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [pkg, setPkg] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    id: "",
    Package_Name: "",
    description: "",
    NumTables: 0,
    NumRoundTables: 0,
    NumChairs: 0,
    NumTent: 0,
    NumPlatform: 0,
    Package_Amount: "",
  };

  const [form, setForm] = useState(emptyForm);

  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);

  /* ----------------------------------------------
      LOAD PACKAGE WHEN OPENED
  ---------------------------------------------- */
  useEffect(() => {
    if (!isOpen || !packageId) return;

    let mounted = true;
    setLoading(true);
    setError("");

    fetch(`/Eventique/api/get_package.php?id=${encodeURIComponent(packageId)}`, {
      credentials: "include",
    })
      .then(async (r) => {
        const contentType = r.headers.get("content-type") || "";
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`HTTP ${r.status}: ${text.slice(0,200)}`);
        }
        if (!contentType.includes("application/json")) {
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

          // Fill ALL fields with correct names
          setForm({
  id: p.id,                                // REAL ID
  Package_Name: p.Package_Name || "",
  description: p.Description || "",        // CASE SENSITIVE: Description
  NumTables: p.NumTables || 0,
  NumRoundTables: p.NumRoundTables || 0,
  NumChairs: p.NumChairs || 0,
  NumTent: p.NumTent || 0,
  NumPlatform: p.NumPlatform || 0,
  Package_Amount: p.Package_Amount || ""
});


          // preview photo
          const img =
            p.Photo ??
            (Array.isArray(p.photos) ? p.photos[0] : null) ??
            null;

          setPreview(img);
          setFile(null);
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
  }, [isOpen, packageId]);

  /* ----------------------------------------------
      CLEANUP WHEN CLOSED
  ---------------------------------------------- */
  // Cleanup when modal closes
useEffect(() => {
  if (!isOpen) {
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setPkg(null);
    setFile(null);
    setPreview(null);
    setForm(emptyForm);
    setError("");
  }

// eslint-disable-next-line react-hooks/exhaustive-deps
}, [isOpen]);

  /* ----------------------------------------------
      SELECT NEW IMAGE
  ---------------------------------------------- */
  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);

    const url = URL.createObjectURL(f);
    setPreview(url);
    setFile(f);
  };

  /* ----------------------------------------------
      SAVE CHANGES
  ---------------------------------------------- */
  const handleSave = async () => {
    setError("");

    if (!form.Package_Name) {
      setError("Package name required");
      return;
    }
    if (!form.id) {
      setError("Package ID is missing — cannot save.");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("id", form.id);
      fd.append("Package_Name", form.Package_Name);
      fd.append("Description", form.description ?? "");
      fd.append("NumTables", String(form.NumTables));
      fd.append("NumRoundTables", String(form.NumRoundTables));
      fd.append("NumChairs", String(form.NumChairs));
      fd.append("NumTent", String(form.NumTent));
      fd.append("NumPlatform", String(form.NumPlatform));
      fd.append("Package_Amount", String(form.Package_Amount));

      if (file) fd.append("photo", file);

      const res = await fetch("/Eventique/api/update_package.php", {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0,200)}`);
      }
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error("Expected JSON but received non-JSON response: " + text.slice(0,200));
      }

      const json = await res.json();

      if (json?.status === "success") {
        onSaved && onSaved();
        onClose();
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

  if (!isOpen) return null;

  /* ----------------------------------------------
      RENDER MODAL
  ---------------------------------------------- */
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      <div style={{ position: "relative", width: "100%", maxWidth: "1200px", margin: "0 16px" }}>
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="md:flex">

            {/* LEFT SIDE */}
            <div className="md:w-2/5 p-6 flex flex-col items-center gap-4">
              <div
                className="w-full rounded-xl border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center bg-gray-50"
                style={{ height: 300 }}
              >
                {loading ? (
                  <div className="text-gray-500">Loading...</div>
                ) : preview ? (
                  <img src={preview} alt="preview" className="object-cover w-full h-full" />
                ) : (
                  <div className="text-gray-500">No Image</div>
                )}
              </div>

              <div className="w-full flex items-center gap-3">
                <label className="px-4 py-2 bg-green-100 text-green-800 rounded cursor-pointer">
                  Select Photo
                  <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                </label>

                <button
                  type="button"
                  className="px-4 py-2 border rounded text-gray-700"
                  onClick={() => {
                    setFile(null);
                    const orig =
                      pkg?.Photo ??
                      (pkg?.photos ? pkg.photos[0] : null) ??
                      null;

                    if (preview && preview.startsWith("blob:"))
                      URL.revokeObjectURL(preview);

                    setPreview(orig);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* RIGHT FORM */}
            <div className="md:w-3/5 p-6">
              <div className="space-y-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Package Name
                  </label>
                  <input
                    className="mt-1 block w-full rounded-md border-gray-200 shadow-sm"
                    type="text"
                    value={form.Package_Name}
                    onChange={(e) => setForm({ ...form, Package_Name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-200 shadow-sm"
                    rows="3"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                {/* GRID INPUTS */}
                <div className="grid grid-cols-2 gap-4">
                  <InputNum label="NumTables" value={form.NumTables} onChange={(v) => setForm({ ...form, NumTables: v })} />
                  <InputNum label="NumRoundTables" value={form.NumRoundTables} onChange={(v) => setForm({ ...form, NumRoundTables: v })} />
                  <InputNum label="NumChairs" value={form.NumChairs} onChange={(v) => setForm({ ...form, NumChairs: v })} />
                  <InputNum label="NumTent" value={form.NumTent} onChange={(v) => setForm({ ...form, NumTent: v })} />
                  <InputNum label="NumPlatform" value={form.NumPlatform} onChange={(v) => setForm({ ...form, NumPlatform: v })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-200"
                    value={form.Package_Amount}
                    onChange={(e) =>
                      setForm({ ...form, Package_Amount: e.target.value })
                    }
                  />
                </div>

                {error && <div className="text-red-600">{error}</div>}

                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-green-500 text-white rounded"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    onClick={onClose}
                    className="px-4 py-2 border rounded"
                  >
                    Cancel
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------
    REUSABLE NUMBER INPUT COMPONENT
---------------------------------------------- */
function InputNum({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="number"
        min="0"
        className="mt-1 block w-full rounded-md border-gray-200"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
