import React, { useEffect, useState } from "react";

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const safeJson = async (res) => {
    const text = await res.text();
    try { return JSON.parse(text); } catch { throw new Error(`Expected JSON, got: ${text.slice(0,200)}`); }
  };

  useEffect(() => {
    fetch('http://localhost:3001/api/packages/list')
      .then((res) => safeJson(res))
      .then((data) => {
        setPackages(data.packages || data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {packages.map((pkg) => (
        <div
          key={pkg.Package_ID}
          className="bg-white/10 border border-white/10 rounded-xl p-5 text-white shadow-lg backdrop-blur-xl"
        >
          <h2 className="text-xl font-bold mb-2">{pkg.Package_Name}</h2>

          <p className="text-sm opacity-80">{pkg.Description}</p>

          <div className="mt-3 text-sm space-y-1">
            <p>Tables: {pkg.NumTables}</p>
            <p>Chairs: {pkg.NumChairs}</p>
            <p>Tent: {pkg.NumTent}</p>
            <p>Platform: {pkg.NumPlatform}</p>
          </div>

          <p className="mt-4 text-lg font-semibold">
            ₱ {pkg.Package_Amount.toLocaleString()}
          </p>

          <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg">
            View Layout
          </button>
        </div>
      ))}
    </div>
  );
}
