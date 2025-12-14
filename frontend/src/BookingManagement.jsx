import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CoolButton from "./CoolButton";
import "./BookingManagement.css";
import "./Signup.css";

export default function BookingManagement() {
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' or 'edit'
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Canvas customization state
  const [allowCustomize, setAllowCustomize] = useState(false);
  const canvasContainerRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [canvasData, setCanvasData] = useState(null);
  
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
    let isMounted = true;
    
    const user = sessionStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }
    
    // Check for query params (e.g., coming from "Book Now" button on packages page)
    const params = new URLSearchParams(location.search);
    const preSelectedPackage = params.get("package");

    const loadData = async () => {
      try {
        setLoading(true);
        const parsedUser = JSON.parse(user);
        const userId = parsedUser.id || parsedUser.Account_ID;

        // 1. Fetch Packages (for the dropdown)
        const pkgRes = await fetch("http://localhost:3001/api/packages/list");
        if (!pkgRes.ok) throw new Error("Failed to fetch packages");
        const pkgData = await pkgRes.json();
        const pkgList = Array.isArray(pkgData) ? pkgData : pkgData.packages || [];
        
        if (isMounted) setPackages(pkgList);

        // 2. Fetch User's Bookings
        const bookRes = await fetch(`http://localhost:3001/api/bookings/my-bookings/${userId}`);
        if (!bookRes.ok) throw new Error("Failed to fetch bookings");
        const bookData = await bookRes.json();

        if (isMounted) {
          if (bookData.status === "success") {
            setBookings(bookData.bookings);
          } else {
            setBookings([]);
          }
        }

        // 3. Open Modal if package was pre-selected
        if (preSelectedPackage && isMounted) {
          resetForm();
          setFormData(prev => ({ ...prev, package_id: preSelectedPackage }));
          setModalMode("create");
          setShowModal(true);
        }

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [navigate, location.search]);

  // Handle Logout
  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("flash");
    navigate("/login");
  };

  // Open Modal for Creating
  const openCreateModal = () => {
    resetForm();
    setAllowCustomize(false);
    setCanvasData(null);
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

  // Initialize Fabric canvas when modal opens with package selected
  useEffect(() => {
    let isMounted = true;
    
    if (showModal && selectedPackage && canvasContainerRef.current && !fabricCanvasRef.current) {
      const container = canvasContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Create a wrapper appended to body that clips the canvas and keeps it positioned
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      const rect = container.getBoundingClientRect();
      wrapper.style.left = rect.left + window.scrollX + 'px';
      wrapper.style.top = rect.top + window.scrollY + 'px';
      wrapper.style.width = containerWidth + 'px';
      wrapper.style.height = containerHeight + 'px';
      wrapper.style.overflow = 'hidden';
      wrapper.style.pointerEvents = 'none';
      wrapper.style.zIndex = '1000';
      document.body.appendChild(wrapper);

      const canvasEl = document.createElement('canvas');
      canvasEl.style.display = 'block';
      canvasEl.width = containerWidth;
      canvasEl.height = containerHeight;
      wrapper.appendChild(canvasEl);

      const canvas = new window.fabric.Canvas(canvasEl, {
        width: containerWidth,
        height: containerHeight,
        backgroundColor: '#1f2937',
        uniformScaling: true,
        selection: true,
      });

      // allow targeting sub-objects inside groups and more precise hit-testing
      canvas.subTargetCheck = true;
      canvas.perPixelTargetFind = true;

      if (isMounted) {
        console.log('[canvas] init BookingManagement', { time: Date.now(), width: containerWidth, height: containerHeight });
        // attach the created element and wrapper so we can remove them later
        canvas.__canvasEl = canvasEl;
        canvas.__wrapperEl = wrapper;
        fabricCanvasRef.current = canvas;

        // sync wrapper position with container on resize/scroll
        const syncPosition = () => {
          const r = container.getBoundingClientRect();
          wrapper.style.left = r.left + window.scrollX + 'px';
          wrapper.style.top = r.top + window.scrollY + 'px';
          wrapper.style.width = r.width + 'px';
          wrapper.style.height = r.height + 'px';
        };
        window.addEventListener('resize', syncPosition);
        window.addEventListener('scroll', syncPosition);
        canvas.__syncPosition = syncPosition;

        // Load package's default layout if it exists
        if (selectedPackage.package_layout) {
          try {
            const layoutData = typeof selectedPackage.package_layout === 'string' 
              ? JSON.parse(selectedPackage.package_layout) 
              : selectedPackage.package_layout;
            canvas.loadFromJSON(layoutData, () => {
              canvas.renderAll();
              // Set all objects to be fully interactive, will be controlled by the toggle effect
              canvas.getObjects().forEach(obj => {
                obj.selectable = true;
                obj.evented = true;
                obj.hasControls = true;
                obj.hasBorders = true;
                obj.lockMovementX = false;
                obj.lockMovementY = false;
              });
            });
          } catch (e) {
            console.error('Error loading layout:', e);
          }
        }

        canvas.on('object:modified', () => {
          if (allowCustomize && isMounted) {
            setCanvasData(canvas.toJSON());
          }
        });
      }
    }

    // Cleanup when effect re-runs or component unmounts
    return () => {
      isMounted = false;
      console.log('[canvas] cleanup BookingManagement', { time: Date.now() });
      if (fabricCanvasRef.current) {
        try {
          const wrapperEl = fabricCanvasRef.current.__wrapperEl;
          const ce = fabricCanvasRef.current.__canvasEl;
          const sync = fabricCanvasRef.current.__syncPosition;
          fabricCanvasRef.current.dispose();
          if (ce && ce.parentNode) ce.parentNode.removeChild(ce);
          if (wrapperEl && wrapperEl.parentNode) wrapperEl.parentNode.removeChild(wrapperEl);
          if (sync) {
            window.removeEventListener('resize', sync);
            window.removeEventListener('scroll', sync);
          }
        } catch (err) {
          console.warn('Error disposing canvas (cleanup):', err?.message || err);
        }
        fabricCanvasRef.current = null;
      }
    };
  }, [showModal, selectedPackage]);

  // Helper function to update canvas customization state
  const updateCanvasCustomization = (canvas, isCustomizable) => {
    canvas.selection = isCustomizable;
    canvas.getObjects().forEach(obj => {
      obj.selectable = isCustomizable;
      obj.evented = isCustomizable;
      obj.hasControls = isCustomizable;
      obj.hasBorders = isCustomizable;
      obj.lockMovementX = !isCustomizable;
      obj.lockMovementY = !isCustomizable;
    });
    canvas.renderAll();
  };

  // Separate effect to handle allowCustomize toggle
  useEffect(() => {
    if (fabricCanvasRef.current) {
      updateCanvasCustomization(fabricCanvasRef.current, allowCustomize);
      try {
        const wrapper = fabricCanvasRef.current.__wrapperEl;
        if (wrapper) wrapper.style.pointerEvents = allowCustomize ? 'auto' : 'none';
      } catch (e) {}
    }
  }, [allowCustomize]);

  // Handle Form Submit (Create or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const user = JSON.parse(sessionStorage.getItem("user"));
    const userId = user.id || user.Account_ID;

    try {
      let url = "";
      let method = "";
      let body = {};

      if (modalMode === "create") {
        url = "http://localhost:3001/api/bookings/create";
        method = "POST";
        body = { 
          ...formData, 
          customer_id: userId,
          custom_layout: allowCustomize && canvasData ? JSON.stringify(canvasData) : null
        };
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
        // Show success message
        setSuccessMessage(modalMode === "create" ? "Your booking has been created successfully." : "Your booking has been updated successfully.");
        setShowSuccess(true);
        
        setShowModal(false);
        setAllowCustomize(false);
        // Dispose canvas and remove its element & wrapper
        if (fabricCanvasRef.current) {
          try {
            const wrapperEl = fabricCanvasRef.current.__wrapperEl;
            const ce = fabricCanvasRef.current.__canvasEl;
            const sync = fabricCanvasRef.current.__syncPosition;
            fabricCanvasRef.current.dispose();
            if (ce && ce.parentNode) ce.parentNode.removeChild(ce);
            if (wrapperEl && wrapperEl.parentNode) wrapperEl.parentNode.removeChild(wrapperEl);
            if (sync) {
              window.removeEventListener('resize', sync);
              window.removeEventListener('scroll', sync);
            }
          } catch (err) {
            console.warn('Error disposing canvas after submit:', err?.message || err);
          }
          fabricCanvasRef.current = null;
        }
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
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.status === "success") {
        // Re-fetch data to ensure UI matches Database perfectly
        const user = JSON.parse(sessionStorage.getItem("user"));
        if (!user) {
          navigate("/login");
          return;
        }
        
        const userId = user.id || user.Account_ID;
        
        const bookRes = await fetch(`http://localhost:3001/api/bookings/my-bookings/${userId}`);
        if (!bookRes.ok) {
          throw new Error(`HTTP error! status: ${bookRes.status}`);
        }
        
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
            <button className="bm-link" onClick={() => navigate("/design-queries")}>CUSTOMER INQUIRIES</button>
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
          </div>

          {loading && <div className="bm-loading">Loading bookings...</div>}
          
          {!loading && (bookings.length === 0 || bookings.filter(b => b.status !== 'cancelled').length === 0) && (
            <div className="bm-empty">
              <p>You haven't booked any events yet.</p>
              <button onClick={() => navigate("/customer-packages")}>Browse Packages</button>
            </div>
          )}

          <div className="bm-grid">
            {bookings.filter(booking => booking.status !== 'cancelled').map((booking) => (
              <div key={booking.booking_id} className="bm-card">
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
          <div 
            className="bm-modal-content" 
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: selectedPackage ? '900px' : '600px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
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
                  onChange={e => {
                    const pkgId = e.target.value;
                    setFormData({...formData, package_id: pkgId});
                    const pkg = packages.find(p => p.Package_ID === parseInt(pkgId));
                    setSelectedPackage(pkg || null);
                    // Reset canvas when package changes
                    if (fabricCanvasRef.current) {
                      try {
                        const wrapperEl = fabricCanvasRef.current.__wrapperEl;
                        const ce = fabricCanvasRef.current.__canvasEl;
                        const sync = fabricCanvasRef.current.__syncPosition;
                        fabricCanvasRef.current.dispose();
                        if (ce && ce.parentNode) ce.parentNode.removeChild(ce);
                        if (wrapperEl && wrapperEl.parentNode) wrapperEl.parentNode.removeChild(wrapperEl);
                        if (sync) {
                          window.removeEventListener('resize', sync);
                          window.removeEventListener('scroll', sync);
                        }
                      } catch (err) {
                        console.warn('Error disposing canvas on package change:', err?.message || err);
                      }
                      fabricCanvasRef.current = null;
                    }
                  }}
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

              {/* Canvas Layout Preview - Show when package is selected */}
              {modalMode === 'create' && selectedPackage && (
                <div className="bm-canvas-section" style={{display: 'flex', flexDirection: 'column', minHeight: '600px'}}>
                  <h3 style={{marginBottom: '10px'}}>Event Layout Preview</h3>
                  <div style={{flex: 1, border: '3px solid #d1d5db', borderRadius: '10px', position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start'}}>
                          <div ref={canvasContainerRef} style={{display: 'block', width: '100%', height: '100%'}} />
                        {/* Message overlay when not customizing */}
                        {!allowCustomize && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(45, 55, 72, 0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto',
                            zIndex: 1001,
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '16px',
                            fontWeight: '500',
                            textAlign: 'center',
                            padding: '20px',
                            backdropFilter: 'blur(3px)'
                          }}>
                            <div>
                              <div style={{fontSize: '40px', marginBottom: '12px'}}>🔒</div>
                              <div>Check the box below to customize this layout</div>
                              <div style={{fontSize: '12px', marginTop: '8px', opacity: '0.8'}}>
                                You can move and rearrange items when customization is enabled
                              </div>
                            </div>
                          </div>
                        )}
                    </div>

                  {/* Customization Checkbox */}
                  <div className="bm-form-group" style={{marginTop: '10px'}}>
                    <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                      <input 
                        type="checkbox"
                        checked={allowCustomize}
                        onChange={e => setAllowCustomize(e.target.checked)}
                        style={{cursor: 'pointer'}}
                      />
                      Allow me to customize the layout
                    </label>
                    <p style={{marginTop: '5px', fontSize: '12px', color: '#718096'}}>
                      {allowCustomize 
                        ? 'You can now drag and reposition items on the canvas.' 
                        : 'Check the box above to customize the layout by moving items.'}
                    </p>
                  </div>
                </div>
              )}

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
      
      {/* Success Modal */}
      {showSuccess && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 style={{ color: '#ff4c05ef' }}>{modalMode === "create" ? "Booking Created!" : "Booking Updated!"}</h3>
            <p>{successMessage}</p>
            <CoolButton onClick={() => setShowSuccess(false)}>
              Continue
            </CoolButton>
          </div>
        </div>
      )}
    </div>
  );
}
