import React, { useState, useEffect, useRef } from "react";
import PaymentReceipt from "./components/PaymentReceipt";
import { downloadDomAsImage } from "./lib/downloadDomAsImage";

// Custom Modal for payment input
function PaymentModal({ open, onClose, onSubmit, booking }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setAmount("");
      setError("");
    }
  }, [open, booking]);

  if (!open || !booking) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.18)", zIndex: 1301,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, minWidth: 400, maxWidth: 420,
        boxShadow: "0 4px 32px #0002", padding: "0 0 28px 0", textAlign: "center", position: 'relative', border: '1.5px solid #e5e5e5'
      }}>
        <div style={{padding: '26px 0 12px 0', borderBottom: '1.5px solid #f3f3f3', marginBottom: 0}}>
          <h2 style={{margin: 0, color: "#7a4a13", fontWeight: 800, fontSize: 26, letterSpacing: 0.5}}>Add Payment</h2>
        </div>
        <div style={{padding: '24px 32px 0 32px'}}>
          <div style={{marginBottom: 18, color: '#222', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div style={{fontSize: 22, color: '#7a4a13', fontWeight: 800, marginBottom: 4, letterSpacing: 0.5}}>
              Booking <span style={{color:'#222'}}>#{booking.booking_id}</span>
            </div>
            <div style={{fontSize: 22, color: '#7a4a13', fontWeight: 800, letterSpacing: 0.5}}>
              Amount due: <span style={{color:'#222'}}>₱{Number(booking.amount_due).toLocaleString()}</span>
            </div>
          </div>
          <div style={{marginBottom: 18, textAlign: "left", background: '#faf9f7', borderRadius: 8, padding: '14px 16px 8px 16px', border: '1.2px solid #e5e5e5'}}>
            <div style={{fontWeight: 700, color: "#7a4a13", fontSize: 15, marginBottom: 8, letterSpacing: 0.2}}>Customer Details</div>
            <div style={{fontSize: 16, color: '#222', fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8}}>
              {booking.client_name || booking.customer_name || <span style={{color:'#aaa'}}>No name</span>}
            </div>
            <div style={{display: 'flex', gap: 12, marginTop: 4}}>
              <div style={{flex: 1, fontSize: 15, color: '#555', display: 'flex', alignItems: 'center', gap: 6}}>
                {booking.client_email || booking.customer_email || <span style={{color:'#aaa'}}>No email</span>}
              </div>
              <div style={{flex: 1, fontSize: 15, color: '#555', display: 'flex', alignItems: 'center', gap: 6}}>
                {booking.client_phone || booking.customer_phone || <span style={{color:'#aaa'}}>No phone</span>}
              </div>
            </div>
          </div>
          <div style={{marginBottom: 10, marginTop: 10}}>
            <input
              type="number"
              min="1"
              step="any"
              placeholder="Enter amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{
                width: "100%", padding: "12px 14px", fontSize: 17, borderRadius: 7,
                border: "1.5px solid #7a4a13", marginBottom: 0, outline: 'none', background: '#fff', color: '#222', fontWeight: 600, boxSizing: 'border-box', transition: 'border 0.2s'
              }}
            />
          </div>
          {error && <div style={{color: "#b91c1c", marginBottom: 8, fontSize: 14, fontWeight: 600}}>{error}</div>}
          <div style={{display: "flex", gap: 12, justifyContent: "center", marginTop: 18}}>
            <button
              style={{
                background: "#7a4a13", color: "#fff", border: "none", borderRadius: 7,
                padding: "11px 30px", fontWeight: 700, fontSize: 16, cursor: "pointer", letterSpacing: 0.2, transition: 'background 0.2s'
              }}
              onClick={() => {
                const amt = parseFloat(amount);
                if (isNaN(amt) || amt <= 0) {
                  setError("Invalid amount.");
                  return;
                }
                setError("");
                onSubmit(amt, {
                  name: booking.client_name || booking.customer_name || "",
                  email: booking.client_email || booking.customer_email || "",
                  phone: booking.client_phone || booking.customer_phone || ""
                });
              }}
            >
              Submit
            </button>
            <button
              style={{
                background: "#f5f5f5", color: "#7a4a13", border: "1.2px solid #e5e5e5", borderRadius: 7,
                padding: "11px 30px", fontWeight: 700, fontSize: 16, cursor: "pointer", letterSpacing: 0.2
              }}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Unique Add Payment Button
function AddPaymentButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "linear-gradient(90deg,#f59e42 0,#a0522d 100%)",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "8px 18px",
        fontWeight: 600,
        fontSize: 15,
        cursor: "pointer",
        boxShadow: "0 2px 8px #a0522d22",
        transition: "background 0.2s"
      }}
    >
      <span role="img" aria-label="Add Payment" style={{marginRight: 6}}>💸</span>
      Add Payment
    </button>
  );
}

export default function ManagePayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const receiptRef = useRef(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:3001/api/admin/payments");
      const data = await res.json();
      if (data.status === "success") setPayments(data.payments);
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  // Add payment handler
  const handleAddPayment = (booking) => {
    setSelectedBooking(booking);
    setModalOpen(true);
  };

  // After payment, show receipt modal
  const handleModalSubmit = async (amount, customer) => {
    try {
      const res = await fetch(`http://localhost:3001/api/admin/payments/${selectedBooking.booking_id}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, ...customer })
      });
      const data = await res.json();
      setModalOpen(false);
      setSelectedBooking(null);
      if (data.status === "success") {
        // Compose receipt data
        setReceiptData({
          ...selectedBooking,
          ...customer,
          amount_paid: amount,
          payment_date: new Date().toISOString(),
        });
        setShowReceipt(true);
        fetchPayments();
      } else {
        alert(data.message || "Failed to add payment.");
      }
    } catch (err) {
      setModalOpen(false);
      setSelectedBooking(null);
      alert("Server error.");
    }
  };

  // Download receipt as image
  const handleDownloadReceipt = async () => {
    if (receiptRef.current) {
      await downloadDomAsImage(receiptRef.current, `receipt_${receiptData?.booking_id || ''}.jpg`);
    }
  };

  return (
    <div className="table-container">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Date</th>
            <th>Client</th>
            <th>Package</th>
            <th>Amount Due</th>
            <th>Paid</th>
            <th>Payment Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => {
            const isPaid = Number(p.amount_paid || 0) >= Number(p.amount_due || 0);
            return (
              <tr key={p.booking_id}>
                <td>#{p.booking_id}</td>
                <td>{new Date(p.event_date).toLocaleDateString()}</td>
                <td>{p.client_name}</td>
                <td>{p.Package_Name}</td>
                <td className="amount">₱{Number(p.amount_due).toLocaleString()}</td>
                <td className="amount">₱{Number(p.amount_paid || 0).toLocaleString()}</td>
                <td>
                  <span
                    className={`badge ${isPaid ? "completed" : "pending"}`}
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      padding: "8px 22px",
                      borderRadius: "16px",
                      background: isPaid ? "#d1fae5" : "#fef3c7",
                      color: isPaid ? "#065f46" : "#92400e",
                      letterSpacing: "1px",
                      display: "inline-block"
                    }}
                  >
                    {isPaid ? "PAID" : "UNPAID"}
                  </span>
                </td>
                <td>
                  {/* Always render the cell, but only show button if not paid */}
                  {!isPaid ? (
                    <AddPaymentButton onClick={() => handleAddPayment(p)} />
                  ) : (
                    // Use a visually larger dash for alignment
                    <span style={{
                      fontWeight: 700,
                      color: "#22c55e",
                      fontSize: "1.5rem",
                      display: "inline-block",
                      lineHeight: "1"
                    }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {loading && <div>Loading...</div>}
      <PaymentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedBooking(null); }}
        onSubmit={handleModalSubmit}
        booking={selectedBooking}
      />
      {/* Receipt Modal */}
      {showReceipt && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.45)", zIndex: 1400,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{background: '#fff', borderRadius: 16, padding: 32, minWidth: 480, maxWidth: 600, boxShadow: '0 8px 32px #0002', textAlign: 'center', position: 'relative'}}>
            <h2 style={{margin: 0, marginBottom: 18, color: '#8b4513'}}>Payment Receipt</h2>
            <div ref={receiptRef} style={{display: 'flex', justifyContent: 'center'}}>
              <PaymentReceipt receipt={receiptData} />
            </div>
            <div style={{marginTop: 24, display: 'flex', gap: 16, justifyContent: 'center'}}>
              <button
                style={{background: '#a0522d', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer'}}
                onClick={handleDownloadReceipt}
              >
                Download Receipt
              </button>
              <button
                style={{background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer'}}
                onClick={() => { setShowReceipt(false); setReceiptData(null); }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
