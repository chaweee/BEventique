import React, { useEffect, useState, useRef } from "react";

/*
Props:
 - isOpen: boolean
 - onClose(): close modal
 - threadId: current thread id to send layout to
 - senderId: id of the sender (designer)
 - onSent(): called after successful send
*/
export default function DesignerLayoutModal({ isOpen, onClose, threadId, senderId, onSent }) {
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const canvasContainerRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [canvasData, setCanvasData] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
          if (canvasContainerRef.current) canvasContainerRef.current.innerHTML = '';
        } catch (err) {
          console.warn('Error disposing canvas (DesignerLayoutModal cleanup):', err?.message || err);
        }
        fabricCanvasRef.current = null;
      }
      setCanvasData(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!window.fabric) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
      script.onload = () => setTimeout(initializeCanvas, 100);
      document.head.appendChild(script);
    } else {
      setTimeout(initializeCanvas, 100);
    }

    function initializeCanvas() {
      if (!canvasContainerRef.current || fabricCanvasRef.current) return;
      const container = canvasContainerRef.current;
      const containerWidth = container.clientWidth || 800;
      const containerHeight = container.clientHeight || 600;
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

      canvas.subTargetCheck = true;
      canvas.perPixelTargetFind = true;
      fabricCanvasRef.current = canvas;

      const update = () => setCanvasData(canvas.toJSON());
      canvas.on('object:modified', update);
      canvas.on('object:added', update);
      canvas.on('object:removed', update);
    }
  }, [isOpen]);

  // simple helpers to add shapes (copied behavior from AddPackageModal)
  const addTable = () => {
    if (!fabricCanvasRef.current) return;
    const table = new window.fabric.Rect({ width: 50, height: 40, fill: 'rgba(255,255,255,0.05)', stroke: '#fff', strokeWidth: 1, left: -25, top: -20 });
    const text = new window.fabric.Text('Table', { fontSize: 9, fill: 'rgba(255,255,255,0.5)', left: -12, top: -5, textBaseline: 'alphabetic' });
    const group = new window.fabric.Group([table, text], { left: 100, top: 100, lockScalingFlip: true, lockSkewingX: true, lockSkewingY: true, hasControls: true, hasBorders: true });
    group.itemType = 'tables';
    group.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
    fabricCanvasRef.current.add(group);
    fabricCanvasRef.current.requestRenderAll();
    setCanvasData(fabricCanvasRef.current.toJSON());
  };

  const addChair = () => {
    if (!fabricCanvasRef.current) return;
    const chair = new window.fabric.Circle({ radius: 15, fill: 'rgba(255,255,255,0.05)', stroke: '#fff', strokeWidth: 1, left: -15, top: -15 });
    const text = new window.fabric.Text('Chair', { fontSize: 8, fill: 'rgba(255,255,255,0.5)', left: -10, top: -4, textBaseline: 'alphabetic' });
    const group = new window.fabric.Group([chair, text], { left: 150, top: 150, lockScalingFlip: true, lockSkewingX: true, lockSkewingY: true, hasControls: true, hasBorders: true });
    group.itemType = 'chairs';
    group.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
    fabricCanvasRef.current.add(group);
    fabricCanvasRef.current.requestRenderAll();
    setCanvasData(fabricCanvasRef.current.toJSON());
  };

  const addRoundTable = () => {
    if (!fabricCanvasRef.current) return;
    const roundTable = new window.fabric.Ellipse({ rx: 22, ry: 18, fill: 'rgba(255,255,255,0.05)', stroke: '#fff', strokeWidth: 1, left: -22, top: -18 });
    const text = new window.fabric.Text('Round\nTable', { fontSize: 7, fill: 'rgba(255,255,255,0.5)', left: -14, top: -8, textAlign: 'center', textBaseline: 'alphabetic' });
    const group = new window.fabric.Group([roundTable, text], { left: 180, top: 120, lockScalingFlip: true, lockSkewingX: true, lockSkewingY: true, hasControls: true, hasBorders: true });
    group.itemType = 'roundTables';
    group.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
    fabricCanvasRef.current.add(group);
    fabricCanvasRef.current.requestRenderAll();
    setCanvasData(fabricCanvasRef.current.toJSON());
  };

  const addTent = () => {
    if (!fabricCanvasRef.current) return;
    const tent = new window.fabric.Rect({ width: 60, height: 35, fill: 'rgba(255,255,255,0.01)', stroke: '#fff', strokeWidth: 1, left: -30, top: -17.5 });
    const text = new window.fabric.Text('Tent', { fontSize: 7, fill: 'rgba(255,255,255,0.5)', left: -8, top: -5, textBaseline: 'alphabetic' });
    const group = new window.fabric.Group([tent, text], { left: 200, top: 200, lockScalingFlip: true, lockSkewingX: true, lockSkewingY: true, hasControls: true, hasBorders: true });
    group.itemType = 'tents';
    group.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
    fabricCanvasRef.current.add(group);
    fabricCanvasRef.current.requestRenderAll();
    setCanvasData(fabricCanvasRef.current.toJSON());
  };

  const addPlatform = () => {
    if (!fabricCanvasRef.current) return;
    const platform = new window.fabric.Rect({ width: 70, height: 50, fill: 'rgba(255,255,255,0.05)', stroke: '#fff', strokeWidth: 1, left: -35, top: -25 });
    const text = new window.fabric.Text('Platform', { fontSize: 8, fill: 'rgba(255,255,255,0.5)', left: -16, top: -4, textBaseline: 'alphabetic' });
    const group = new window.fabric.Group([platform, text], { left: 250, top: 150, lockScalingFlip: true, lockSkewingX: true, lockSkewingY: true, hasControls: true, hasBorders: true });
    group.itemType = 'platforms';
    group.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
    fabricCanvasRef.current.add(group);
    fabricCanvasRef.current.requestRenderAll();
    setCanvasData(fabricCanvasRef.current.toJSON());
  };

  const resetCanvas = () => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.backgroundColor = '#1f2937';
    fabricCanvasRef.current.renderAll();
    setCanvasData(null);
  };

  const deleteSelected = () => {
    if (!fabricCanvasRef.current) return;
    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach(obj => fabricCanvasRef.current.remove(obj));
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();
      setCanvasData(fabricCanvasRef.current.toJSON());
    }
  };

  const handleSend = async () => {
    setError("");
    if (!threadId) {
      setError('No thread selected');
      return;
    }
    setSending(true);
    try {
      // Prepare JPEG from canvas (if available)
      let layoutImage = null;
      try {
        if (fabricCanvasRef.current) {
          // use a higher multiplier for better resolution
          layoutImage = fabricCanvasRef.current.toDataURL({ format: 'jpeg', quality: 0.9 });
        }
      } catch (e) {
        console.warn('Failed to create image from canvas:', e?.message || e);
      }

      const payload = {
        thread_id: threadId,
        sender_id: senderId,
        message: 'Layout',
        is_designer: true,
        layout_json: canvasData ? JSON.stringify(canvasData) : null,
        layout_image: layoutImage, // base64 jpeg data URL
      };

      const res = await fetch('http://localhost:3001/api/queries/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.status === 'success') {
        if (onSent) onSent();
        onClose();
      } else {
        throw new Error(data.message || 'Send failed');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send layout');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '98%', maxWidth: '1400px', margin: '0 16px', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', maxHeight: '95vh' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Create Layout</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '28px', cursor: 'pointer', color: '#6b7280', padding: '0 8px' }}>×</button>
        </div>

        <div style={{ display: 'flex', height: 'calc(95vh - 90px)' }}>
          <div style={{ flex: '1 1 70%', padding: '20px', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <button onClick={addTable} style={toolBtnStyle}>Table</button>
              <button onClick={addRoundTable} style={toolBtnStyle}>Round Table</button>
              <button onClick={addChair} style={toolBtnStyle}>Chair</button>
              <button onClick={addTent} style={toolBtnStyle}>Tent</button>
              <button onClick={addPlatform} style={toolBtnStyle}>Platform</button>
              <button onClick={resetCanvas} style={{ ...toolBtnStyle, marginLeft: 'auto' }}>Reset</button>
            </div>

            <div style={{ flex: 1, border: '3px solid #d1d5db', borderRadius: '10px', position: 'relative', minHeight: '520px', overflow: 'hidden', display: 'flex' }}>
              <div ref={canvasContainerRef} style={{ width: '100%', height: '100%' }} />
              <button onClick={deleteSelected} style={{ position: 'absolute', top: '14px', right: '14px', padding: '8px 12px', background: '#374151', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, zIndex: 10 }}>Delete Selected</button>
            </div>
          </div>

          {/* Right: simplified controls - only Send and Cancel */}
          <div style={{ flex: '0 0 320px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'stretch' }}>
            <div style={{ fontSize: '14px', color: '#374151' }}>When you are done arranging, press Send to attach the layout to the conversation.</div>
            {error && <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
              <button onClick={handleSend} disabled={sending} style={{ flex: 1, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700 }}>{sending ? 'Sending...' : 'Send'}</button>
              <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 700 }}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const toolBtnStyle = { padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 500 };
