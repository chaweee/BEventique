import React from "react";

export default function PaymentReceipt({ receipt }) {
  if (!receipt) return null;
  return (
    <div style={{background:'#fff', padding:'32px', borderRadius: '8px', color: '#111', fontFamily: 'system-ui, -apple-system, sans-serif', minWidth: 400, maxWidth: 520}}>
      {/* Booking Receipt ID at Top */}
      <div style={{textAlign: 'center', marginBottom: '20px'}}>
        <p style={{margin: 0, fontSize: '14px', fontWeight: '600', color: '#6b7280'}}>Receipt ID: #{receipt.booking_id}</p>
      </div>
      {/* Professional Header */}
      <div style={{textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #1f2937', paddingBottom: '16px'}}>
        <h2 style={{margin: '0 0 4px 0', fontSize: '28px', fontWeight: '700', color: '#1f2937'}}>Baby's Eventique</h2>
        <p style={{margin: 0, color: '#6b7280', fontSize: '14px'}}>Event Planning & Design Services</p>
      </div>
      {/* Customer Information */}
      <div style={{marginBottom: '20px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px'}}>
        <h4 style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#374151', textTransform: 'uppercase'}}>Customer Information</h4>
        <div style={{fontSize: '14px', lineHeight: '1.6'}}>
          <div style={{marginBottom: '4px'}}>
            <span style={{color: '#6b7280', fontWeight: '500'}}>Name:</span>{' '}
            <strong style={{color: '#111'}}>{receipt.client_name || receipt.customer_name}</strong>
            {receipt.client_phone && (
              <span style={{color: '#6b7280', marginLeft: '24px', fontWeight: '500'}}>
                Phone #: <strong style={{color: '#111'}}>{receipt.client_phone}</strong>
              </span>
            )}
          </div>
          {receipt.client_email && (
            <div>
              <span style={{color: '#6b7280', fontWeight: '500'}}>Email:</span>{' '}
              <strong style={{color: '#111'}}>{receipt.client_email}</strong>
            </div>
          )}
        </div>
      </div>
      {/* Payment Details */}
      <div style={{marginBottom: '20px'}}>
        <h4 style={{margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#374151', textTransform: 'uppercase'}}>Payment Details</h4>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
          <span style={{color: '#6b7280', fontSize: '14px'}}>Amount Paid</span>
          <strong style={{color: '#111', fontSize: '14px'}}>₱{Number(receipt.amount_paid).toLocaleString()}</strong>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
          <span style={{color: '#6b7280', fontSize: '14px'}}>Amount Due</span>
          <strong style={{color: '#111', fontSize: '14px'}}>₱{Number(receipt.amount_due).toLocaleString()}</strong>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
          <span style={{color: '#6b7280', fontSize: '14px'}}>Date</span>
          <strong style={{color: '#111', fontSize: '14px'}}>{new Date(receipt.payment_date || receipt.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
        </div>
      </div>
      {/* Footer */}
      <div style={{marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', textAlign: 'center'}}>
        <p style={{margin: '0', fontSize: '12px', color: '#9ca3af', lineHeight: '1.5'}}>
          Thank you for your payment!<br/>
          For inquiries, please contact us or visit your bookings page.
        </p>
      </div>
    </div>
  );
}
