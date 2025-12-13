import React, { useState, useEffect } from "react";

export default function ManagePayments() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/admin/payments");
      const data = await res.json();
      if (data.status === "success") setPayments(data.payments);
    } catch (err) { console.error(err); }
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
            <th>Payment Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.booking_id}>
              <td>#{p.booking_id}</td>
              <td>{new Date(p.event_date).toLocaleDateString()}</td>
              <td>{p.client_name}</td>
              <td>{p.Package_Name}</td>
              <td className="amount">₱{Number(p.amount_due).toLocaleString()}</td>
              <td>
                {p.payment_status === 'paid' 
                  ? <span className="badge completed">Paid</span>
                  : <span className="badge pending">Unpaid</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
