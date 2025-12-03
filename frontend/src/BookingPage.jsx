import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BookingPage.css";

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const packageData = location.state?.package;

  // Form state
  const [bookingForm, setBookingForm] = useState({
    location: "",
    event_date: "",
    event_time: "",
    special_requests: ""
  });

  // Canvas customization state
  const [allowCustomization, setAllowCustomization] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);

  // Get user info
  const getCustomerId = () => {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    return user.id || user.Account_ID || localStorage.getItem("userId");
  };

  // Initialize canvas
  useEffect(() => {
    if (!packageData) {
      navigate("/customer-packages");
      return;
    }

    // Load Fabric.js from CDN
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js";
    script.async = true;
    script.onload = () => {
      initializeCanvas();
    };
    document.body.appendChild(script);

    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageData]);

  // Initialize Fabric canvas
  const initializeCanvas = () => {
    if (!canvasRef.current || !window.fabric) return;

    const canvas = new window.fabric.Canvas(canvasRef.current, {
      width: 600,
      height: 600,
      backgroundColor: "#1f2937",
      selection: false
    });

    setFabricCanvas(canvas);

    // Load package layout if exists
    if (packageData.package_layout) {
      try {
        const layoutData = typeof packageData.package_layout === "string" 
          ? JSON.parse(packageData.package_layout) 
          : packageData.package_layout;
        
        canvas.loadFromJSON(layoutData, () => {
          canvas.renderAll();
          canvas.forEachObject((obj) => {
            obj.selectable = false;
            obj.evented = false;
          });
        });
      } catch (err) {
        console.error("Error loading canvas layout:", err);
      }
    }
  };

  // Enable/disable customization
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.forEachObject((obj) => {
      obj.selectable = allowCustomization;
      obj.evented = allowCustomization;
    });
    fabricCanvas.selection = allowCustomization;
    fabricCanvas.renderAll();
  }, [allowCustomization, fabricCanvas]);

  // Add object to canvas
  const addObject = (type) => {
    if (!fabricCanvas || !allowCustomization) return;

    let obj;
    const centerX = fabricCanvas.width / 2;
    const centerY = fabricCanvas.height / 2;

    switch (type) {
      case "table":
        const table = new window.fabric.Rect({
          width: 80,
          height: 80,
          fill: "#8b4513",
          stroke: "#ffffff",
          strokeWidth: 2,
          left: centerX - 40,
          top: centerY - 40
        });
        const tableText = new window.fabric.Text("Table", {
          fontSize: 14,
          fill: "#ffffff",
          left: centerX - 20,
          top: centerY - 7
        });
        obj = new window.fabric.Group([table, tableText]);
        break;

      case "round-table":
        const roundTable = new window.fabric.Circle({
          radius: 40,
          fill: "#8b4513",
          stroke: "#ffffff",
          strokeWidth: 2,
          left: centerX - 40,
          top: centerY - 40
        });
        const roundText = new window.fabric.Text("Round", {
          fontSize: 12,
          fill: "#ffffff",
          left: centerX - 20,
          top: centerY - 6
        });
        obj = new window.fabric.Group([roundTable, roundText]);
        break;

      case "chair":
        const chair = new window.fabric.Rect({
          width: 30,
          height: 30,
          fill: "#4a4a4a",
          stroke: "#ffffff",
          strokeWidth: 2,
          left: centerX - 15,
          top: centerY - 15
        });
        const chairText = new window.fabric.Text("C", {
          fontSize: 16,
          fill: "#ffffff",
          left: centerX - 5,
          top: centerY - 8
        });
        obj = new window.fabric.Group([chair, chairText]);
        break;

      case "tent":
        const tent = new window.fabric.Polygon([
          { x: 0, y: 60 },
          { x: 60, y: 60 },
          { x: 30, y: 0 }
        ], {
          fill: "#e74c3c",
          stroke: "#ffffff",
          strokeWidth: 2,
          left: centerX - 30,
          top: centerY - 30
        });
        const tentText = new window.fabric.Text("Tent", {
          fontSize: 12,
          fill: "#ffffff",
          left: centerX - 15,
          top: centerY + 10
        });
        obj = new window.fabric.Group([tent, tentText]);
        break;

      case "platform":
        const platform = new window.fabric.Rect({
          width: 120,
          height: 60,
          fill: "#3498db",
          stroke: "#ffffff",
          strokeWidth: 2,
          left: centerX - 60,
          top: centerY - 30
        });
        const platformText = new window.fabric.Text("Platform", {
          fontSize: 14,
          fill: "#ffffff",
          left: centerX - 30,
          top: centerY - 7
        });
        obj = new window.fabric.Group([platform, platformText]);
        break;

      default:
        return;
    }

    fabricCanvas.add(obj);
    fabricCanvas.setActiveObject(obj);
    fabricCanvas.renderAll();
    setSelectedTool(null);
  };

  // Delete selected object
  const deleteSelected = () => {
    if (!fabricCanvas || !allowCustomization) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
      fabricCanvas.remove(activeObject);
      fabricCanvas.renderAll();
    }
  };

  // Clear canvas
  const clearCanvas = () => {
    if (!fabricCanvas || !allowCustomization) return;
    if (window.confirm("Are you sure you want to clear all objects?")) {
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = "#1f2937";
      fabricCanvas.renderAll();
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const customerId = getCustomerId();
      
      // Validate all required fields
      if (!customerId) {
        alert("Error: Could not find user ID. Please log in again.");
        return;
      }

      if (!bookingForm.location.trim()) {
        alert("Please enter a location");
        return;
      }

      if (!bookingForm.event_date) {
        alert("Please select an event date");
        return;
      }

      if (!bookingForm.event_time) {
        alert("Please select an event time");
        return;
      }

      if (!packageData.Package_ID && !packageData.id) {
        alert("Error: Package ID not found. Please go back and select a package again.");
        return;
      }
      
      // Get canvas layout
      let canvasLayout = null;
      if (fabricCanvas && allowCustomization) {
        canvasLayout = JSON.stringify(fabricCanvas.toJSON());
      }

      const bookingData = {
        customer_id: customerId,
        package_id: packageData.Package_ID || packageData.id,
        location: bookingForm.location.trim(),
        event_date: bookingForm.event_date,
        event_time: bookingForm.event_time,
        notes: bookingForm.special_requests,
        custom_layout: canvasLayout
      };

      console.log("Sending booking data:", bookingData);
      console.log("packageData:", packageData);

      // Send booking to API
      const response = await fetch("http://localhost:3001/api/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (result.status === "success") {
        alert("Booking submitted successfully!");
        navigate("/bookings");
      } else {
        alert("Error: " + (result.message || "Failed to submit booking"));
      }

    } catch (err) {
      console.error("Booking error:", err);
      alert("Error submitting booking. Please try again.");
    }
  };

  if (!packageData) {
    return null;
  }

  return (
    <div className="bp-root">
      {/* Header */}
      <header className="bp-header">
        <div className="bp-brand" onClick={() => navigate("/customer-home")}>
          Eventique
        </div>
        <button className="bp-back" onClick={() => navigate("/customer-packages")}>
          ← Back to Packages
        </button>
      </header>

      {/* Main Content */}
      <main className="bp-main">
        <div className="bp-container">
          {/* Left: Canvas */}
          <div className="bp-canvas-section">
            <div className="bp-section-header">
              <h2>Event Layout Preview</h2>
              <label className="bp-customize-checkbox">
                <input
                  type="checkbox"
                  checked={allowCustomization}
                  onChange={(e) => setAllowCustomization(e.target.checked)}
                />
                <span>Allow me to customize the layout</span>
              </label>
            </div>

            <div className="bp-canvas-container">
              <canvas ref={canvasRef} id="bookingCanvas"></canvas>
            </div>

            {allowCustomization && (
              <div className="bp-canvas-tools">
                <div className="bp-tools-header">
                  <h3>Add Items</h3>
                  <div className="bp-tools-actions">
                    <button className="bp-tool-btn delete" onClick={deleteSelected}>
                      Delete Selected
                    </button>
                    <button className="bp-tool-btn clear" onClick={clearCanvas}>
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="bp-tools-grid">
                  <button
                    className={`bp-tool-item ${selectedTool === "table" ? "active" : ""}`}
                    onClick={() => addObject("table")}
                  >
                    <div className="tool-icon">▢</div>
                    <span>Table</span>
                  </button>
                  <button
                    className={`bp-tool-item ${selectedTool === "round-table" ? "active" : ""}`}
                    onClick={() => addObject("round-table")}
                  >
                    <div className="tool-icon">●</div>
                    <span>Round Table</span>
                  </button>
                  <button
                    className={`bp-tool-item ${selectedTool === "chair" ? "active" : ""}`}
                    onClick={() => addObject("chair")}
                  >
                    <div className="tool-icon">□</div>
                    <span>Chair</span>
                  </button>
                  <button
                    className={`bp-tool-item ${selectedTool === "tent" ? "active" : ""}`}
                    onClick={() => addObject("tent")}
                  >
                    <div className="tool-icon">△</div>
                    <span>Tent</span>
                  </button>
                  <button
                    className={`bp-tool-item ${selectedTool === "platform" ? "active" : ""}`}
                    onClick={() => addObject("platform")}
                  >
                    <div className="tool-icon">▭</div>
                    <span>Platform</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Booking Form */}
          <div className="bp-form-section">
            <div className="bp-package-info">
              <h2>{packageData.Package_Name}</h2>
              <div className="bp-package-price">₱{packageData.Package_Amount?.toLocaleString()}</div>
              
              <div className="bp-package-specs">
                <div className="bp-spec-row">
                  <span>Tables:</span>
                  <strong>{packageData.NumTables || 0}</strong>
                </div>
                <div className="bp-spec-row">
                  <span>Round Tables:</span>
                  <strong>{packageData.NumRoundTables || 0}</strong>
                </div>
                <div className="bp-spec-row">
                  <span>Chairs:</span>
                  <strong>{packageData.NumChairs || 0}</strong>
                </div>
                <div className="bp-spec-row">
                  <span>Tents:</span>
                  <strong>{packageData.NumTent || 0}</strong>
                </div>
                <div className="bp-spec-row">
                  <span>Platforms:</span>
                  <strong>{packageData.NumPlatform || 0}</strong>
                </div>
              </div>

              {packageData.Description && (
                <div className="bp-package-desc">
                  <h3>Description</h3>
                  <p>{packageData.Description}</p>
                </div>
              )}
            </div>

            <form className="bp-booking-form" onSubmit={handleSubmit}>
              <h3>Booking Information</h3>

              <div className="bp-form-group">
                <label>Event Location *</label>
                <input
                  type="text"
                  value={bookingForm.location}
                  onChange={(e) => setBookingForm({...bookingForm, location: e.target.value})}
                  placeholder="Enter event venue/location"
                  required
                />
              </div>

              <div className="bp-form-row">
                <div className="bp-form-group">
                  <label>Event Date *</label>
                  <input
                    type="date"
                    value={bookingForm.event_date}
                    onChange={(e) => setBookingForm({...bookingForm, event_date: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="bp-form-group">
                  <label>Event Time *</label>
                  <input
                    type="time"
                    value={bookingForm.event_time}
                    onChange={(e) => setBookingForm({...bookingForm, event_time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="bp-form-group">
                <label>Special Requests (Optional)</label>
                <textarea
                  value={bookingForm.special_requests}
                  onChange={(e) => setBookingForm({...bookingForm, special_requests: e.target.value})}
                  placeholder="Any special requests or notes for your event..."
                  rows="4"
                />
              </div>

              <div className="bp-form-actions">
                <button type="button" className="bp-cancel-btn" onClick={() => navigate("/customer-packages")}>
                  Cancel
                </button>
                <button type="submit" className="bp-submit-btn">
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
