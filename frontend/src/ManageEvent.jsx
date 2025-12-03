import React, { useState, useEffect } from "react";

export default function ManageEvent() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:3001/api/bookings/all");
      const data = await res.json();
      if (data.status === "success") setBookings(data.bookings);
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const updateStatus = async (id, newStatus) => {
    if(!window.confirm(`Mark this booking as ${newStatus}?`)) return;
    try {
      await fetch(`http://localhost:3001/api/bookings/status/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      fetchBookings(); // Refresh list
    } catch(err) { alert("Error updating status"); }
  };

  return (
    <div className="table-container">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Client</th>
            <th>Event Type</th>
            <th>Package</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(b => (
            <tr key={b.booking_id}>
              <td>{new Date(b.event_date).toLocaleDateString()}</td>
              <td>
                <div>{b.client_name}</div>
                <small>{b.client_email}</small>
              </td>
              <td>{b.event_type}</td>
              <td>{b.Package_Name}</td>
              <td><span className={`badge ${b.status}`}>{b.status}</span></td>
              <td>
                <select 
                  value={b.status} 
                  onChange={(e) => updateStatus(b.booking_id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirm</option>
                  <option value="completed">Complete</option>
                  <option value="cancelled">Cancel</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
