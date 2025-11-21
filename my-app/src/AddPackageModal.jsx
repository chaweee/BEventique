import React, { useEffect, useState, useRef } from "react";

/*
Props:
 - isOpen: boolean
 - onClose(): close modal
 - onSaved(): called after successful save
*/
export default function AddPackageModal({ isOpen, onClose, onSaved }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    Package_Name: "",
    description: "",
    NumTables: 0,
    NumRoundTables: 0,
    NumChairs: 0,
    NumTent: 0,
    NumPlatform: 0,
    Package_Amount: "",
  });

  const [files, setFiles] = useState([]); // array of {file, preview}
  const [includePlatform, setIncludePlatform] = useState(false);
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [canvasData, setCanvasData] = useState(null);
  const [itemCounts, setItemCounts] = useState({
    tables: 0,
    roundTables: 0,
    chairs: 0,
    tents: 0,
    platforms: 0,
  });

  useEffect(() => {
    if (!isOpen) {
      // cleanup
      files.forEach(f => {
        if (f.preview && f.preview.startsWith("blob:")) URL.revokeObjectURL(f.preview);
      });
      setFiles([]);
      setForm({
        Package_Name: "",
        description: "",
        NumTables: 0,
        NumRoundTables: 0,
        NumChairs: 0,
        NumTent: 0,
        NumPlatform: 0,
        Package_Amount: "",
      });
      setError("");
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      setCanvasData(null);
      setItemCounts({
        tables: 0,
        roundTables: 0,
        chairs: 0,
        tents: 0,
        platforms: 0,
      });
    }
    // eslint-disable-next-line
  }, [isOpen]);

  // Initialize Fabric canvas when modal opens
  useEffect(() => {
    if (isOpen && canvasRef.current && !fabricCanvasRef.current) {
      const container = canvasRef.current.parentElement;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      const canvas = new window.fabric.Canvas(canvasRef.current, {
        width: containerWidth,
        height: containerHeight,
        backgroundColor: '#1f2937',
        uniformScaling: true,
      });
      fabricCanvasRef.current = canvas;

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
  }, [isOpen]);

  // Helper function to count items on canvas by type
  const updateItemCounts = () => {
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
  };

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
      fill: 'transparent',
      stroke: '#ffffff',
      strokeWidth: 1,
      left: -25,
      top: -20,
    });
    const text = new window.fabric.Text('Table', {
      fontSize: 9,
      fill: 'rgba(255, 255, 255, 0.5)',
      left: -12,
      top: -5,
    });
    const group = new window.fabric.Group([table, text], {
      left: 100,
      top: 100,
      lockScalingFlip: true,
      lockSkewingX: true,
      lockSkewingY: true,
      hasControls: true,
      hasBorders: true,
    });
    group.itemType = 'tables';
    group.setControlsVisibility({
      mt: false,
      mb: false,
      ml: false,
      mr: false,
    });
    fabricCanvasRef.current.add(group);
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
      fill: 'transparent',
      stroke: '#ffffff',
      strokeWidth: 1,
      left: -15,
      top: -15,
    });
    const text = new window.fabric.Text('Chair', {
      fontSize: 8,
      fill: 'rgba(255, 255, 255, 0.5)',
      left: -10,
      top: -4,
    });
    const group = new window.fabric.Group([chair, text], {
      left: 150,
      top: 150,
      lockScalingFlip: true,
      lockSkewingX: true,
      lockSkewingY: true,
      hasControls: true,
      hasBorders: true,
    });
    group.itemType = 'chairs';
    group.setControlsVisibility({
      mt: false,
      mb: false,
      ml: false,
      mr: false,
    });
    fabricCanvasRef.current.add(group);
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
    });
    const text = new window.fabric.Text('Tent', {
      fontSize: 7,
      fill: 'rgba(255, 255, 255, 0.5)',
      left: -8,
      top: -5,
    });
    const group = new window.fabric.Group([tent, text], {
      left: 200,
      top: 200,
      lockScalingFlip: true,
      lockSkewingX: true,
      lockSkewingY: true,
      hasControls: true,
      hasBorders: true,
    });
    group.itemType = 'tents';
    group.setControlsVisibility({
      mt: false,
      mb: false,
      ml: false,
      mr: false,
    });
    fabricCanvasRef.current.add(group);
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
      fill: 'transparent',
      stroke: '#ffffff',
      strokeWidth: 1,
      left: -35,
      top: -25,
    });
    const text = new window.fabric.Text('Platform', {
      fontSize: 8,
      fill: 'rgba(255, 255, 255, 0.5)',
      left: -16,
      top: -4,
    });
    const group = new window.fabric.Group([platform, text], {
      left: 250,
      top: 150,
      lockScalingFlip: true,
      lockSkewingX: true,
      lockSkewingY: true,
      hasControls: true,
      hasBorders: true,
    });
    group.itemType = 'platforms';
    group.setControlsVisibility({
      mt: false,
      mb: false,
      ml: false,
      mr: false,
    });
    fabricCanvasRef.current.add(group);
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
      fill: 'transparent',
      stroke: '#ffffff',
      strokeWidth: 1,
      left: -22,
      top: -18,
    });
    const text = new window.fabric.Text('Round\nTable', {
      fontSize: 7,
      fill: 'rgba(255, 255, 255, 0.5)',
      left: -14,
      top: -8,
      textAlign: 'center',
    });
    const group = new window.fabric.Group([roundTable, text], {
      left: 180,
      top: 120,
      lockScalingFlip: true,
      lockSkewingX: true,
      lockSkewingY: true,
      hasControls: true,
      hasBorders: true,
    });
    group.itemType = 'roundTables';
    group.setControlsVisibility({
      mt: false,
      mb: false,
      ml: false,
      mr: false,
    });
    fabricCanvasRef.current.add(group);
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
      if (item.preview && item.preview.startsWith("blob:")) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };
  
  const handleSave = async () => {
    setError("");
    if (!form.Package_Name) {
      setError("Package name required");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("Package_Name", form.Package_Name);
      fd.append("description", form.description ?? "");
      fd.append("NumTables", String(form.NumTables || 0));
      fd.append("NumRoundTables", String(form.NumRoundTables || 0));
      fd.append("NumChairs", String(form.NumChairs || 0));
      fd.append("NumTent", String(form.NumTent || 0));
      fd.append("NumPlatform", String(form.NumPlatform || 0));
      fd.append("Package_Amount", String(form.Package_Amount ?? ""));
      if (canvasData) {
        fd.append("canvas_layout", JSON.stringify(canvasData));
      }
      files.forEach((f, i) => {
        fd.append(`photos[]`, f.file);
      });

      const res = await fetch("/Eventique/api/add_package.php", {
        method: "POST",
        credentials: "include",
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
        if (onSaved) onSaved();
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
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Add New Package</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '36px', cursor: 'pointer', color: '#6b7280', padding: '0 8px' }}>×</button>
        </div>

        <div style={{ display: 'flex', height: 'calc(95vh - 90px)' }}>
          {/* LEFT SIDE - Canvas/Preview Area */}
          <div style={{ flex: '0 0 62%', padding: '28px', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
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
              <canvas ref={canvasRef} />
              <button onClick={deleteSelected} style={{ position: 'absolute', top: '14px', right: '14px', padding: '10px 18px', background: '#374151', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px', fontWeight: 500, zIndex: 10 }}>Delete Selected</button>
            </div>
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
                  {saving ? 'Adding...' : 'Add Package'}
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
