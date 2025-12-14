import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import SwalLib from "sweetalert2";

// Optional minimal fallback (keeps runtime stable if package missing).
// If you prefer not to include fallback, just keep the import above and ensure npm install was run.
if (!SwalLib || typeof SwalLib.fire !== "function") {
  // eslint-disable-next-line no-global-assign
  SwalLib = {
    fire: async ({ title = "", text = "" }) => {
      alert((title ? title + "\n" : "") + text);
      return { isConfirmed: true };
    },
  };
}

export default function ManageEvent() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bookings, searchQuery, filterStatus, filterDate]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:3001/api/bookings/all");
      const data = await res.json();
      if (data.status === "success") setBookings(data.bookings);
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
    try {
      const result = await SwalLib.fire({
        title: "Update Status",
        html: `<p>Mark this booking as <strong>${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</strong>?</p>`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#895129",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, Update",
        cancelButtonText: "Cancel",
        customClass: {
          popup: "sweet-alert-popup",
          confirmButton: "sweet-alert-confirm",
          cancelButton: "sweet-alert-cancel"
        }
      });

      if (result.isConfirmed) {
        const res = await fetch(`http://localhost:3001/api/bookings/status/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) {
          await SwalLib.fire({
            title: "Success!",
            text: `Status updated to ${newStatus}`,
            icon: "success",
            confirmButtonColor: "#895129",
            timer: 2000,
            timerProgressBar: true
          });
          fetchBookings();
        } else {
          SwalLib.fire({
            title: "Error",
            text: "Failed to update status",
            icon: "error",
            confirmButtonColor: "#895129"
          });
        }
      }
    } catch (err) {
      SwalLib.fire({
        title: "Error",
        text: "An error occurred while updating status",
        icon: "error",
        confirmButtonColor: "#895129"
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

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="filter-date"
          />

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
