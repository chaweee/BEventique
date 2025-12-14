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
  const [filterDate, setFilterDate] = useState("");
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
        setBookings(data.bookings);

        // Auto-confirm bookings with paid payment_status
        data.bookings.forEach(async (b) => {
          if (b.payment_status === "paid" && b.status !== "confirmed") {
            try {
              await fetch(`http://localhost:3001/api/bookings/status/${b.booking_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "confirmed" })
              });
            } catch (err) {
              // Optionally log error, but don't block UI
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
        b.client_name.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filterStatus) {
      filtered = filtered.filter(b => b.status === filterStatus);
    }

    // Filter by date
    if (filterDate) {
      filtered = filtered.filter(b => {
        const bookingDate = new Date(b.event_date).toLocaleDateString();
        const selectedDate = new Date(filterDate).toLocaleDateString();
        return bookingDate === selectedDate;
      });
    }

    setFilteredBookings(filtered);
  };

  const updateStatus = async (id, newStatus) => {
    // Use window.confirm and CustomAlert instead of SwalLib
    try {
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

  return (
    <div className="table-container">
      {/* Filters and Search Bar */}
      <div className="filters-section">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-group">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Use MUI DatePicker with unavailable days */}
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              value={filterDate ? dayjs(filterDate) : null}
              onChange={(newValue) => {
                setFilterDate(newValue ? newValue.format('YYYY-MM-DD') : '');
              }}
              slotProps={{
                textField: {
                  fullWidth: false,
                  size: 'small',
                  sx: {
                    minWidth: 140,
                    backgroundColor: 'white',
                    borderRadius: '8px',
                  }
                }
              }}
              shouldDisableDate={(date) => {
                const dateStr = date.format('YYYY-MM-DD');
                return bookedDates.includes(dateStr);
              }}
              slots={{
                day: (dayProps) => {
                  const dateStr = dayProps.day.format('YYYY-MM-DD');
                  const isBooked = bookedDates.includes(dateStr);
                  if (isBooked) {
                    return (
                      <Tooltip title="Unavailable" arrow>
                        <span>
                          <PickersDay
                            {...dayProps}
                            sx={{
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              '&:hover': {
                                backgroundColor: '#fecaca',
                              },
                              '&.Mui-disabled': {
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                              }
                            }}
                          />
                        </span>
                      </Tooltip>
                    );
                  }
                  return <PickersDay {...dayProps} />;
                }
              }}
            />
          </LocalizationProvider>

          {(searchQuery || filterStatus || filterDate) && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setSearchQuery("");
                setFilterStatus("");
                setFilterDate("");
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="results-info">
        Showing {filteredBookings.length} of {bookings.length} bookings
      </div>

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
          {filteredBookings.map(b => (
            <tr key={b.booking_id}>
              <td>{new Date(b.event_date).toLocaleDateString()}</td>
              <td>
                <div>{b.client_name}</div>
                <small>{b.client_email}</small>
              </td>
              <td>{b.event_type}</td>
              <td>{b.Package_Name}</td>
              <td><span className={`badge ${b.status}`}>{b.status}</span></td>
              <td style={{ display: 'flex', gap: 8 }}>
                <select 
                  value={b.status} 
                  onChange={(e) => updateStatus(b.booking_id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirm</option>
                  <option value="completed">Complete</option>
                  <option value="cancelled">Cancel</option>
                </select>
                {/* Use Material UI IconButton for Edit */}
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleEditClick(b)}
                  style={{ marginLeft: 4, minWidth: 0, padding: '4px 8px' }}
                >
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit Booking Modal (outside table for correct rendering) */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2, minWidth: 320 }}>
          <h3>Edit Booking</h3>
          {/* Use DatePicker for event_date */}
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date"
              value={editForm.event_date ? dayjs(editForm.event_date) : null}
              onChange={(newValue) => {
                setEditForm((prev) => ({
                  ...prev,
                  event_date: newValue ? newValue.format('YYYY-MM-DD') : ''
                }));
              }}
              shouldDisableDate={(date) => {
                const dateStr = date.format('YYYY-MM-DD');
                // Allow the current booking's date, but disable other booked dates
                return bookedDates.includes(dateStr) && dateStr !== editBooking?.event_date?.slice(0, 10);
              }}
              slots={{
                day: (dayProps) => {
                  const dateStr = dayProps.day.format('YYYY-MM-DD');
                  const isBooked = bookedDates.includes(dateStr) && dateStr !== editBooking?.event_date?.slice(0, 10);
                  if (isBooked) {
                    return (
                      <Tooltip title="Unavailable" arrow>
                        <span>
                          <PickersDay
                            {...dayProps}
                            sx={{
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              '&:hover': {
                                backgroundColor: '#fecaca',
                              },
                              '&.Mui-disabled': {
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                              }
                            }}
                          />
                        </span>
                      </Tooltip>
                    );
                  }
                  return <PickersDay {...dayProps} />;
                }
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: "normal",
                  InputLabelProps: { shrink: true }
                }
              }}
            />
          </LocalizationProvider>
          <TextField
            label="Time"
            type="time"
            name="event_time"
            value={editForm.event_time}
            onChange={handleEditFormChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Location"
            name="location"
            value={editForm.location}
            onChange={handleEditFormChange}
            fullWidth
            margin="normal"
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button onClick={() => setEditModalOpen(false)} color="secondary">Cancel</Button>
            <Button onClick={handleEditSave} variant="contained" color="primary">Save</Button>
          </Box>
        </Box>
      </Modal>
      {/* Custom Alert */}
      <CustomAlert
        open={alert.open}
        type={alert.type}
        message={alert.message}
        onClose={() => setAlert(a => ({ ...a, open: false }))}
      />
    </div>
  );
}
