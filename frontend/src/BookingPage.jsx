import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BookingPage.css";

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef(null);
  const mapRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const packageData = location.state?.package;
  const [mapInstance, setMapInstance] = useState(null);
  const [markerInstance, setMarkerInstance] = useState(null);

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

  // Redirect if no package data
  useEffect(() => {
    if (!packageData) {
      navigate("/customer-packages");
    }
  }, [packageData, navigate]);

  // Load Fabric.js from CDN
  useEffect(() => {
    if (!window.fabric) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Load Google Maps API
  useEffect(() => {
    if (window.google && window.google.maps) return;
    
    window.initMap = () => {
      if (mapRef.current && !mapInstance) {
        const defaultCenter = { lat: 12.8797, lng: 121.7740 };
        
        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 10,
          center: defaultCenter,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false
        });
        setMapInstance(map);
        
        const marker = new window.google.maps.Marker({
          position: defaultCenter,
          map: map,
          title: "Event Location"
        });
        setMarkerInstance(marker);
      }
    };
    
    const script = document.createElement("script");
    script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyDKwU_Wdkzs8bBzS36dGdwdqLqDxYGzMhk&libraries=places&callback=initMap";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  // Handle location change and update map
  useEffect(() => {
    if (!bookingForm.location || !mapRef.current || !window.google) return;

    const geocoder = new window.google.maps.Geocoder();
    
    geocoder.geocode({ address: bookingForm.location }, (results, status) => {
      if (status === window.google.maps.GeocoderStatus.OK && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        
        // Initialize or update map
        if (!mapInstance) {
          const map = new window.google.maps.Map(mapRef.current, {
            zoom: 15,
            center: { lat: lat(), lng: lng() },
            mapTypeControl: false,
            fullscreenControl: false
          });
          setMapInstance(map);
          
          // Add marker
          const marker = new window.google.maps.Marker({
            position: { lat: lat(), lng: lng() },
            map: map,
            title: bookingForm.location
          });
          setMarkerInstance(marker);
        } else {
          // Update existing map and marker
          mapInstance.setCenter({ lat: lat(), lng: lng() });
          markerInstance.setPosition({ lat: lat(), lng: lng() });
          markerInstance.setTitle(bookingForm.location);
        }
      }
    });
  }, [bookingForm.location, mapInstance, markerInstance]);

  // Initialize canvas
  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !window.fabric || !packageData.package_layout) return;

    const container = canvasRef.current.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const canvas = new window.fabric.Canvas(canvasRef.current, {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: "#1f2937",
      selection: true,
      uniformScaling: true
    });

    setFabricCanvas(canvas);

    // Load package layout
    try {
      const layoutData = typeof packageData.package_layout === "string" 
        ? JSON.parse(packageData.package_layout) 
        : packageData.package_layout;
      
      canvas.loadFromJSON(layoutData, () => {
        canvas.renderAll();
        // Load objects as fully interactive, will be controlled by the other effect
        canvas.forEachObject((obj) => {
          obj.selectable = true;
          obj.evented = true;
          obj.hasControls = true;
          obj.hasBorders = true;
          obj.lockMovementX = false;
          obj.lockMovementY = false;
        });
        canvas.renderAll();
      });
    } catch (err) {
      console.error("Error loading canvas layout:", err);
    }

    return () => {
      canvas.dispose();
    };
  }, [packageData.package_layout]);

  // Update canvas when customization changes
  useEffect(() => {
    if (!fabricCanvas) return;
    
    fabricCanvas.selection = allowCustomization;
    fabricCanvas.forEachObject((obj) => {
      obj.selectable = allowCustomization;
      obj.evented = allowCustomization;
      obj.hasControls = allowCustomization;
      obj.hasBorders = allowCustomization;
      obj.lockMovementX = !allowCustomization;
      obj.lockMovementY = !allowCustomization;
    });
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
        <div className="bp-container" style={{maxWidth: '1600px', display: 'flex', gap: '0'}}>
          {/* Left: Canvas - 62% width to match designer */}
          <div className="bp-canvas-section" style={{flex: '0 0 62%', padding: '28px', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column'}}>
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

            <div style={{flex: 1, border: '3px solid #d1d5db', borderRadius: '10px', position: 'relative', minHeight: '600px', overflow: 'hidden', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start'}}>
              <canvas ref={canvasRef} id="bookingCanvas" style={{display: 'block'}}></canvas>
              {/* Message overlay when not customizing */}
              {!allowCustomization && (
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
                  pointerEvents: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '500',
                  textAlign: 'center',
                  padding: '20px',
                  backdropFilter: 'blur(3px)'
                }}>
                  <div>
                    <div style={{fontSize: '48px', marginBottom: '15px'}}>🔒</div>
                    <div>Check the box above if you want to customize this layout</div>
                    <div style={{fontSize: '14px', marginTop: '10px', opacity: '0.8'}}>
                      You can move and rearrange items when customization is enabled
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Booking Form - 38% width to match designer */}
          <div className="bp-form-section" style={{flex: '0 0 38%', padding: '28px', overflowY: 'auto'}}>
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
                <div style={{marginTop: '15px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'}}>
                  <div 
                    ref={mapRef} 
                    style={{
                      width: '100%',
                      height: '300px',
                      backgroundColor: '#e5e3df'
                    }}
                  />
                </div>
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
