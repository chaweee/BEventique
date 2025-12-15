import React, { useEffect, useState, useRef, useCallback } from "react";

/*
Props:
 - isOpen: boolean
 - packageId: id to load
 - onClose(): close modal
 - onSaved(): called after successful save (parent should refresh list)
*/
export default function EditPackageModal({ isOpen, packageId, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    id: "",
    Package_Name: "",
    description: "",
    NumTables: 0,
    NumRoundTables: 0,
    NumChairs: 0,
    NumTent: 0,
    NumPlatform: 0,
    Package_Amount: "",
    event_id: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [eventTypes, setEventTypes] = useState([]);

  const [files, setFiles] = useState([]); // array of {file, preview}
  const [deletedPhotos, setDeletedPhotos] = useState([]); // track deleted existing photos
  const [includePlatform, setIncludePlatform] = useState(false);
  const canvasContainerRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const mouseDownRef = useRef(false);
  const [canvasData, setCanvasData] = useState(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [itemCounts, setItemCounts] = useState({
    tables: 0,
    roundTables: 0,
    chairs: 0,
    tents: 0,
    platforms: 0,
  });

  // Helper function to count items on canvas by type
  const updateItemCounts = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    const objects = fabricCanvasRef.current.getObjects();
    const counts = {
      tables: 0,
      roundTables: 0,
      chairs: 0,
      tents: 0,
      platforms: 0,
    };

    objects.forEach(obj => {
      if (obj.itemType) {
        counts[obj.itemType]++;
      }
    });

    setItemCounts(counts);
  }, []);

  /* ----------------------------------------------
      LOAD PACKAGE WHEN OPENED
  ---------------------------------------------- */
  useEffect(() => {
    if (!isOpen || !packageId) return;

    let mounted = true;
    setLoading(true);
    setError("");
    
    // Fetch event types
    fetch("http://localhost:3001/api/packages/event-types")
      .then(res => res.json())
      .then(data => {
        if (data.status === "success" && mounted) {
          setEventTypes(data.events || []);
        }
      })
      .catch(err => console.error("Failed to fetch event types:", err));

    fetch(`http://localhost:3001/api/packages/${encodeURIComponent(packageId)}`)
      .then(async (r) => {
        const contentType = r.headers.get("content-type") || "";
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`HTTP ${r.status}: ${text.slice(0,200)}`);
        }
        if (!contentType.includes("application/json")) {
          const text = await r.text();
          throw new Error("Expected JSON but received non-JSON response: " + text.slice(0,200));
        }
        return r.json();
      })
      .then((json) => {
        if (!mounted) return;

        if (json?.status === "success" && json.package) {
          const p = json.package;
          console.log("Package data received:", p);

          // Fill ALL fields with correct names
          setForm({
            id: p.id,                                // REAL ID
            Package_Name: p.Package_Name || "",
            description: p.Description || "",        // CASE SENSITIVE: Description
            NumTables: p.NumTables || 0,
            NumRoundTables: p.NumRoundTables || 0,
            NumChairs: p.NumChairs || 0,
            NumTent: p.NumTent || 0,
            NumPlatform: p.NumPlatform || 0,
            Package_Amount: p.Package_Amount || "",
            event_id: p.event_id || ""
          });

          // Set platform checkbox
          setIncludePlatform((p.NumPlatform || 0) > 0);

          // Load existing photos from package_photos table
          console.log("Photos from package:", { Photo: p.Photo, photos: p.photos });
          const photoFiles = [];
          
          if (p.photos && p.photos.length > 0) {
            // Handle multiple photos from package_photos table
            p.photos.forEach(photoUrl => {
              if (photoUrl && photoUrl.trim() !== '') {
                photoFiles.push({
                  file: null,
                  preview: photoUrl,
                  isExisting: true
                });
              }
            });
          } else if (p.Photo && p.Photo.trim() !== '') {
            // Fallback to single photo if available
            photoFiles.push({
              file: null,
              preview: p.Photo,
              isExisting: true
            });
          }
          
          setFiles(photoFiles);
          console.log("Loaded photos:", photoFiles);

          // Load canvas layout if it exists
          console.log("RAW canvas_layout from server:", p.canvas_layout);
          console.log("Type of canvas_layout:", typeof p.canvas_layout);
          console.log("Is string?", typeof p.canvas_layout === 'string');
          console.log("Is object?", typeof p.canvas_layout === 'object');
          
          if (p.canvas_layout) {
            try {
              // If it's already an object, use it directly
              const parsedLayout = typeof p.canvas_layout === 'string' 
                ? JSON.parse(p.canvas_layout) 
                : p.canvas_layout;
              console.log("Parsed canvas layout successfully:", parsedLayout);
              setCanvasData(parsedLayout);
            } catch (e) {
              console.warn("Failed to parse canvas layout:", e);
              setCanvasData(null);
            }
          } else {
            console.log("No existing canvas layout found in database");
            setCanvasData(null);
          }
        } else {
          setError(json?.message || "Failed to load package");
        }
      })
      .catch((e) => {
        console.error(e);
        setError(e.message || "Network error loading package");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [isOpen, packageId]);

  /* ----------------------------------------------
      CLEANUP WHEN CLOSED
  ---------------------------------------------- */
  useEffect(() => {
    if (!isOpen) {
      // cleanup
      files.forEach(f => {
        if (f.preview && f.preview.startsWith("blob:")) URL.revokeObjectURL(f.preview);
      });
      setFiles([]);
      setDeletedPhotos([]); // Reset deleted photos tracking
      setForm(emptyForm);
      setError("");
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
          if (canvasContainerRef.current) {
            canvasContainerRef.current.innerHTML = '';
          }
        } catch (err) {
          console.warn('Error disposing canvas (EditPackageModal cleanup):', err?.message || err);
        }
        fabricCanvasRef.current = null;
      }
      setCanvasData(null);
      setCanvasReady(false);
      setItemCounts({
        tables: 0,
        roundTables: 0,
        chairs: 0,
        tents: 0,
        platforms: 0,
      });
      setIncludePlatform(false);
    }
    // eslint-disable-next-line
  }, [isOpen]);

  // Initialize Fabric canvas when modal opens and loading is complete
  useEffect(() => {
    if (!isOpen || loading) return;
    
    // Load Fabric.js if not already loaded
    if (!window.fabric) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
      script.onload = () => {
        console.log('Fabric.js loaded (EditPackageModal)');
        setTimeout(initializeCanvas, 100);
      };
      document.head.appendChild(script);
    } else {
      setTimeout(initializeCanvas, 100);
    }
    
    function initializeCanvas() {
      if (!canvasContainerRef.current || fabricCanvasRef.current) {
        console.log('Canvas init skipped (EditPackageModal):', { hasContainer: !!canvasContainerRef.current, hasCanvas: !!fabricCanvasRef.current });
        return;
      }
      
      const container = canvasContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      console.log('Initializing canvas (EditPackageModal) with dimensions:', { containerWidth, containerHeight });
      
      if (containerWidth === 0 || containerHeight === 0) {
        console.error('Container has no dimensions, retrying...');
        setTimeout(initializeCanvas, 200);
        return;
      }

      // Clear container
      container.innerHTML = '';
      
      const canvasEl = document.createElement('canvas');
      canvasEl.style.display = 'block';
      canvasEl.width = containerWidth;
      canvasEl.height = containerHeight;
      container.appendChild(canvasEl);

      const canvas = new window.fabric.Canvas(canvasEl, {
        width: containerWidth,
        height: containerHeight,
        backgroundColor: '#1f2937',
        uniformScaling: true,
      });
      
      console.log('Canvas created successfully (EditPackageModal)');
      
      canvas.subTargetCheck = true;
      canvas.perPixelTargetFind = true;
      canvas.isDrawingMode = false;
      canvas.allowTouchScrolling = false;
      canvas.selectionFullyContained = false;
      canvas.skipTargetFind = false;
      // Ensure selection and cursors are enabled so objects can be moved
      canvas.selection = true;
      canvas.hoverCursor = 'move';
      canvas.defaultCursor = 'default';

      // Debug: log mouse and selection events to help diagnose move issues
      canvas.on('mouse:down', (opt) => {
        try {
          const t = opt?.target;
          console.debug('canvas mouse:down', t ? `target(${t.type})` : 'no-target', opt);
          mouseDownRef.current = true;
          if (t) {
            // Force-enable selection and movement in case JSON locked them
            try { t.set({ selectable: true, evented: true, lockMovementX: false, lockMovementY: false }); } catch (e) {}
            if (t.group) {
              try { t.group.set({ selectable: true, evented: true, lockMovementX: false, lockMovementY: false }); t.group.setCoords(); } catch (e) {}
            }
            if (typeof t.setCoords === 'function') t.setCoords();
            canvas.setActiveObject(t);
            canvas.requestRenderAll();
          } else {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
          }
        } catch (err) {
          console.warn('mouse:down handler error', err);
        }
      });
      canvas.on('mouse:move', (opt) => {
        try {
          if (mouseDownRef.current) {
            const active = canvas.getActiveObject();
            if (active) {
              // log pointer and active object position to see why drag isn't happening
              const p = opt.pointer || (opt.e && { x: opt.e.clientX, y: opt.e.clientY });
              console.debug('mouse:move while down', { pointer: p, active: { id: active?.id, type: active.type, left: active.left, top: active.top } });
            }
          }
        } catch (e) {}
      });
      canvas.on('mouse:up', (opt) => { mouseDownRef.current = false; console.debug('canvas mouse:up', opt?.target ? 'target' : 'no-target'); });
      canvas.on('selection:created', (e) => { console.debug('selection:created', e); });
      canvas.on('selection:updated', (e) => { console.debug('selection:updated', e); });
      canvas.on('selection:cleared', (e) => { console.debug('selection:cleared', e); });

      // Ensure canvas elements allow pointer/touch dragging
      try {
        if (canvas.upperCanvasEl) canvas.upperCanvasEl.style.touchAction = 'none';
        if (canvas.lowerCanvasEl) canvas.lowerCanvasEl.style.touchAction = 'none';
      } catch (e) {}

      // Update canvas data while objects are moving (for immediate persistence)
      canvas.on('object:moving', (e) => {
        try {
          // ensure coordinates are updated while dragging
          if (e?.target && typeof e.target.setCoords === 'function') e.target.setCoords();
          setCanvasData(canvas.toJSON());
        } catch (err) {
          console.warn('Error serializing canvas during move:', err);
        }
      });

      // When an object is selected, ensure it's unlocked and evented
      canvas.on('object:selected', (e) => {
        try {
          const obj = e?.target;
          if (obj) {
            try { obj.set({ selectable: true, evented: true, lockMovementX: false, lockMovementY: false }); } catch (e) {}
            if (obj.type === 'group' || obj.group) {
              const grp = obj.group || obj;
              try { grp.set({ selectable: true, evented: true, lockMovementX: false, lockMovementY: false }); grp.forEachObject(c => { try { c.selectable = false; c.evented = false; } catch (e) {} }); grp.setCoords(); } catch (e) {}
            }
            if (typeof obj.setCoords === 'function') obj.setCoords();
            canvas.requestRenderAll();
          }
        } catch (err) {
          console.warn('object:selected handler error', err);
        }
      });

      // Also keep object modified/added/removed handlers (existing code expects these)
      fabricCanvasRef.current = canvas;
      setCanvasReady(true);

      // Update canvas data on any change
      canvas.on('object:modified', () => {
        setCanvasData(canvas.toJSON());
      });
      canvas.on('object:added', () => {
        setCanvasData(canvas.toJSON());
      });
      canvas.on('object:removed', () => {
        setCanvasData(canvas.toJSON());
      });
    }
  }, [isOpen, loading, updateItemCounts]);

  // Load canvas data when it becomes available (after package fetch completes)
  useEffect(() => {
    console.log('Load canvas effect triggered:', { canvasReady, hasData: !!canvasData });
    
    if (!canvasReady || !canvasData || !fabricCanvasRef.current) {
      console.log('Skipping canvas load - canvas not ready or no data');
      return;
    }
    
    console.log('Loading canvas data into canvas:', canvasData);
    fabricCanvasRef.current.loadFromJSON(canvasData, () => {
      if (!fabricCanvasRef.current) return;
      
      const canvas = fabricCanvasRef.current;
      
      // Update transparent fills to semi-transparent for clickability
      canvas.getObjects().forEach(obj => {
        if (obj.type === 'group') {
          obj.forEachObject((child) => {
            if (child.fill === 'transparent') {
              child.set('fill', 'rgba(255, 255, 255, 0.05)');
            }
          });
        }
      });
      // Sanitize any text objects that may have invalid baseline values
      canvas.getObjects().forEach(obj => {
        try {
          if (obj && (obj.type === 'text' || obj.type === 'i-text' || obj.constructor?.name?.toLowerCase().includes('text'))) {
            if (!obj.textBaseline || obj.textBaseline === 'alphabetical') {
              try { obj.textBaseline = 'alphabetic'; } catch (e) { /* ignore */ }
            }
            if (typeof obj.setCoords === 'function') obj.setCoords();
          }
        } catch (e) {}
      });
      // Ensure objects/groups are selectable and evented so they can be moved
      canvas.selection = true;
      // Ensure loaded objects are selectable and unlocked (do NOT force children non-selectable)
      canvas.getObjects().forEach(obj => {
        try {
          obj.selectable = true;
          obj.evented = true;
          obj.hasControls = true;
          obj.hasBorders = true;
          obj.lockMovementX = false;
          obj.lockMovementY = false;
          obj.lockScalingX = false;
          obj.lockScalingY = false;
          if (typeof obj.setCoords === 'function') obj.setCoords();
        } catch (e) {
          console.warn('Error configuring object for movement:', e);
        }
      });

      // Update JSON while objects are being moved so layout persists
      canvas.on('object:moving', () => {
        setCanvasData(canvas.toJSON());
      });

      canvas.renderAll();
      updateItemCounts();
      console.log('Canvas data loaded and configured (objects made movable)');
    });
  }, [canvasReady, canvasData, updateItemCounts]);

  // Add objects to canvas with specified shapes and semi-transparent labels
  const addTable = () => {
    if (!fabricCanvasRef.current) return;
    if (itemCounts.tables >= form.NumTables) {
      setError(`Maximum ${form.NumTables} table(s) allowed`);
      setTimeout(() => setError(""), 3000);
      return;
    }
    const table = new window.fabric.Rect({
      width: 50,
      height: 40,
      fill: 'rgba(255, 255, 255, 0.05)',
      stroke: '#ffffff',
      strokeWidth: 1,
      left: -25,
      top: -20,
      selectable: false // child should not be selectable
    });
    const text = new window.fabric.Text('Table', {
      fontSize: 9,
      fill: 'rgba(255, 255, 255, 0.5)',
      left: -12,
      top: -5,
      selectable: false
    });
    const group = new window.fabric.Group([table, text], {
      left: 100,
      top: 100,
      lockScalingFlip: true,
      lockSkewingX: true,
      lockSkewingY: true,
      hasControls: true,
      hasBorders: true,
      selectable: true,
      evented: true,
      objectCaching: false
    });
    group.itemType = 'tables';
    fabricCanvasRef.current.add(group);
    // Ensure newly added group is evented/selectable and unlocked for movement
    try {
      group.set({ selectable: true, evented: true, lockMovementX: false, lockMovementY: false });
      group.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
      group.setCoords();
    } catch (e) {}
    fabricCanvasRef.current.setActiveObject(group); // Make it selected after adding
    fabricCanvasRef.current.requestRenderAll();
    updateItemCounts();
  };
  
  const addChair = () => {
    if (!fabricCanvasRef.current) return;
    if (itemCounts.chairs >= form.NumChairs) {
      setError(`Maximum ${form.NumChairs} chair(s) allowed`);
      setTimeout(() => setError(""), 3000);
      return;
    }
    const chair = new window.fabric.Circle({
      radius: 15,
      fill: 'rgba(255, 255, 255, 0.05)',
      stroke: '#ffffff',
      strokeWidth: 1,
      left: -15,
      top: -15,
      selectable: false
    });
    const text = new window.fabric.Text('Chair', {
      fontSize: 8,
      fill: 'rgba(255, 255, 255, 0.5)',
      left: -10,
      top: -4,
      selectable: false
    });
    const group = new window.fabric.Group([chair, text], {
      left: 150,
      top: 150,
      lockScalingFlip: true,
      lockSkewingX: true,
      lockSkewingY: true,
      hasControls: true,
      hasBorders: true,
      selectable: true,
      evented: true,
      objectCaching: false
    });
    group.itemType = 'chairs';
    fabricCanvasRef.current.add(group);
    try { group.set({ selectable: true, evented: true, lockMovementX: false, lockMovementY: false }); group.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false }); group.setCoords(); } catch (e) {}
    fabricCanvasRef.current.setActiveObject(group);
    fabricCanvasRef.current.requestRenderAll();
    updateItemCounts();
  };
  
  const addTent = () => {
    if (!fabricCanvasRef.current) return;
    if (itemCounts.tents >= form.NumTent) {
      setError(`Maximum ${form.NumTent} tent(s) allowed`);
      setTimeout(() => setError(""), 3000);
      return;
    }
    const tent = new window.fabric.Rect({
      width: 60,
      height: 35,
      fill: 'rgba(255, 255, 255, 0.01)',
      stroke: '#ffffff',
      strokeWidth: 1,
      left: -30,
      top: -17.5,
      selectable: false
    });
    const text = new window.fabric.Text('Tent', {
      fontSize: 7,
      fill: 'rgba(255, 255, 255, 0.5)',
      left: -8,
      top: -5,
      selectable: false
    });
    const group = new window.fabric.Group([tent, text], {
      left: 200,
      top: 200,
      lockScalingFlip: true,
      lockSkewingX: true,
      lockSkewingY: true,
      hasControls: true,
      hasBorders: true,
      selectable: true,
      evented: true,
      objectCaching: false
    });
    group.itemType = 'tents';
    fabricCanvasRef.current.add(group);
    try { group.set({ selectable: true, evented: true, lockMovementX: false, lockMovementY: false }); group.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false }); group.setCoords(); } catch (e) {}
    fabricCanvasRef.current.setActiveObject(group);
    fabricCanvasRef.current.requestRenderAll();
    updateItemCounts();
  };
  
  const addPlatform = () => {
    if (!fabricCanvasRef.current) return;
    if (itemCounts.platforms >= form.NumPlatform) {
      setError(`Maximum ${form.NumPlatform} platform(s) allowed`);
      setTimeout(() => setError(""), 3000);
      return;
    }
    const platform = new window.fabric.Rect({
      width: 70,
      height: 50,
      fill: 'rgba(255, 255, 255, 0.05)',
      stroke: '#ffffff',
      strokeWidth: 1,
      left: -35,
      top: -25,
      selectable: false
    });
    const text = new window.fabric.Text('Platform', {
      fontSize: 8,
      fill: 'rgba(255, 255, 255, 0.5)',
      left: -16,
      top: -4,
      selectable: false
    });
    const group = new window.fabric.Group([platform, text], {
      left: 250,
      top: 150,
      lockScalingFlip: true,
      lockSkewingX: true,
      lockSkewingY: true,
      hasControls: true,
      hasBorders: true,
      selectable: true,
      evented: true,
      objectCaching: false
    });
    group.itemType = 'platforms';
    fabricCanvasRef.current.add(group);
    try { group.set({ selectable: true, evented: true, lockMovementX: false, lockMovementY: false }); group.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false }); group.setCoords(); } catch (e) {}
    fabricCanvasRef.current.setActiveObject(group);
    fabricCanvasRef.current.requestRenderAll();
    updateItemCounts();
  };
  
  const addRoundTable = () => {
    if (!fabricCanvasRef.current) return;
    if (itemCounts.roundTables >= form.NumRoundTables) {
      setError(`Maximum ${form.NumRoundTables} round table(s) allowed`);
      setTimeout(() => setError(""), 3000);
      return;
    }
    const roundTable = new window.fabric.Ellipse({
      rx: 22,
      ry: 18,
      fill: 'rgba(255, 255, 255, 0.05)',
      stroke: '#ffffff',
      strokeWidth: 1,
      left: -22,
      top: -18,
      selectable: false
    });
    const text = new window.fabric.Text('Round\nTable', {
      fontSize: 7,
      fill: 'rgba(255, 255, 255, 0.5)',
      left: -14,
      top: -8,
      textAlign: 'center',
      selectable: false
    });
    const group = new window.fabric.Group([roundTable, text], {
      left: 180,
      top: 120,
      lockScalingFlip: true,
      lockSkewingX: true,
      lockSkewingY: true,
      hasControls: true,
      hasBorders: true,
      selectable: true,
      evented: true,
      objectCaching: false
    });
    group.itemType = 'roundTables';
    fabricCanvasRef.current.add(group);
    try { group.set({ selectable: true, evented: true, lockMovementX: false, lockMovementY: false }); group.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false }); group.setCoords(); } catch (e) {}
    fabricCanvasRef.current.setActiveObject(group);
    fabricCanvasRef.current.requestRenderAll();
    updateItemCounts();
  };
  
  const resetCanvas = () => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.backgroundColor = '#1f2937';
    fabricCanvasRef.current.renderAll();
    setCanvasData(null);
    setItemCounts({
      tables: 0,
      roundTables: 0,
      chairs: 0,
      tents: 0,
      platforms: 0,
    });
  };
  
  const deleteSelected = () => {
    if (!fabricCanvasRef.current) return;
    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach(obj => fabricCanvasRef.current.remove(obj));
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();
      updateItemCounts();
    }
  };

  const onFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const newFiles = selected.map(f => ({
      file: f,
      preview: URL.createObjectURL(f)
    }));
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = ""; // reset input
  };
  
  const removePhoto = (index) => {
    setFiles(prev => {
      const item = prev[index];
      // If it's an existing photo, track it for deletion on save
      if (item.isExisting && item.preview) {
        setDeletedPhotos(deleted => [...deleted, item.preview]);
      }
      if (item.preview && item.preview.startsWith("blob:")) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  /* ----------------------------------------------
      SAVE CHANGES
  ---------------------------------------------- */
  const handleSave = async () => {
    setError("");

    if (!form.Package_Name) {
      setError("Package name required");
      return;
    }
    if (!form.id) {
      setError("Package ID is missing — cannot save.");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("id", form.id);
      fd.append("Package_Name", form.Package_Name);
      fd.append("Description", form.description ?? "");
      fd.append("NumTables", String(form.NumTables || 0));
      fd.append("NumRoundTables", String(form.NumRoundTables || 0));
      fd.append("NumChairs", String(form.NumChairs || 0));
      fd.append("NumTent", String(form.NumTent || 0));
      fd.append("NumPlatform", String(form.NumPlatform || 0));
            fd.append("Package_Amount", String(form.Package_Amount ?? ""));

            if (canvasData) {
                fd.append("package_layout", JSON.stringify(canvasData));
            }

      // Add deleted photos to be removed from server
      if (deletedPhotos.length > 0) {
        fd.append("deleted_photos", JSON.stringify(deletedPhotos));
      }

      // Add new photos only (not existing ones)
      const newFiles = files.filter(f => f.file && !f.isExisting);
      newFiles.forEach((f) => {
        fd.append(`photos[]`, f.file);
      });

      const res = await fetch("http://localhost:3001/api/packages/update", {
        method: "POST",
        body: fd,
      });

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0,200)}`);
      }
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error("Expected JSON but received non-JSON response: " + text.slice(0,200));
      }

      const json = await res.json();

      if (json?.status === "success") {
        onSaved && onSaved();
        onClose();
      } else {
        throw new Error(json?.message || "Save failed");
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;
  
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '98%', maxWidth: '1600px', margin: '0 16px', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', maxHeight: '95vh' }}>
        
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Edit Package</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '36px', cursor: 'pointer', color: '#6b7280', padding: '0 8px' }}>×</button>
        </div>

        <div style={{ display: 'flex', height: 'calc(95vh - 90px)' }}>
          {/* LEFT SIDE - Canvas/Preview Area */}
          <div style={{ flex: '0 0 62%', padding: '28px', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#6b7280' }}>
                Loading package...
              </div>
            ) : (
              <>
                {/* Tool buttons */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '18px' }}>
                  <button onClick={addTable} style={{ padding: '10px 18px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="24" height="20" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                    </svg>
                    Table
                  </button>
                  <button onClick={addRoundTable} style={{ padding: '10px 18px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="24" height="20" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <ellipse cx="12" cy="10" rx="10" ry="8" />
                    </svg>
                    Round Table
                  </button>
                  <button onClick={addChair} style={{ padding: '10px 18px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="10" cy="10" r="8" />
                    </svg>
                    Chair
                  </button>
                  <button onClick={addTent} style={{ padding: '10px 18px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="26" height="18" viewBox="0 0 26 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="1" y="2" width="24" height="14" rx="2" />
                    </svg>
                    Tent
                  </button>
                  <button onClick={addPlatform} style={{ padding: '10px 18px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="28" height="22" viewBox="0 0 28 22" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="1" y="2" width="26" height="18" rx="2" />
                    </svg>
                    Platform
                  </button>
                  <button onClick={resetCanvas} style={{ padding: '12px 20px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: 500, marginLeft: 'auto' }}>Reset</button>
                </div>

                {/* Canvas Area */}
                <div style={{ flex: 1, border: '3px solid #d1d5db', borderRadius: '10px', position: 'relative', minHeight: '600px', overflow: 'hidden', display: 'flex' }}>
                  <div ref={canvasContainerRef} style={{ width: '100%', height: '100%' }} />
                  <button onClick={deleteSelected} style={{ position: 'absolute', top: '14px', right: '14px', padding: '10px 18px', background: '#374151', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px', fontWeight: 500, zIndex: 10 }}>Delete Selected</button>
                </div>
              </>
            )}
          </div>

          {/* RIGHT SIDE - Form */}
          <div style={{ flex: '0 0 38%', padding: '28px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Package Name</label>
                <input
                  type="text"
                  value={form.Package_Name}
                  onChange={(e) => setForm({ ...form, Package_Name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Event Type</label>
                <select
                  value={form.event_id}
                  onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px' }}
                >
                  <option value="">Select Event Type</option>
                  {eventTypes.map(event => (
                    <option key={event.event_id} value={event.event_id}>
                      {event.event_type}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Tables</label>
                  <input
                    type="number"
                    min="0"
                    value={form.NumTables || ''}
                    onChange={(e) => setForm({ ...form, NumTables: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Round Tables</label>
                  <input
                    type="number"
                    min="0"
                    value={form.NumRoundTables || ''}
                    onChange={(e) => setForm({ ...form, NumRoundTables: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Chairs</label>
                  <input
                    type="number"
                    min="0"
                    value={form.NumChairs || ''}
                    onChange={(e) => setForm({ ...form, NumChairs: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Tents</label>
                  <input
                    type="number"
                    min="0"
                    value={form.NumTent || ''}
                    onChange={(e) => setForm({ ...form, NumTent: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px' }}
                  />
                </div>
              </div>

              <div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                    Platform
                    <input
                      type="checkbox"
                      checked={includePlatform}
                      onChange={(e) => setIncludePlatform(e.target.checked)}
                      style={{ marginLeft: '10px', width: '16px', height: '16px' }}
                    />
                    <span style={{ marginLeft: '6px', fontSize: '13px', fontWeight: 400 }}>Include Platform</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.NumPlatform || ''}
                    onChange={(e) => setForm({ ...form, NumPlatform: Number(e.target.value) })}
                    disabled={!includePlatform}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', backgroundColor: includePlatform ? 'white' : '#f3f4f6' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Photos</label>
                <label style={{ display: 'inline-block', padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', background: 'white', fontWeight: 500 }}>
                  Choose Files
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onFileChange} />
                </label>
                <span style={{ marginLeft: '12px', fontSize: '14px', color: '#6b7280' }}>{files.length > 0 ? `${files.length} file(s) selected` : 'No files chosen'}</span>

                {files.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px' }}>
                    {files.map((f, idx) => (
                      <div key={idx} style={{ position: 'relative', border: '2px solid #d1d5db', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1' }}>
                        <img src={f.preview} alt={`preview-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          style={{ position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows="5"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.Package_Amount}
                  onChange={(e) => setForm({ ...form, Package_Amount: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px' }}
                />
              </div>

              {error && <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '14px' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ flex: 1, padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '16px' }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={onClose}
                  style={{ flex: 1, padding: '12px 24px', background: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '16px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



export function EditPackageButton({
  packageId,
  onSaved,
  className,
  children,
  buttonProps,
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={
          className ??
          // Default: match typical "Add New" primary button (adjust to your project's exact classes if needed)
          "inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        }
        onClick={() => setOpen(true)}
        {...buttonProps}
      >
        {children ?? (
          <>
            {/* Pencil / edit icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M4 13.5V20h6.5L20.818 9.682a2 2 0 0 0 0-2.828L17.146 3.182a2 2 0 0 0-2.828 0L4 13.5z" />
            </svg>
            <span>Edit</span>
          </>
        )}
      </button>

      <EditPackageModal
        isOpen={open}
        packageId={packageId}
        onClose={() => setOpen(false)}
        onSaved={() => {
          onSaved && onSaved();
          setOpen(false);
        }}
      />
    </>
  );
}
