import React, { useState, useEffect } from "react";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { Search } from "lucide-react";
import { Edit as EditIcon } from "@mui/icons-material";
// Add these imports for the date picker
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { Tooltip } from '@mui/material';
import dayjs from 'dayjs';

// CustomAlert component
function CustomAlert({ open, type, message, onClose }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed',
      zIndex: 1301,
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        minWidth: 320,
        maxWidth: 400,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 8px 32px #0002',
        padding: '32px 28px 24px 28px',
        textAlign: 'center',
        border: type === 'success' ? '2px solid #4ade80' : '2px solid #f87171',
        animation: 'fadeInScale 0.25s cubic-bezier(.4,2,.6,1)'
      }}>
        <div style={{
          fontSize: 48,
          marginBottom: 10,
          color: type === 'success' ? '#22c55e' : '#ef4444'
        }}>
          {type === 'success' ? '✓' : '✗'}
        </div>
        <div style={{
          fontWeight: 700,
          fontSize: 20,
          color: type === 'success' ? '#166534' : '#991b1b',
          marginBottom: 8
        }}>
          {type === 'success' ? 'Success!' : 'Error'}
        </div>
        <div style={{
          fontSize: 16,
          color: '#374151',
          marginBottom: 12
        }}>
          {message}
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: 8,
            background: type === 'success' ? '#22c55e' : '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 32px',
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 2px 8px #0001'
          }}
        >
          OK
        </button>
      </div>
      <style>
        {`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.85);}
          to { opacity: 1; transform: scale(1);}
        }
        `}
      </style>
    </div>
  );
}

export default function ManageEvent() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState(null);
  const [bookedDates, setBookedDates] = useState([]);

  // Edit modal state and handlers
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [editForm, setEditForm] = useState({ event_date: '', event_time: '', location: '' });

  // Custom alert state
  const [alert, setAlert] = useState({ open: false, type: "success", message: "" });

  // Open edit modal and set form values
  const handleEditClick = (booking) => {
    setEditBooking(booking);
    setEditForm({
      event_date: booking.event_date ? booking.event_date.slice(0, 10) : '',
      event_time: booking.event_time || '',
      location: booking.location || ''
    });
    setEditModalOpen(true);
  };

  // Handle edit form changes
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // Save edited booking
  const handleEditSave = async () => {
    if (!editBooking) return;
    try {
      const res = await fetch(`http://localhost:3001/api/bookings/${editBooking.booking_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_date: editForm.event_date,
          event_time: editForm.event_time,
          location: editForm.location
        })
      });
      setEditModalOpen(false);
      setEditBooking(null);
      if (res.ok) {
        setAlert({ open: true, type: "success", message: "Booking updated." });
        fetchBookings();
      } else {
        setAlert({ open: true, type: "error", message: "Failed to update booking." });
      }
    } catch (err) {
      setEditModalOpen(false);
      setAlert({ open: true, type: "error", message: "An error occurred while updating booking." });
      console.error(err);
    }
  };

  // Auto-dismiss alert after 2 seconds
  useEffect(() => {
    if (alert.open) {
      const timer = setTimeout(() => setAlert(a => ({ ...a, open: false })), 2000);
      return () => clearTimeout(timer);
    }
  }, [alert.open]);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bookings, searchQuery, filterStatus, filterDate]);

  // Fetch unavailable/booked dates for admin
  useEffect(() => {
    const fetchBookedDates = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/bookings/booked-dates");
        const data = await response.json();
        if (data.status === "success") {
          setBookedDates(data.booked_dates);
        }
      } catch (error) {
        console.error("Error fetching booked dates:", error);
      }
    };
    fetchBookedDates();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:3001/api/bookings/all");
      const data = await res.json();
      if (data.status === "success") {
        // normalize bookings: compute total, paid and remaining due
        const normalized = (data.bookings || []).map(b => {
          const total = Number(b.total_amount ?? b.Package_Amount ?? b.total_price ?? 0);
          const paid = Number(b.amount_paid ?? 0);
          const due = Math.max(0, total - paid);
          return { ...b, total_amount: total, amount_paid: paid, amount_due: due };
        });
        setBookings(normalized);

        // Auto-confirm bookings only when remaining due is zero
        normalized.forEach(async (b) => {
          if (Number(b.amount_due) <= 0 && b.status !== "confirmed") {
            try {
              await fetch(`http://localhost:3001/api/bookings/status/${b.booking_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "confirmed" })
              });
            } catch (err) {
              console.error("Auto-confirm booking failed", err);
            }
          }
        });
      }
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const applyFilters = () => {
    let filtered = bookings;

    // Filter by search query (customer name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        (b.client_name || "").toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filterStatus) {
      filtered = filtered.filter(b => b.status === filterStatus);
    }

    // Filter by date (filterDate is Dayjs or null)
    if (filterDate) {
      const sel = filterDate.format("YYYY-MM-DD");
      filtered = filtered.filter(b => {
        const bookingDate = dayjs(b.event_date).format("YYYY-MM-DD");
        return bookingDate === sel;
      });
    }

    setFilteredBookings(filtered);
  };

  const updateStatus = async (id, newStatus) => {
    // Use window.confirm and CustomAlert instead of SwalLib
    try {
      // validate booking exists and amount due when confirming
      const booking = bookings.find(b => b.booking_id === id);
      if (!booking) {
        setAlert({ open: true, type: "error", message: "Booking not found." });
        return;
      }
      if (newStatus === "confirmed") {
        const due = Number(booking.amount_due ?? Math.max(0, (Number(booking.total_amount ?? booking.Package_Amount ?? 0) - Number(booking.amount_paid ?? 0))));
        if (due > 0) {
          setAlert({ open: true, type: "error", message: "Cannot confirm booking: amount due must be 0." });
          return;
        }
      }

      const confirmed = window.confirm(
        `Mark this booking as "${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}"?`
      );
      if (!confirmed) return;

      const res = await fetch(`http://localhost:3001/api/bookings/status/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setAlert({
          open: true,
          type: "success",
          message: `Status updated to ${newStatus}`
        });
        fetchBookings();
      } else {
        setAlert({
          open: true,
          type: "error",
          message: "Failed to update status"
        });
      }
    } catch (err) {
      setAlert({
        open: true,
        type: "error",
        message: "An error occurred while updating status"
      });
      console.error(err);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterStatus = (e) => {
    setFilterStatus(e.target.value);
  };

  const handleFilterDate = (newValue) => {
    // newValue is a Dayjs object or null
    setFilterDate(newValue);
  };

  const isDateBooked = (date) => {
    return bookedDates.some(bd => dayjs(bd).isSame(date, 'day'));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Manage Bookings</h1>
          {/* Add Booking button removed */}
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <TextField
            label="Search by client name"
            variant="outlined"
            value={searchQuery}
            onChange={handleSearch}
            style={{ flex: 1 }}
          />
          <TextField
            select
            label="Status"
            variant="outlined"
            value={filterStatus}
            onChange={handleFilterStatus}
            SelectProps={{ native: true }}
            style={{ width: 200 }}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="canceled">Canceled</option>
          </TextField>
          <DatePicker
            label="Filter by date"
            value={filterDate}
            onChange={handleFilterDate}
            renderInput={(params) => <TextField {...params} variant="outlined" />}
            disablePast
            shouldDisableDate={isDateBooked}
          />
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="loader"></div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', height: 56 }}>
                  <th style={{ textAlign: 'left', padding: '0 16px', fontSize: 16, fontWeight: 500 }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '0 16px', fontSize: 16, fontWeight: 500 }}>Client Name</th>
                  <th style={{ textAlign: 'left', padding: '0 16px', fontSize: 16, fontWeight: 500 }}>Event Date</th>
                  <th style={{ textAlign: 'left', padding: '0 16px', fontSize: 16, fontWeight: 500 }}>Event Time</th>
                  <th style={{ textAlign: 'left', padding: '0 16px', fontSize: 16, fontWeight: 500 }}>Location</th>
                  <th style={{ textAlign: 'left', padding: '0 16px', fontSize: 16, fontWeight: 500 }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '0 16px', fontSize: 16, fontWeight: 500 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(filteredBookings.length > 0 ? filteredBookings : bookings).map(booking => (
                  <tr key={booking.booking_id} style={{ height: 72, borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0 16px', fontSize: 14 }}>{booking.booking_id}</td>
                    <td style={{ padding: '0 16px', fontSize: 14 }}>{booking.client_name}</td>
                    <td style={{ padding: '0 16px', fontSize: 14 }}>{new Date(booking.event_date).toLocaleDateString()}</td>
                    <td style={{ padding: '0 16px', fontSize: 14 }}>{booking.event_time}</td>
                    <td style={{ padding: '0 16px', fontSize: 14 }}>{booking.location}</td>
                    <td style={{ padding: '0 16px', fontSize: 14 }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 500,
                        background: booking.status === 'confirmed' ? '#d1fae5' : booking.status === 'canceled' ? '#fee2e2' : '#e0f2fe',
                        color: booking.status === 'confirmed' ? '#065f46' : booking.status === 'canceled' ? '#b91c1c' : '#0d9488'
                      }}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '0 16px', textAlign: 'right' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleEditClick(booking)}
                        startIcon={<EditIcon />}
                        style={{ borderRadius: 8, fontSize: 14 }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => updateStatus(booking.booking_id, booking.status === 'confirmed' ? 'canceled' : 'confirmed')}
                        style={{
                          marginLeft: 8,
                          borderRadius: 8,
                          fontSize: 14,
                          background: booking.status === 'confirmed' ? '#f87171' : '#4ade80',
                          color: '#fff'
                        }}
                      >
                        {booking.status === 'confirmed' ? 'Cancel' : 'Confirm'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          aria-labelledby="edit-booking-modal"
          aria-describedby="edit-booking-description"
        >
          <Box sx={{
            width: 400,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <h2 id="edit-booking-modal" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Edit Booking</h2>
            <TextField
              label="Event Date"
              type="date"
              variant="outlined"
              name="event_date"
              value={editForm.event_date}
              onChange={handleEditFormChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Event Time"
              type="time"
              variant="outlined"
              name="event_time"
              value={editForm.event_time}
              onChange={handleEditFormChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Location"
              variant="outlined"
              name="location"
              value={editForm.location}
              onChange={handleEditFormChange}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleEditSave}
              style={{ borderRadius: 8, height: 54, fontSize: 16 }}
            >
              Save Changes
            </Button>
          </Box>
        </Modal>

        <CustomAlert
          open={alert.open}
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(a => ({ ...a, open: false }))}
        />
      </div>
    </LocalizationProvider>
  );
}
