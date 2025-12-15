import React, { useEffect, useState } from "react";

export default function PaymentReceipt({ receipt }) {
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    if (!receipt) return;

    const tryFetch = async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const json = await res.json();
        return json?.account || json?.data || json?.user || json || null;
      } catch {
        return null;
      }
    };

    const fetchCustomer = async () => {
      // Try more possible identifiers that may come from bookings/receipt
      const ids = [
        receipt.customer_id,
        receipt.Customer_ID,
        receipt.Account_ID,
        receipt.account_id,
        receipt.user_id,
        receipt.client_id,
        receipt.user,
        receipt.userId,
        receipt.userid
      ].filter(Boolean);

      for (const id of ids) {
        const acc = await tryFetch(`http://localhost:3001/api/accounts/${id}`);
        if (acc) {
          setCustomer({
            Account_ID: acc.Account_ID ?? acc.AccountId ?? acc.id,
            Email: acc.Email ?? acc.email,
            PhoneNumber: acc.PhoneNumber ?? acc.Phone ?? acc.phone,
            FirstName: acc.FirstName ?? acc.first_name ?? acc.firstName ?? "",
            LastName: acc.LastName ?? acc.last_name ?? acc.lastName ?? "",
            M_I: acc.M_I ?? acc.m_i ?? acc.mi ?? ""
          });
          return;
        }
      }

      // fallback: try by email and username
      const emails = [receipt.customer_email, receipt.client_email, receipt.email, receipt.username, receipt.user_name].filter(Boolean);
      for (const email of emails) {
        const accByEmail = await tryFetch(`http://localhost:3001/api/accounts/email/${encodeURIComponent(email)}`)
          || await tryFetch(`http://localhost:3001/api/accounts/search?email=${encodeURIComponent(email)}`);
        if (accByEmail) {
          setCustomer({
            Account_ID: accByEmail.Account_ID ?? accByEmail.id,
            Email: accByEmail.Email ?? accByEmail.email,
            PhoneNumber: accByEmail.PhoneNumber ?? accByEmail.phone,
            FirstName: accByEmail.FirstName ?? accByEmail.first_name ?? "",
            LastName: accByEmail.LastName ?? accByEmail.last_name ?? "",
            M_I: accByEmail.M_I ?? accByEmail.m_i ?? ""
          });
          return;
        }
      }

      // nothing found -> set customer to 'not found' object
      setCustomer({ notFound: true });
    };

    fetchCustomer();
  }, [receipt]);

  if (!receipt) return null;

  // Helper for inclusions (string or array)
  const inclusions = receipt.package_inclusions || receipt.Package_Inclusions || receipt.package_inclusions_text || receipt.Package_Inclusions_Text || "";
  const inclusionsText = Array.isArray(inclusions) ? inclusions.join(", ") : inclusions;

  // Prefer customer info from fetched account, fallback to receipt
  let customerName = "";
  if (customer?.notFound) {
    customerName = "(Account not found)";
  } else {
    customerName = (
      (customer?.FirstName || receipt.customer_name || receipt.client_name || "") +
      (customer?.M_I ? ` ${customer.M_I}` : "") +
      (customer?.LastName ? ` ${customer.LastName}` : (receipt.customer_lastname || ""))
    ).trim() || "Guest";
  }

  const customerEmail = customer?.Email || receipt.customer_email || receipt.client_email || "";
  const customerPhone = customer?.PhoneNumber || receipt.customer_phone || receipt.client_phone || "";

  const formatAmount = (val) => {
    const n = Number(val || receipt.amount_paid || receipt.total_amount || receipt.Package_Amount || receipt.package_price || 0);
    return `₱${n.toLocaleString()}`;
  };

  return (
    <div style={{
      background:'#fff',
      padding:'32px',
      borderRadius: '8px',
      color: '#111',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minWidth: 400,
      maxWidth: 520,
      boxShadow: '0 2px 16px #0001'
    }}>
      {/* Booking Receipt ID at Top */}
      {receipt.booking_id && (
        <div style={{textAlign: 'center', marginBottom: '20px'}}>
          <p style={{margin: 0, fontSize: '14px', fontWeight: '600', color: '#6b7280'}}>Receipt ID: #{receipt.booking_id}</p>
        </div>
      )}

      {/* Professional Header */}
      <div style={{textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #1f2937', paddingBottom: '16px', position: 'relative'}}>
        <h2 style={{margin: '0 0 4px 0', fontSize: '28px', fontWeight: '700', color: '#1f2937'}}>Baby's Eventique</h2>
        <p style={{margin: 0, color: '#6b7280', fontSize: '14px'}}>Event Planning & Design Services</p>
        {receipt.payment_status === 'Paid' && (
          <div style={{
            display: 'inline-block',
            background: '#16a34a',
            color: '#fff',
            fontWeight: 700,
            fontSize: '16px',
            borderRadius: '6px',
            padding: '6px 18px',
            marginTop: '16px',
            boxShadow: '0 2px 8px #0002',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            PAID
          </div>
        )}
      </div>

      {/* Customer Information */}
      <div style={{marginBottom: '20px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px'}}>
        <h4 style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#374151', textTransform: 'uppercase'}}>Customer Information</h4>
        <div style={{fontSize: '14px', lineHeight: '1.6'}}>
          <div style={{marginBottom: '4px'}}>
            <span style={{color: '#6b7280', fontWeight: '500'}}>Name:</span>{' '}
            <strong style={{color: '#111'}}>{customerName}</strong>
            {customerPhone && (
              <span style={{color: '#6b7280', marginLeft: '24px', fontWeight: '500'}}>
                Phone #: <strong style={{color: '#111'}}>{customerPhone}</strong>
              </span>
            )}
          </div>
          {customerEmail && (
            <div>
              <span style={{color: '#6b7280', fontWeight: '500'}}>Email:</span>{' '}
              <strong style={{color: '#111'}}>{customerEmail}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Package Details */}
      <div style={{marginBottom: '20px'}}>
        <h4 style={{margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#374151', textTransform: 'uppercase'}}>Package Details</h4>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
          <span style={{color: '#6b7280', fontSize: '14px'}}>Package Name</span>
          <strong style={{color: '#111', fontSize: '14px'}}>{receipt.package_name || receipt.Package_Name || receipt.package || ''}</strong>
        </div>
        {inclusionsText && (
          <div style={{padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
            <span style={{color: '#6b7280', fontSize: '14px', display: 'block', marginBottom: '4px'}}>Package Inclusions</span>
            <strong style={{color: '#111', fontSize: '14px'}}>{inclusionsText}</strong>
          </div>
        )}
        {(receipt.package_description || receipt.Package_Description) && (
          <div style={{padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
            <span style={{color: '#6b7280', fontSize: '14px', display: 'block', marginBottom: '4px'}}>Package Description</span>
            <p style={{margin: 0, color: '#111', fontSize: '13px', lineHeight: '1.5'}}>{receipt.package_description || receipt.Package_Description}</p>
          </div>
        )}
      </div>

      {/* Event Details */}
      <div style={{marginBottom: '20px'}}>
        <h4 style={{margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#374151', textTransform: 'uppercase'}}>Event Details</h4>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
          <span style={{color: '#6b7280', fontSize: '14px'}}>Location</span>
          <strong style={{color: '#111', fontSize: '14px', textAlign: 'right', maxWidth: '60%'}}>{receipt.location || ''}</strong>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
          <span style={{color: '#6b7280', fontSize: '14px'}}>Date</span>
          <strong style={{color: '#111', fontSize: '14px'}}>
            {receipt.event_date ? new Date(receipt.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : (receipt.payment_date ? new Date(receipt.payment_date).toLocaleDateString() : '')}
          </strong>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
          <span style={{color: '#6b7280', fontSize: '14px'}}>Time</span>
          <strong style={{color: '#111', fontSize: '14px'}}>{receipt.event_time || ''}</strong>
        </div>
      </div>

      {/* Special Requests */}
      {receipt.notes && (
        <div style={{marginBottom: '20px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '6px', borderLeft: '4px solid #f59e0b'}}>
          <h4 style={{margin: '0 0 6px 0', fontSize: '13px', fontWeight: '600', color: '#92400e'}}>Special Requests</h4>
          <p style={{margin: 0, fontSize: '13px', color: '#78350f', lineHeight: '1.5'}}>{receipt.notes}</p>
        </div>
      )}

      {/* Total Amount */}
      <div style={{marginTop: '24px', padding: '16px', backgroundColor: '#1f2937', borderRadius: '6px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <span style={{color: '#f9fafb', fontSize: '16px', fontWeight: '600'}}>TOTAL AMOUNT</span>
          <strong style={{color: '#fff', fontSize: '24px', fontWeight: '700'}}>{formatAmount()}</strong>
        </div>
      </div>

      {/* Payment Instructions - Only show if not paid */}
      {receipt.payment_status !== 'Paid' && (
        <div style={{marginTop: '24px', padding: '16px', backgroundColor: '#dbeafe', borderRadius: '6px', borderLeft: '4px solid #3b82f6'}}>
          <h4 style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1e40af'}}>📋 IMPORTANT - Payment Instructions</h4>
          <p style={{margin: '0 0 6px 0', fontSize: '13px', color: '#1e3a8a', lineHeight: '1.6'}}>
            <strong>Walk-in Payment Required:</strong> Please visit our office to complete the payment for this booking.
          </p>
          <p style={{margin: 0, fontSize: '13px', color: '#1e3a8a', lineHeight: '1.6'}}>
            Your booking will be <strong>approved after payment verification</strong>. Thank you!
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={{marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', textAlign: 'center'}}>
        <p style={{margin: '0', fontSize: '12px', color: '#9ca3af', lineHeight: '1.5'}}>
          Thank you for choosing Eventique!<br/>
          For inquiries, please contact us or visit your bookings page.
        </p>
      </div>
    </div>
  );
}
