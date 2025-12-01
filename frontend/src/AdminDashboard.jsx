import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, bookings, payments
  
  // Data States
  const [stats, setStats] = useState({ total_bookings: 0, pending_bookings: 0, revenue: 0, total_users: 0 });
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch Data based on active tab
  useEffect(() => {
    if (activeTab === "dashboard") fetchStats();
    if (activeTab === "bookings") fetchBookings();
    if (activeTab === "payments") fetchPayments();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/admin/stats");
      const data = await res.json();
      if (data.status === "success") setStats(data.stats);
    } catch (err) { console.error(err); }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:3001/api/bookings/all");
      const data = await res.json();
      if (data.status === "success") setBookings(data.bookings);
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:3001/api/admin/payments");
      const data = await res.json();
      if (data.status === "success") setPayments(data.payments);
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  // Helper to update booking status
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
    <div className="admin-root">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
            <h2>Admin Panel</h2>
            <p>Baby's Eventique</p>
        </div>
        <nav className="sidebar-nav">
            <button 
                className={activeTab === "dashboard" ? "active" : ""} 
                onClick={() => setActiveTab("dashboard")}
            >
                Dashboard
            </button>
            <button 
                className={activeTab === "bookings" ? "active" : ""} 
                onClick={() => setActiveTab("bookings")}
            >
                Manage Schedule
            </button>
            <button 
                className={activeTab === "payments" ? "active" : ""} 
                onClick={() => setActiveTab("payments")}
            >
                Manage Payments
            </button>
            <button 
                className={activeTab === "queries" ? "active" : ""} 
                onClick={() => setActiveTab("queries")}
            >
                Customer Queries
            </button>
        </nav>
        <button className="sidebar-logout" onClick={handleLogout}>Logout</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="admin-content">
        <header className="content-header">
            <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
            <div className="user-profile">Administrator</div>
        </header>

        <div className="content-body">
            {/* VIEW: DASHBOARD */}
            {activeTab === "dashboard" && (
                <div className="dashboard-grid">
                    <div className="stat-card">
                        <h3>Total Revenue</h3>
                        <p>₱{Number(stats.revenue).toLocaleString()}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Total Bookings</h3>
                        <p>{stats.total_bookings}</p>
                    </div>
                    <div className="stat-card warning">
                        <h3>Pending Requests</h3>
                        <p>{stats.pending_bookings}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Registered Users</h3>
                        <p>{stats.total_users}</p>
                    </div>
                </div>
            )}

            {/* VIEW: BOOKINGS */}
            {activeTab === "bookings" && (
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
            )}

            {/* VIEW: PAYMENTS */}
            {activeTab === "payments" && (
                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Booking ID</th>
                                <th>Client</th>
                                <th>Amount Due</th>
                                <th>Payment Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(p => (
                                <tr key={p.booking_id}>
                                    <td>#{p.booking_id}</td>
                                    <td>{p.client_name}</td>
                                    <td className="amount">₱{Number(p.total_amount).toLocaleString()}</td>
                                    <td>
                                        {/* Simple logic: if booking confirmed/completed, assume paid for now */}
                                        {['confirmed', 'completed'].includes(p.booking_status) 
                                            ? <span className="badge completed">Paid</span>
                                            : <span className="badge pending">Unpaid / Pending</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* VIEW: QUERIES (Placeholder) */}
            {activeTab === "queries" && (
                 <div className="empty-state">
                    <p>Customer query system integration coming soon.</p>
                 </div>
            )}
        </div>
      </main>
    </div>
  );
}
