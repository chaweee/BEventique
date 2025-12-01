import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BookingManagement.css";

export default function BookingManagement() {
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' or 'edit'
  
  // Form State
  const [formData, setFormData] = useState({
    booking_id: null,
    package_id: "",
    event_type: "",
    event_date: "",
    event_time: "",
    location: "",
    guest_count: 0,
    notes: ""
  });

  // Check Login & Initial Fetch
  useEffect(() => {
    const user = sessionStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }
    
    // Check for query params (e.g., coming from "Book Now" button on packages page)
    const params = new URLSearchParams(location.search);
    const preSelectedPackage = params.get("package");

    fetchData(preSelectedPackage);
  }, [navigate, location.search]);

  // Fetch Bookings and Packages
  const fetchData = async (preSelectedPackageId) => {
    try {
      setLoading(true);
      const user = JSON.parse(sessionStorage.getItem("user"));
      const userId = user.id || user.Account_ID; // Handle different ID field names

      // 1. Fetch Packages (for the dropdown)
      const pkgRes = await fetch("http://localhost:3001/api/packages/list");
      const pkgData = await pkgRes.json();
      const pkgList = Array.isArray(pkgData) ? pkgData : pkgData.packages || [];
      setPackages(pkgList);

      // 2. Fetch User's Bookings
      const bookRes = await fetch(`http://localhost:3001/api/bookings/my-bookings/${userId}`);
      const bookData = await bookRes.json();

      if (bookData.status === "success") {
        setBookings(bookData.bookings);
      } else {
        // If no bookings yet, just set empty
        setBookings([]);
      }

      // 3. Open Modal if package was pre-selected
      if (preSelectedPackageId) {
        resetForm();
        setFormData(prev => ({ ...prev, package_id: preSelectedPackageId }));
        setModalMode("create");
        setShowModal(true);
      }

    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load booking data.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("flash");
    navigate("/login");
  };

  // Open Modal for Creating
  const openCreateModal = () => {
    resetForm();
    setModalMode("create");
    setShowModal(true);
  };

  // Open Modal for Editing
  const openEditModal = (booking) => {
    // Format date for HTML input (YYYY-MM-DD)
    const dateObj = new Date(booking.event_date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    setFormData({
      booking_id: booking.booking_id,
      package_id: booking.package_id,
      event_type: booking.event_type,
      event_date: formattedDate,
      event_time: booking.event_time,
      location: booking.location,
      guest_count: booking.guest_count,
      notes: booking.notes || ""
    });
    setModalMode("edit");
    setShowModal(true);
  };

  // Reset Form
  const resetForm = () => {
    setFormData({
      booking_id: null,
      package_id: "",
      event_type: "",
      event_date: "",
      event_time: "",
      location: "",
      guest_count: 0,
      notes: ""
    });
  };

  // Handle Form Submit (Create or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    const user = JSON.parse(sessionStorage.getItem("user"));
    const userId = user.id || user.Account_ID;

    try {
      let url = "";
      let method = "";
      let body = {};

      if (modalMode === "create") {
        url = "http://localhost:3001/api/bookings/create";
        method = "POST";
        body = { ...formData, client_id: userId };
      } else {
        url = `http://localhost:3001/api/bookings/update/${formData.booking_id}`;
        method = "PUT";
        body = formData;
      }

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (data.status === "success") {
        setShowModal(false);
        // Refresh list
        const bookRes = await fetch(`http://localhost:3001/api/bookings/my-bookings/${userId}`);
        const bookData = await bookRes.json();
        setBookings(bookData.bookings || []);
      } else {
        alert(data.message || "Operation failed");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Server error occurred.");
    }
  };

  // Handle Cancellation
  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const res = await fetch(`http://localhost:3001/api/bookings/status/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" })
      });
      const data = await res.json();
      
      if (data.status === "success") {
        // Re-fetch data to ensure UI matches Database perfectly
        const user = JSON.parse(sessionStorage.getItem("user"));
        const userId = user.id || user.Account_ID;
        
        const bookRes = await fetch(`http://localhost:3001/api/bookings/my-bookings/${userId}`);
        const bookData = await bookRes.json();
        setBookings(bookData.bookings || []);
      } else {
        alert(data.message || "Failed to cancel booking");
      }
    } catch (err) {
      console.error("Cancel error:", err);
      alert("Could not connect to server to cancel booking.");
    }
  };

  // Format Date for Display
  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
  };

  // Helper for status colors
  const getStatusClass = (status) => {
    switch(status) {
      case 'confirmed': return 'status-confirmed';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  return (
    <div className="bm-root">
      {/* Navbar (Reusable) */}
      <header className="bm-navbar">
        <div className="bm-navbar-container">
          <div className="bm-navbar-brand">
            <h1 className="bm-brand-title">Baby's Eventique</h1>
          </div>
          <nav className="bm-nav">
            <button className="bm-link" onClick={() => navigate("/customer-home")}>HOME</button>
            <button className="bm-link" onClick={() => navigate("/customer-packages")}>PACKAGES</button>
            <button className="bm-link active" onClick={() => navigate("/bookings")}>MANAGE BOOKINGS</button>
            <button className="bm-link" onClick={() => navigate("/design-queries")}>DESIGN QUERIES</button>
            <div className="bm-link bm-logout" onClick={handleLogout}>LOGOUT</div>
          </nav>
        </div>
      </header>

      <main className="bm-main">
        <div className="bm-container">
          <div className="bm-header">
            <div>
              <h1>My Bookings</h1>
              <p>Manage your upcoming events and view history</p>
            </div>
            <button className="bm-create-btn" onClick={openCreateModal}>
              + New Booking
            </button>
          </div>

          {loading && <div className="bm-loading">Loading bookings...</div>}
          
          {!loading && bookings.length === 0 && (
            <div className="bm-empty">
              <p>You haven't booked any events yet.</p>
              <button onClick={() => navigate("/customer-packages")}>Browse Packages</button>
            </div>
          )}

          <div className="bm-grid">
            {bookings.map((booking) => (
              <div key={booking.booking_id} className={`bm-card ${booking.status === 'cancelled' ? 'dimmed' : ''}`}>
                <div className="bm-card-header">
                  <span className="bm-date-badge">
                    {new Date(booking.event_date).getDate()}
                    <small>{new Date(booking.event_date).toLocaleDateString('en-US', { month: 'short' })}</small>
                  </span>
                  <div className="bm-card-title-group">
                    <h3>{booking.event_type}</h3>
                    <span className={`bm-status-badge ${getStatusClass(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                </div>

                <div className="bm-card-body">
                  <div className="bm-info-row">
                    <strong>Package:</strong> 
                    <span>{booking.Package_Name || "Custom Package"}</span>
                  </div>
                  <div className="bm-info-row">
                    <strong>Time:</strong> 
                    <span>{booking.event_time}</span>
                  </div>
                  <div className="bm-info-row">
                    <strong>Location:</strong> 
                    <span>{booking.location}</span>
                  </div>
                  <div className="bm-info-row">
                    <strong>Guests:</strong> 
                    <span>{booking.guest_count}</span>
                  </div>
                  <div className="bm-info-row price">
                    <strong>Total:</strong> 
                    <span>₱{Number(booking.total_amount || booking.Package_Amount).toLocaleString()}</span>
                  </div>
                </div>

                {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                  <div className="bm-card-actions">
                    <button 
                      className="bm-btn-edit" 
                      onClick={() => openEditModal(booking)}
                    >
                      Edit Details
                    </button>
                    <button 
                      className="bm-btn-cancel" 
                      onClick={() => handleCancel(booking.booking_id)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="bm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="bm-modal-content" onClick={e => e.stopPropagation()}>
            <div className="bm-modal-header">
              <h2>{modalMode === 'create' ? 'Book an Event' : 'Update Booking'}</h2>
              <button className="bm-close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="bm-form">
              {/* Package Selection - Only editable in create mode */}
              <div className="bm-form-group">
                <label>Select Package</label>
                <select 
                  value={formData.package_id}
                  onChange={e => setFormData({...formData, package_id: e.target.value})}
                  required
                  disabled={modalMode === 'edit'} // Lock package when editing logistics
                >
                  <option value="">-- Choose a Package --</option>
                  {packages.map(pkg => (
                    <option key={pkg.Package_ID} value={pkg.Package_ID}>
                      {pkg.Package_Name} - ₱{Number(pkg.Package_Amount).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bm-form-row">
                <div className="bm-form-group">
                  <label>Event Type</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Birthday, Wedding"
                    value={formData.event_type}
                    onChange={e => setFormData({...formData, event_type: e.target.value})}
                    required
                  />
                </div>
                <div className="bm-form-group">
                  <label>Guest Count</label>
                  <input 
                    type="number" 
                    min="1"
                    value={formData.guest_count}
                    onChange={e => setFormData({...formData, guest_count: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="bm-form-row">
                <div className="bm-form-group">
                  <label>Date</label>
                  <input 
                    type="date" 
                    value={formData.event_date}
                    onChange={e => setFormData({...formData, event_date: e.target.value})}
                    required
                  />
                </div>
                <div className="bm-form-group">
                  <label>Time</label>
                  <input 
                    type="time" 
                    value={formData.event_time}
                    onChange={e => setFormData({...formData, event_time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="bm-form-group">
                <label>Location / Venue Address</label>
                <input 
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  required
                />
              </div>

              <div className="bm-form-group">
                <label>Notes / Special Requests</label>
                <textarea 
                  rows="3"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <div className="bm-form-actions">
                <button type="button" className="bm-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="bm-btn-primary">
                  {modalMode === 'create' ? 'Submit Booking' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="bm-footer">
        <div>Contact: events@babys-eventique.ph • +63 917 123 4567</div>
        <div>© 2025 Baby's Eventique</div>
      </footer>
    </div>
  );
}
