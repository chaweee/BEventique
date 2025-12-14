// ManageBookings.jsx (or similar file for managing bookings)

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CoolButton from './CoolButton';
import './ManageBookings.css';

export default function ManageBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState({
    package_id: "",
    event_type: "",
    date: "",
    time: "",
    location: "",
    notes: ""
  });

  // Receipt modal state and ref
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const receiptRef = useRef(null);

  // Fetch bookings for the user
  useEffect(() => {
    const fetchBookings = async () => {
      const response = await fetch("http://localhost:3001/api/bookings");
      const data = await response.json();
      if (data.status === "success") {
        setBookings(data.bookings);
      }
    };
    fetchBookings();
  }, []);

  // Open edit modal for a booking
  const handleEditClick = (booking) => {
    setSelectedBooking(booking);
    setForm({
      package_id: booking.package_id,
      // Fixed event type derived from booking/package fields
      event_type: booking.event_type || booking.Event_Type || booking.EventType || booking.Type || booking.package_event_type || booking.Package_Event_Type || "",
      date: booking.event_date,
      time: booking.event_time,
      location: booking.location,
      notes: booking.notes
    });
    setShowEditModal(true);
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Prevent editing of fixed fields and ignore guest_count if present
    if (name === "event_type" || name === "guest_count") return;
    setForm({ ...form, [name]: value });
  };

  // Submit updated booking details
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        booking_id: selectedBooking.id,
        package_id: form.package_id,
        event_type: form.event_type || null,
        date: form.date,
        time: form.time,
        location: form.location,
        notes: form.notes
      };

      const response = await fetch(`http://localhost:3001/api/bookings/${selectedBooking.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.status === "success") {
        setBookings((prev) => prev.map((b) => (b.id === selectedBooking.id ? { ...b, ...form } : b)));
        setShowEditModal(false);

        // Build receipt data (include what you have on selectedBooking + form)
        const receipt = {
          booking_id: selectedBooking.id,
          customer_name: selectedBooking.client_name || `${selectedBooking.FirstName || ''} ${selectedBooking.LastName || ''}`.trim() || "Customer",
          customer_email: selectedBooking.client_email || selectedBooking.Email || "",
          customer_phone: selectedBooking.client_phone || selectedBooking.PhoneNumber || "",
          package_name: selectedBooking.package_name || selectedBooking.Package_Name || "",
          package_price: selectedBooking.total_price || selectedBooking.Package_Amount || selectedBooking.base_price || 0,
          event_date: form.date,
          event_time: form.time,
          location: form.location,
          notes: form.notes
        };

        setReceiptData(receipt);
        setReceiptOpen(true);

      } else {
        alert("Error updating booking: " + result.message);
      }
    } catch (err) {
      console.error("Error updating booking:", err);
      alert("Failed to update booking. Please try again.");
    }
  };

  // helper to load html2canvas from CDN if not available
  const loadHtml2Canvas = () => {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) return resolve(window.html2canvas);
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = () => resolve(window.html2canvas);
      s.onerror = () => reject(new Error('Failed to load html2canvas'));
      document.body.appendChild(s);
    });
  };

  // Download receipt as image
  const downloadReceiptImage = async () => {
    if (!receiptRef.current) return;
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(receiptRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const el = document.createElement('a');
      el.href = URL.createObjectURL(blob);
      el.download = `Receipt-Booking-${receiptData?.booking_id || 'receipt'}.jpg`;
      document.body.appendChild(el);
      el.click();
      document.body.removeChild(el);
    } catch (err) {
      console.error('Error creating receipt image:', err);
      alert('Failed to create receipt image');
    }
  };

  return (
    <div className="manage-bookings">
      <h1>My Bookings</h1>
      <div className="bookings-list">
        {bookings.map((booking) => (
          <div key={booking.id} className="booking-item">
            <div className="booking-details">
              <h2>{booking.package_name}</h2>
              <p>{booking.event_date} at {booking.event_time}</p>
              <p>{booking.location}</p>
              <button onClick={() => handleEditClick(booking)}>Edit Details</button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Booking Modal */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2>Edit Booking Details</h2>
            <form onSubmit={handleSubmit}>
              {/* Event Type (fixed per package, display only) */}
              <div className="form-group">
                <label>Event Type</label>
                <p style={{ margin: 0, padding: '8px', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px' }}>{form.event_type || "General"}</p>
              </div>

              <div className="form-group">
                <label>Event Date</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Event Time</label>
                <input
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal (large) */}
      {receiptOpen && receiptData && (
        <div className="modal-backdrop" style={{ zIndex: 1400 }}>
          <div
            className="modal-card"
            style={{
              width: '760px',
              maxWidth: '95vw',
              borderRadius: 12,
              padding: 20,
              background: '#fff',
              boxShadow: '0 18px 50px rgba(0,0,0,0.35)'
            }}
          >
            <div ref={receiptRef} style={{ padding: 20, background: '#fff' }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0, color: '#8b4513' }}>Eventique Receipt</h2>
                <div style={{ color: '#6b7280' }}>Booking #{receiptData.booking_id}</div>
              </div>

              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ marginBottom: 8 }}>Customer</h4>
                  <div style={{ marginBottom: 6 }}><strong>{receiptData.customer_name}</strong></div>
                  <div style={{ color: '#6b7280', marginBottom: 4 }}>Email: {receiptData.customer_email || '—'}</div>
                  <div style={{ color: '#6b7280' }}>Phone: {receiptData.customer_phone || '—'}</div>
                </div>

                <div style={{ flex: 1 }}>
                  <h4 style={{ marginBottom: 8 }}>Event</h4>
                  <div style={{ color: '#6b7280', marginBottom: 4 }}>Date: {new Date(receiptData.event_date).toLocaleDateString()}</div>
                  <div style={{ color: '#6b7280', marginBottom: 4 }}>Time: {receiptData.event_time || '—'}</div>
                  <div style={{ color: '#6b7280' }}>Location: {receiptData.location || '—'}</div>
                </div>
              </div>

              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#6b7280', fontSize: 14 }}>Package</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{receiptData.package_name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#6b7280' }}>Total</div>
                  <div style={{ fontWeight: 800, fontSize: 20, color: '#1f2937' }}>₱{Number(receiptData.package_price || 0).toLocaleString()}</div>
                </div>
              </div>

              {receiptData.notes && (
                <div style={{ marginTop: 12, padding: 10, background: '#fff7ed', borderRadius: 8 }}>
                  <strong style={{ color: '#92400e' }}>Notes:</strong>
                  <div style={{ color: '#92400e' }}>{receiptData.notes}</div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => { setReceiptOpen(false); setReceiptData(null); }}
                style={{ padding: '8px 16px', borderRadius: 8, background: '#e5e7eb', border: 'none', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={downloadReceiptImage}
                style={{ padding: '8px 18px', borderRadius: 8, background: '#8b4513', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Download Receipt (JPEG)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Rendering Section */}
      <div className="dq-messages" style={{padding: "32px 0 0 0"}}>
        {messages.map((msg, idx) => {
          // Determine sender type
          const isAdmin = msg.sender_role === "admin" || msg.sender === "Admin";
          const isDesigner = msg.sender_role === "designer" || msg.sender === "Designer";
          const isCustomer = msg.sender_role === "customer" || msg.sender === "Customer";

          // Bubble alignment and style
          let bubbleClass = "dq-message";
          if (isDesigner) bubbleClass += " designer";
          else if (isAdmin) bubbleClass += " admin";
          else bubbleClass += " customer";

          // Format date/time
          const sentAt = msg.sent_at || msg.created_at || msg.timestamp;
          const formattedTime = sentAt
            ? new Date(sentAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })
            : "";

          return (
            <div key={msg.id || idx} className={bubbleClass}>
              <div className="message-bubble">
                <div className="message-header">
                  <strong>
                    {isAdmin
                      ? "Admin"
                      : isDesigner
                      ? (msg.sender_name || "Designer")
                      : msg.sender_name || msg.sender}
                  </strong>
                  <span className="message-time">{formattedTime}</span>
                </div>
                <div className="message-text">{msg.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}