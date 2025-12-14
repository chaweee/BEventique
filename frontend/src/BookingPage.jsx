import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CoolButton from "./CoolButton";
import "./BookingPage.css";
import "./Signup.css";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { Tooltip } from '@mui/material';
import dayjs from 'dayjs';

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const canvasContainerRef = useRef(null);
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
  
  // Booked dates state
  const [bookedDates, setBookedDates] = useState([]);

  // Booking preview state
  const [bookingPreview, setBookingPreview] = useState(null);
  const [bookingReceipt, setBookingReceipt] = useState(null);
  const previewCanvasRef = useRef(null);
  const previewFabricRef = useRef(null);
  const receiptRef = useRef(null);
  
  // Success modal state
  const [showSuccess, setShowSuccess] = useState(false);

  // Feedback modal state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackRate, setFeedbackRate] = useState(0);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

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

  // Fetch booked dates on component mount
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

  // Load Fabric.js from CDN
  useEffect(() => {
    if (!window.fabric) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
    // load html2canvas for converting receipt HTML to image
    if (!window.html2canvas) {
      const s2 = document.createElement('script');
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s2.async = true;
      document.body.appendChild(s2);
    }
  }, []);

  // Initialize canvas
  // Initialize canvas
  useEffect(() => {
    if (!canvasContainerRef.current || !window.fabric || !packageData || !packageData.package_layout) return;

    let isMounted = true;
    let canvasInstance = null;
    let canvasEl = null;
    
    const container = canvasContainerRef.current;
    if (!container) return;
    
    // Prefer the user's customized canvas size when available
    const sourceCanvas = fabricCanvas || null;
    const sourceWidth = sourceCanvas && typeof sourceCanvas.getWidth === 'function' ? sourceCanvas.getWidth() : container.clientWidth;
    const sourceHeight = sourceCanvas && typeof sourceCanvas.getHeight === 'function' ? sourceCanvas.getHeight() : container.clientHeight;
    const containerWidth = sourceWidth;
    const containerHeight = sourceHeight;

    try {
      // create a wrapper div (absolute) appended to the container so it stays aligned
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      // position it relative inside the container
      wrapper.style.left = '0px';
      wrapper.style.top = '0px';
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      wrapper.style.overflow = 'hidden';
      wrapper.style.pointerEvents = 'none';
      wrapper.style.zIndex = '1000';
      // ensure container is positioned so absolute child aligns correctly
      try { container.style.position = container.style.position || 'relative'; } catch (e) {}
      container.appendChild(wrapper);

      canvasEl = document.createElement('canvas');
      canvasEl.id = 'bookingCanvas_internal';
      canvasEl.style.display = 'block';
      canvasEl.width = containerWidth;
      canvasEl.height = containerHeight;
      // canvas inside wrapper so it gets clipped by container area
      wrapper.appendChild(canvasEl);

      canvasInstance = new window.fabric.Canvas(canvasEl, {
        width: containerWidth,
        height: containerHeight,
        backgroundColor: "#1f2937",
        selection: true,
        uniformScaling: true
      });

      // allow targeting sub-objects inside groups and more precise hit-testing
      canvasInstance.subTargetCheck = true;
      canvasInstance.perPixelTargetFind = true;

      if (isMounted) {
        console.log('[canvas] init BookingPage', { time: Date.now(), width: containerWidth, height: containerHeight });
        // attach element and wrapper for cleanup & syncing
        canvasInstance.__canvasEl = canvasEl;
        canvasInstance.__wrapperEl = wrapper;

        // wrapper is appended to container so it stays aligned; no global sync required
        canvasInstance.__syncPosition = null;
        setFabricCanvas(canvasInstance);

        // Load package layout
        const layoutData = typeof packageData.package_layout === "string" 
          ? JSON.parse(packageData.package_layout) 
          : packageData.package_layout;
        
        canvasInstance.loadFromJSON(layoutData, () => {
          if (!isMounted) return;
          canvasInstance.renderAll();
          // Load objects as fully interactive, will be controlled by the other effect
          canvasInstance.forEachObject((obj) => {
            obj.selectable = true;
            obj.evented = true;
            obj.hasControls = true;
            obj.hasBorders = true;
            obj.lockMovementX = false;
            obj.lockMovementY = false;
          });
          canvasInstance.renderAll();
        });
      }
    } catch (err) {
      console.error("Error initializing canvas:", err);
    }

  return () => {
    isMounted = false;
    console.log('[canvas] cleanup BookingPage', { time: Date.now() });
      if (canvasInstance) {
      try {
        const wrapperEl = canvasInstance.__wrapperEl;
        const ce = canvasInstance.__canvasEl;
        canvasInstance.dispose();
        if (ce && ce.parentNode) ce.parentNode.removeChild(ce);
        if (wrapperEl && wrapperEl.parentNode) wrapperEl.parentNode.removeChild(wrapperEl);
      } catch (err) {
        console.warn('Error disposing canvas (BookingPage):', err?.message || err);
      }
      canvasInstance = null;
    }
    setFabricCanvas(null);
  };
}, [packageData?.package_layout, packageData]);  // Update canvas when customization changes
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

  // Create preview canvas when bookingPreview is active
  useEffect(() => {
    if (!bookingPreview || !bookingReceipt || !previewCanvasRef.current || !window.fabric) return;

    // create a wrapper and canvas inside the preview container so it aligns reliably
    const container = previewCanvasRef.current;
    const sourceWidth = container.clientWidth;
    const sourceHeight = container.clientHeight;
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    // center the wrapper inside the preview box and allow scaling
    wrapper.style.left = '50%';
    wrapper.style.top = '50%';
    wrapper.style.overflow = 'hidden';
    wrapper.style.pointerEvents = 'auto';
    wrapper.style.zIndex = '1000';
    try { container.style.position = container.style.position || 'relative'; } catch (e) {}
    container.appendChild(wrapper);

    // If the live editor canvas exists, copy its rendered image to the preview
    let createdImg = null;
    let canvas = null;
    if (fabricCanvas && typeof fabricCanvas.toDataURL === 'function') {
      try {
        const layoutW = typeof fabricCanvas.getWidth === 'function' ? fabricCanvas.getWidth() : sourceWidth;
        const layoutH = typeof fabricCanvas.getHeight === 'function' ? fabricCanvas.getHeight() : sourceHeight;
        const dataUrl = fabricCanvas.toDataURL({ format: 'png' });
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.display = 'block';
        img.width = layoutW;
        img.height = layoutH;
        wrapper.appendChild(img);
        createdImg = img;
        // store pointers for cleanup consistent with fabric objects
        previewFabricRef.current = { __wrapperEl: wrapper, __canvasEl: img, __isImage: true, __width: layoutW, __height: layoutH };
      } catch (err) {
        console.warn('Error creating image preview from live canvas:', err);
      }
    }

    // If we didn't create an image (no live editor available), create a StaticCanvas and load JSON
    if (!createdImg) {
      const canvasEl = document.createElement('canvas');
      canvasEl.style.display = 'block';
      wrapper.appendChild(canvasEl);

      canvas = new window.fabric.StaticCanvas(canvasEl, {
        width: sourceWidth,
        height: sourceHeight,
        backgroundColor: '#1f2937'
      });
      // enable sub-target and better hit testing
      canvas.subTargetCheck = true;
      canvas.perPixelTargetFind = true;
      previewFabricRef.current = canvas;

      // load layout from bookingReceipt.custom_layout (may be string)
      try {
        const layoutData = bookingReceipt.custom_layout
          ? (typeof bookingReceipt.custom_layout === 'string' ? JSON.parse(bookingReceipt.custom_layout) : bookingReceipt.custom_layout)
          : null;
        if (layoutData) {
          canvas.loadFromJSON(layoutData, () => {
            canvas.renderAll();
          });
        }
      } catch (err) {
        console.error('Error loading preview layout:', err);
      }

      // wrapper is child of container so it stays aligned; no global sync needed
      canvas.__wrapperEl = wrapper;
      canvas.__canvasEl = canvasEl;
      canvas.__syncPosition = null;
    }

    // If we have a saved custom layout with dimensions, size the canvas accordingly
    try {
      // try to read width/height from the serialized layout if available
      const layoutData = bookingReceipt.custom_layout
        ? (typeof bookingReceipt.custom_layout === 'string' ? JSON.parse(bookingReceipt.custom_layout) : bookingReceipt.custom_layout)
        : null;
      let layoutW = null;
      let layoutH = null;
      if (layoutData && layoutData.width && layoutData.height) {
        layoutW = layoutData.width;
        layoutH = layoutData.height;
      }
      // fallback to actual fabric canvas (if user just customized in this session)
      if ((!layoutW || !layoutH) && fabricCanvas) {
        if (typeof fabricCanvas.getWidth === 'function') layoutW = fabricCanvas.getWidth();
        if (typeof fabricCanvas.getHeight === 'function') layoutH = fabricCanvas.getHeight();
      }
      // Final fallback to preview container size
      if (!layoutW) layoutW = sourceWidth;
      if (!layoutH) layoutH = sourceHeight;

      // set canvas element pixel size and fabric size (only if we created a canvas, not img)
      if (canvas) {
        const canvasEl = canvas.__canvasEl;
        if (canvasEl) {
          canvasEl.width = layoutW;
          canvasEl.height = layoutH;
        }
        canvas.setWidth(layoutW);
        canvas.setHeight(layoutH);
      }

      // set wrapper to source (full) size then scale it to match the editor box
      wrapper.style.width = layoutW + 'px';
      wrapper.style.height = layoutH + 'px';

      // compute scale so the preview visually matches the editing canvas area
      const editor = canvasContainerRef.current;
      const targetW = editor ? editor.clientWidth : sourceWidth;
      const targetH = editor ? editor.clientHeight : sourceHeight;
      const scale = Math.min(1, targetW / layoutW, targetH / layoutH);
      wrapper.style.transformOrigin = 'center center';
      wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
    } catch (err) {
      console.warn('Error sizing preview canvas:', err);
    }

    // (redundant sizing removed)

    return () => {
      try {
        const ref = previewFabricRef.current;
        if (ref) {
          // call dispose if available (fabric canvas), otherwise skip
          if (typeof ref.dispose === 'function') {
            try { ref.dispose(); } catch (e) {}
          }
          const w = ref.__wrapperEl;
          const c = ref.__canvasEl;
          if (c && c.parentNode) c.parentNode.removeChild(c);
          if (w && w.parentNode) w.parentNode.removeChild(w);
          previewFabricRef.current = null;
        }
      } catch (err) {
        console.warn('Error cleaning preview canvas:', err);
      }
    };
  }, [bookingPreview, bookingReceipt]);

  // Ensure wrapper pointer-events follows allowCustomization state
  useEffect(() => {
    if (!fabricCanvas) return;
    try {
      const wrapper = fabricCanvas.__wrapperEl;
      if (wrapper) {
        wrapper.style.pointerEvents = allowCustomization ? 'auto' : 'none';
      }
    } catch (e) {
      // ignore
    }
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
  };

  // Delete selected object (reserved for future use)
  // const deleteSelected = () => {
  //   if (!fabricCanvas || !allowCustomization) return;
  //   const activeObject = fabricCanvas.getActiveObject();
  //   if (activeObject) {
  //     fabricCanvas.remove(activeObject);
  //     fabricCanvas.renderAll();
  //   }
  // };

  // Clear canvas (reserved for future use)
  // const clearCanvas = () => {
  //   if (!fabricCanvas || !allowCustomization) return;
  //   if (window.confirm("Are you sure you want to clear all objects?")) {
  //     fabricCanvas.clear();
  //     fabricCanvas.backgroundColor = "#1f2937";
  //     fabricCanvas.renderAll();
  //   }
  // };

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
      
      // Get canvas layout - always save it (whether customized or not)
      let customLayout = null;
      
      if (fabricCanvas) {
        try {
          // Serialize the entire canvas state including the layout
          // This captures both original and customized layouts
          customLayout = JSON.stringify(fabricCanvas.toJSON());
        } catch (err) {
          console.error("Error serializing canvas layout:", err);
          // If canvas serialization fails, try to get the original package layout
          if (packageData.package_layout) {
            customLayout = typeof packageData.package_layout === "string" 
              ? packageData.package_layout 
              : JSON.stringify(packageData.package_layout);
          }
        }
      } else if (packageData.package_layout) {
        // If canvas hasn't initialized, store the original package layout
        customLayout = typeof packageData.package_layout === "string" 
          ? packageData.package_layout 
          : JSON.stringify(packageData.package_layout);
      }

      const bookingData = {
        customer_id: customerId,
        package_id: packageData.Package_ID || packageData.id,
        event_type: packageData.Event_Type || packageData.EventType || packageData.Event || packageData.Type || null,
        event_date: bookingForm.event_date,
        event_time: bookingForm.event_time,
        location: bookingForm.location.trim(),
        custom_layout: customLayout, // Stores layout whether customized or original
        base_price: packageData.Package_Price || packageData.price,
        notes: bookingForm.special_requests || null
      };

      console.log("=== BOOKING DEBUG ===");
      console.log("Customer ID:", customerId);
      console.log("sessionStorage user:", sessionStorage.getItem("user"));
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
      console.log("Booking creation result:", result);

      if (result.status === "success") {
        // Store receipt data
        setBookingReceipt({
          booking_id: result.booking_id,
          ...bookingData,
          package_price: result.package_price || packageData.Package_Amount || packageData.Package_Price || packageData.price,
          package_name: result.package_name || packageData.Package_Name || packageData.name,
          package_description: result.package_description || packageData.Description || "",
          package_inclusions: result.package_inclusions || "",
          customer_name: result.customer_name || "Guest",
          customer_email: result.customer_email || "",
          customer_phone: result.customer_phone || "",
          designer_id: packageData.Designer_ID || packageData.designer_id
        });
        console.log("Set booking receipt - customer_name:", result.customer_name, "phone:", result.customer_phone);
        
        // Show success message first
        setShowSuccess(true);
      } else {
        alert("Error: " + (result.message || "Failed to submit booking"));
      }

    } catch (err) {
      console.error("Booking error:", err);
      alert("Error submitting booking. Please try again.");
    }
  };

  

  // Download receipt as image (JPEG) using html2canvas
  const handleDownloadReceiptImage = async () => {
    if (!receiptRef.current) return;
    if (!window.html2canvas) {
      alert('html2canvas not loaded yet. Try again in a moment.');
      return;
    }
    try {
      const canvas = await window.html2canvas(receiptRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const el = document.createElement('a');
      el.href = URL.createObjectURL(blob);
      el.download = `Eventique-Receipt-${bookingReceipt.booking_id}.jpg`;
      document.body.appendChild(el);
      el.click();
      document.body.removeChild(el);
    } catch (err) {
      console.error('Error creating receipt image:', err);
      alert('Failed to create receipt image');
    }
  };

  // Download layout canvas as JPEG blob
  const handleDownloadLayoutImage = async () => {
    let dataUrl = null;
    try {
      if (fabricCanvas && typeof fabricCanvas.toDataURL === 'function') {
        dataUrl = fabricCanvas.toDataURL({ format: 'jpeg', quality: 0.92 });
      } else if (previewFabricRef.current) {
        const ref = previewFabricRef.current;
        const el = ref.__canvasEl || ref.__imgEl || ref.__canvasEl;
        if (el && el.nodeName === 'CANVAS') {
          dataUrl = el.toDataURL('image/jpeg', 0.92);
        } else if (el && el.nodeName === 'IMG') {
          // img.src may be dataURL already or a remote URL; fetch it
          dataUrl = el.src;
        }
      }

      if (!dataUrl) return alert('Canvas not ready');

      // If dataUrl is a data: URL or regular URL, fetch and download as blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const el = document.createElement('a');
      el.href = URL.createObjectURL(blob);
      el.download = `Eventique-Layout-${bookingReceipt?.booking_id || 'snapshot'}.jpg`;
      document.body.appendChild(el);
      el.click();
      document.body.removeChild(el);
    } catch (err) {
      console.error('Error exporting layout image:', err);
      alert('Failed to export layout');
    }
  };

  // Feedback submit handler
  const handleSubmitFeedback = async () => {
    setFeedbackSubmitting(true);
    setFeedbackError("");
    try {
      const customerId = getCustomerId();
      if (!customerId) {
        setFeedbackError("User not found. Please log in again.");
        setFeedbackSubmitting(false);
        return;
      }
      if (!feedbackText.trim()) {
        setFeedbackError("Please enter your feedback.");
        setFeedbackSubmitting(false);
        return;
      }
      if (!feedbackRate) {
        setFeedbackError("Please select a rating.");
        setFeedbackSubmitting(false);
        return;
      }
      // Try both possible endpoints for compatibility
      let res = await fetch("http://localhost:3001/api/feedback/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Account_ID: customerId,
          feedback: feedbackText,
          rate: feedbackRate
        })
      });
      let json;
      try {
        json = await res.json();
      } catch {
        json = {};
      }
      // If endpoint not found or error, try /api/feedback (legacy)
      if (!res.ok || json.status !== "success") {
        res = await fetch("http://localhost:3001/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Account_ID: customerId,
            feedback: feedbackText,
            rate: feedbackRate
          })
        });
        try {
          json = await res.json();
        } catch {
          json = {};
        }
      }
      if (json.status === "success") {
        setFeedbackSuccess(true);
      } else {
        setFeedbackError(json.message || "Failed to submit feedback.");
      }
    } catch (err) {
      setFeedbackError("Failed to submit feedback.");
    }
    setFeedbackSubmitting(false);
  };

  if (!packageData) {
    return null;
  }

  // Show booking preview if booking was successful
  if (bookingPreview && bookingReceipt) {
    return (
      <div className="bp-root">
        <header className="bp-header">
          <div className="bp-brand" onClick={() => navigate("/customer-home")}>
            Eventique
          </div>
        </header>

        <main className="bp-main">
          <div className="bp-preview-container" style={{display: 'flex', gap: '24px', alignItems: 'flex-start', justifyContent: 'center'}}>
            {/* Left: Receipt */}
            <div className="bp-preview-card" style={{flex: '0 0 50%', padding: '24px'}}>
              <div className="bp-preview-header">
                <h1>✓ Booking Confirmed!</h1>
                <p>Your booking has been successfully submitted.</p>
              </div>
              <div className="bp-preview-content" ref={receiptRef} style={{background:'#fff', padding:'32px', borderRadius: '8px', color: '#111', fontFamily: 'system-ui, -apple-system, sans-serif'}}>
                {/* Booking Receipt ID at Top */}
                <div style={{textAlign: 'center', marginBottom: '20px'}}>
                  <p style={{margin: 0, fontSize: '14px', fontWeight: '600', color: '#6b7280'}}>Receipt ID: #{bookingReceipt.booking_id}</p>
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
                      <strong style={{color: '#111'}}>{bookingReceipt.customer_name}</strong>
                      {bookingReceipt.customer_phone && (
                        <span style={{color: '#6b7280', marginLeft: '24px', fontWeight: '500'}}>
                          Phone #: <strong style={{color: '#111'}}>{bookingReceipt.customer_phone}</strong>
                        </span>
                      )}
                    </div>
                    {bookingReceipt.customer_email && (
                      <div>
                        <span style={{color: '#6b7280', fontWeight: '500'}}>Email:</span>{' '}
                        <strong style={{color: '#111'}}>{bookingReceipt.customer_email}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Package Details */}
                <div style={{marginBottom: '20px'}}>
                  <h4 style={{margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#374151', textTransform: 'uppercase'}}>Package Details</h4>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
                    <span style={{color: '#6b7280', fontSize: '14px'}}>Package Name</span>
                    <strong style={{color: '#111', fontSize: '14px'}}>{bookingReceipt.package_name}</strong>
                  </div>
                  {bookingReceipt.package_inclusions && (
                    <div style={{padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
                      <span style={{color: '#6b7280', fontSize: '14px', display: 'block', marginBottom: '4px'}}>Package Inclusions</span>
                      <strong style={{color: '#111', fontSize: '14px'}}>{bookingReceipt.package_inclusions}</strong>
                    </div>
                  )}
                  {bookingReceipt.package_description && (
                    <div style={{padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
                      <span style={{color: '#6b7280', fontSize: '14px', display: 'block', marginBottom: '4px'}}>Package Description</span>
                      <p style={{margin: 0, color: '#111', fontSize: '13px', lineHeight: '1.5'}}>{bookingReceipt.package_description}</p>
                    </div>
                  )}
                </div>

                {/* Event Details */}
                <div style={{marginBottom: '20px'}}>
                  <h4 style={{margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#374151', textTransform: 'uppercase'}}>Event Details</h4>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
                    <span style={{color: '#6b7280', fontSize: '14px'}}>Location</span>
                    <strong style={{color: '#111', fontSize: '14px', textAlign: 'right', maxWidth: '60%'}}>{bookingReceipt.location}</strong>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
                    <span style={{color: '#6b7280', fontSize: '14px'}}>Date</span>
                    <strong style={{color: '#111', fontSize: '14px'}}>{new Date(bookingReceipt.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
                    <span style={{color: '#6b7280', fontSize: '14px'}}>Time</span>
                    <strong style={{color: '#111', fontSize: '14px'}}>{bookingReceipt.event_time}</strong>
                  </div>
                </div>

                {/* Special Requests */}
                {bookingReceipt.notes && (
                  <div style={{marginBottom: '20px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '6px', borderLeft: '4px solid #f59e0b'}}>
                    <h4 style={{margin: '0 0 6px 0', fontSize: '13px', fontWeight: '600', color: '#92400e'}}>Special Requests</h4>
                    <p style={{margin: 0, fontSize: '13px', color: '#78350f', lineHeight: '1.5'}}>{bookingReceipt.notes}</p>
                  </div>
                )}

                {/* Total Amount */}
                <div style={{marginTop: '24px', padding: '16px', backgroundColor: '#1f2937', borderRadius: '6px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{color: '#f9fafb', fontSize: '16px', fontWeight: '600'}}>TOTAL AMOUNT</span>
                    <strong style={{color: '#fff', fontSize: '24px', fontWeight: '700'}}>₱{bookingReceipt.package_price?.toLocaleString()}</strong>
                  </div>
                </div>

                {/* Payment Instructions */}
                <div style={{marginTop: '24px', padding: '16px', backgroundColor: '#dbeafe', borderRadius: '6px', borderLeft: '4px solid #3b82f6'}}>
                  <h4 style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1e40af'}}>📋 IMPORTANT - Payment Instructions</h4>
                  <p style={{margin: '0 0 6px 0', fontSize: '13px', color: '#1e3a8a', lineHeight: '1.6'}}>
                    <strong>Walk-in Payment Required:</strong> Please visit our office to complete the payment for this booking.
                  </p>
                  <p style={{margin: 0, fontSize: '13px', color: '#1e3a8a', lineHeight: '1.6'}}>
                    Your booking will be <strong>approved after payment verification</strong>. Thank you!
                  </p>
                </div>

                {/* Footer */}
                <div style={{marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', textAlign: 'center'}}>
                  <p style={{margin: '0', fontSize: '12px', color: '#9ca3af', lineHeight: '1.5'}}>
                    Thank you for choosing Eventique!<br/>
                    For inquiries, please contact us or visit your bookings page.
                  </p>
                </div>
              </div>

              <div style={{display:'flex', gap:'8px', marginTop:'12px', justifyContent:'space-between'}}>
                <button className="bp-receipt-btn" onClick={handleDownloadReceiptImage}>🖼️ Download Receipt (JPEG)</button>
                <button className="bp-home-btn" onClick={() => navigate('/bookings')}>View My Bookings</button>
              </div>
              {/* Feedback Button */}
              <div style={{marginTop: '24px', textAlign: 'center'}}>
                <button
                  style={{
                    background: '#f59e42',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 32px',
                    fontWeight: 600,
                    fontSize: '17px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px #f59e4222',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => setShowFeedback(true)}
                >
                  Leave Feedback
                </button>
              </div>
            </div>

            {/* Right: Final layout canvas */}
            <div style={{flex: '0 0 60%', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px'}}>
              <h3 style={{fontSize: '24px', marginBottom: '16px', color: '#1f2937'}}>Final Layout</h3>
              <div style={{height: '800px', position: 'relative', borderRadius: 8, backgroundColor: '#fff'}}>
                <div ref={previewCanvasRef} style={{width: '100%', height: '100%'}} />
              </div>
              <div style={{display: 'flex', justifyContent: 'center', marginTop: '16px'}}>
                <button className="bp-receipt-btn" onClick={handleDownloadLayoutImage}>💾 Download Layout (JPEG)</button>
              </div>
            </div>
          </div>
        </main>
        {/* Feedback Modal */}
        {showFeedback && (
          <div className="modal-backdrop" style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div className="modal-card" style={{
              background: '#fff8f1',
              borderRadius: '16px',
              padding: '36px 32px 28px 32px',
              minWidth: '350px',
              maxWidth: '95vw',
              boxShadow: '0 8px 32px #0002',
              position: 'relative',
              border: '2px solid #a0522d'
            }}>
              <button
                style={{
                  position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 28, color: '#a0522d', cursor: 'pointer'
                }}
                onClick={() => setShowFeedback(false)}
                aria-label="Close"
              >×</button>
              <h2 style={{margin: 0, fontWeight: 700, fontSize: 24, color: '#8b4513', textAlign: 'center'}}>We value your feedback!</h2>
              <p style={{margin: '12px 0 20px 0', color: '#a0522d', textAlign: 'center'}}>How was your booking experience?</p>
              <div style={{display: 'flex', justifyContent: 'center', marginBottom: 18}}>
                {[1,2,3,4,5].map(star => (
                  <span
                    key={star}
                    style={{
                      fontSize: 36,
                      color: feedbackRate >= star ? '#a0522d' : '#e5e7eb',
                      cursor: 'pointer',
                      transition: 'color 0.15s'
                    }}
                    onClick={() => setFeedbackRate(star)}
                    onMouseOver={() => setFeedbackRate(star)}
                    onMouseLeave={() => setFeedbackRate(feedbackRate)}
                    role="button"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >★</span>
                ))}
              </div>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Share your thoughts or suggestions..."
                rows={4}
                style={{
                  width: '100%',
                  border: '1.5px solid #a0522d',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '15px',
                  marginBottom: '16px',
                  resize: 'vertical',
                  background: '#fdf6f0',
                  color: '#5c3310'
                }}
                maxLength={500}
              />
              {feedbackError && (
                <div style={{color: '#b91c1c', background: '#fee2e2', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: 14}}>
                  {feedbackError}
                </div>
              )}
              {feedbackSuccess ? (
                <div style={{color: '#fff', background: '#a0522d', borderRadius: 6, padding: '10px 14px', textAlign: 'center', fontWeight: 600, fontSize: 16}}>
                  Thank you for your feedback!
                  <div>
                    <button
                      style={{
                        marginTop: 14,
                        background: '#8b4513',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 28px',
                        fontWeight: 600,
                        fontSize: '15px',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setShowFeedback(false);
                        setFeedbackText("");
                        setFeedbackRate(0);
                        setFeedbackSuccess(false);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  style={{
                    background: '#a0522d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 32px',
                    fontWeight: 600,
                    fontSize: '17px',
                    cursor: feedbackSubmitting ? 'not-allowed' : 'pointer',
                    width: '100%',
                    marginTop: 4,
                    boxShadow: '0 2px 8px #a0522d22'
                  }}
                  disabled={feedbackSubmitting}
                  onClick={handleSubmitFeedback}
                >
                  {feedbackSubmitting ? "Submitting..." : "Submit Feedback"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
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
                <span>Customize Layout</span>
              </label>
            </div>

            <div style={{flex: 1, border: '3px solid #d1d5db', borderRadius: '10px', position: 'relative', minHeight: '600px', overflow: 'hidden', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start'}}>
              <div ref={canvasContainerRef} style={{display: 'block', width: '100%', height: '100%'}} />
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
                  pointerEvents: 'auto',
                  zIndex: 1001,
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
                <label>Event Type</label>
                <p style={{ margin: 0, padding: '8px', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px' }}>
                  {packageData.Event_Type || packageData.EventType || packageData.Event || packageData.Type || "General"}
                </p>
              </div>

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
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      value={bookingForm.event_date ? dayjs(bookingForm.event_date) : null}
                      onChange={(newValue) => {
                        setBookingForm({
                          ...bookingForm, 
                          event_date: newValue ? newValue.format('YYYY-MM-DD') : ''
                        });
                      }}
                      minDate={dayjs()}
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
                              <Tooltip title="This Date is Unavailable" arrow>
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
                          required: true,
                          fullWidth: true,
                          sx: {
                            '& .MuiInputBase-root': {
                              backgroundColor: 'white',
                              borderRadius: '8px',
                            }
                          },
                        }
                      }}
                    />
                  </LocalizationProvider>
                </div>

                <div className="bp-form-group">
                  <label>Event Time *</label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <TimePicker
                      value={bookingForm.event_time ? dayjs(`2000-01-01 ${bookingForm.event_time}`) : null}
                      onChange={(newValue) => {
                        setBookingForm({
                          ...bookingForm,
                          event_time: newValue ? newValue.format('HH:mm') : ''
                        });
                      }}
                      slotProps={{
                        textField: {
                          required: true,
                          fullWidth: true,
                          sx: {
                            '& .MuiInputBase-root': {
                              backgroundColor: 'white',
                              borderRadius: '8px',
                            }
                          }
                        }
                      }}
                    />
                  </LocalizationProvider>
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
      
      {/* Success Modal */}
      {showSuccess && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 style={{ color: '#ff4c05ef' }}>Booking Successful!</h3>
            <p>Your booking has been created successfully.</p>
            <CoolButton onClick={() => {
              setShowSuccess(false);
              setBookingPreview(true);
            }}>
              Continue
            </CoolButton>
          </div>
        </div>
      )}
    </div>
  );
}
