import React, { useEffect, useRef, useState } from 'react';

export default function LayoutModal({ isOpen, onClose, threadId, senderId, onSent }) {
  const canvasContainerRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (!window.fabric) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
      script.onload = () => setTimeout(initCanvas, 50);
      document.head.appendChild(script);
    } else {
      setTimeout(initCanvas, 50);
    }

    function initCanvas() {
      if (!canvasContainerRef.current || fabricCanvasRef.current) return;
      const container = canvasContainerRef.current;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      container.innerHTML = '';
      const el = document.createElement('canvas');
      el.width = w; el.height = h; el.style.display = 'block';
      container.appendChild(el);
      const canvas = new window.fabric.Canvas(el, { width: w, height: h, backgroundColor: '#fff' });
      canvas.subTargetCheck = true;
      canvas.perPixelTargetFind = true;
      canvas.selection = true;
      fabricCanvasRef.current = canvas;
      setCanvasReady(true);

      canvas.on('object:modified', () => setCanvasData());
      canvas.on('object:added', () => setCanvasData());
      canvas.on('object:removed', () => setCanvasData());
    }

    return () => {
      if (fabricCanvasRef.current) {
        try { fabricCanvasRef.current.dispose(); } catch (e) {}
        fabricCanvasRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, [isOpen]);

  const setCanvasData = () => {
    // noop - placeholder if parent wants immediate updates
  };

  const addRect = () => {
    if (!fabricCanvasRef.current) return;
    const rect = new window.fabric.Rect({ width: 80, height: 50, fill: 'rgba(0,0,0,0.06)', stroke: '#000', strokeWidth: 1, left: 50, top: 50 });
    const txt = new window.fabric.Text('Table', { fontSize: 12, fill: '#333', left: 60, top: 65 });
    const grp = new window.fabric.Group([rect, txt], { left: 100, top: 100, hasControls: true, hasBorders: true });
    grp.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
    fabricCanvasRef.current.add(grp);
    fabricCanvasRef.current.setActiveObject(grp);
    fabricCanvasRef.current.requestRenderAll();
  };

  const addCircle = () => {
    if (!fabricCanvasRef.current) return;
    const circ = new window.fabric.Circle({ radius: 20, fill: 'rgba(0,0,0,0.06)', stroke: '#000', left: 150, top: 150 });
    const txt = new window.fabric.Text('Chair', { fontSize: 10, fill: '#333', left: 160, top: 160 });
    const grp = new window.fabric.Group([circ, txt], { left: 150, top: 150, hasControls: true, hasBorders: true });
    grp.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
    fabricCanvasRef.current.add(grp);
    fabricCanvasRef.current.setActiveObject(grp);
    fabricCanvasRef.current.requestRenderAll();
  };

  const deleteSelected = () => {
    if (!fabricCanvasRef.current) return;
    const active = fabricCanvasRef.current.getActiveObjects();
    if (active.length) {
      active.forEach(o => fabricCanvasRef.current.remove(o));
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.requestRenderAll();
    }
  };

  const resetCanvas = () => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.backgroundColor = '#fff';
    fabricCanvasRef.current.requestRenderAll();
  };

  const handleSend = async () => {
    if (!fabricCanvasRef.current) return;
    try {
      const json = fabricCanvasRef.current.toJSON();
      const payload = {
        thread_id: threadId,
        sender_id: senderId,
        message: 'Designer sent a layout',
        is_designer: true,
        layout: json
      };

      const res = await fetch('http://localhost:3001/api/queries/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data?.status === 'success') {
        onSent && onSent();
        onClose();
      } else {
        alert(data?.message || 'Failed to send layout');
      }
    } catch (e) {
      console.error('Send layout error', e);
      alert('Error sending layout');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ width: '90%', maxWidth: 1000, background: 'white', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, flex: 1 }}>Create Layout</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20 }}>×</button>
        </div>
        <div style={{ padding: 12, display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={addRect}>Add Table</button>
            <button onClick={addCircle}>Add Chair</button>
            <button onClick={deleteSelected}>Delete Selected</button>
            <button onClick={resetCanvas}>Reset</button>
          </div>
          <div style={{ flex: 1, height: 520, border: '1px solid #ddd' }}>
            <div ref={canvasContainerRef} style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
        <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 12px' }}>Cancel</button>
          <button onClick={handleSend} style={{ padding: '8px 12px', background: '#0ea5a4', color: 'white', border: 'none' }}>Send Layout</button>
        </div>
      </div>
    </div>
  );
}
