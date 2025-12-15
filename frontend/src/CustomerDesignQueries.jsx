import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Swal from "sweetalert2";
import "./CustomerDesignQueries.css";

export default function CustomerDesignQueries() {
  const navigate = useNavigate();
  // Data States
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [messages, setMessages] = useState([]);
  const [bookings, setBookings] = useState([]);
  // UI States
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [showNewQueryModal, setShowNewQueryModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  // Refs
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  // Form State
  const [newQueryForm, setNewQueryForm] = useState({
    booking_id: "",
    message: "",
    recipient_type: "admin"
  });
  const [sendingReply, setSendingReply] = useState(false);

  // Layout modal state
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [selectedLayoutBooking, setSelectedLayoutBooking] = useState("");
  const [sendingLayout, setSendingLayout] = useState(false);
  const [layoutBookings, setLayoutBookings] = useState([]);

  // Layout JSON view/edit state
  const [viewingLayoutJson, setViewingLayoutJson] = useState(null);
  const [editingLayoutJson, setEditingLayoutJson] = useState(null);
  const [editingLayoutId, setEditingLayoutId] = useState(null);

  // --- Helpers ---
  const getClientId = () => {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    return user.id || user.Account_ID || localStorage.getItem("userId");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- Effects ---
  useEffect(() => {
    fetchQueries();
    socketRef.current = io("http://localhost:3001", {
      transports: ["websocket"],
      reconnection: true,
      autoConnect: true
    });
    socketRef.current.on("connect", () => {
      fetchQueries();
    });
    socketRef.current.on("receive_message", (data) => {
      if (selectedQuery && data.thread_id === selectedQuery.query_id) {
        setMessages((prev) => [...prev, data]);
      }
      fetchQueries();
    });
    return () => {
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line
  }, [selectedQuery]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (showNewQueryModal) fetchBookings();
  }, [showNewQueryModal]);

  // --- API Calls ---
  const fetchQueries = async () => {
    setLoading(true);
    try {
      const clientId = getClientId();
      const res = await fetch(`http://localhost:3001/api/queries/customer/${clientId}`);
      const data = await res.json();
      if (data.status === "success") {
        const mappedQueries = (data.threads || []).map(thread => ({
          query_id: thread.thread_id,
          booking_id: thread.booking_id,
          message: thread.last_message,
          created_at: thread.created_at,
          subject: thread.subject,
          event_type: thread.event_type,
          event_date: thread.event_date
        }));
        setQueries(mappedQueries);
      }
    } catch (err) {
      console.error("Error fetching queries:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (queryId) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/queries/messages/${queryId}`);
      const data = await res.json();
      if (data.status === "success") {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const clientId = getClientId();
      const res = await fetch(`http://localhost:3001/api/bookings/my-bookings/${clientId}`);
      const data = await res.json();
      if (data.status === "success") {
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setBookingsLoading(false);
    }
  };

  // --- Handlers ---
  const handleSelectQuery = (query) => {
    setSelectedQuery(query);
    setReplyMessage("");
    setMessages([]);
    fetchMessages(query.query_id);
    // socketRef.current.emit('join_thread', query.query_id);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedQuery) return;
    setSendingReply(true);
    try {
      const clientId = getClientId();
      const res = await fetch(`http://localhost:3001/api/queries/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: selectedQuery.query_id,
          sender_id: clientId,
          message: replyMessage.trim(),
          is_designer: false
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setReplyMessage("");
        fetchMessages(selectedQuery.query_id);
        fetchQueries();
      }
    } catch (err) {
      console.error("Error sending reply:", err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleCreateQuery = async (e) => {
    e.preventDefault();
    try {
      const clientId = getClientId();
      const res = await fetch("http://localhost:3001/api/queries/create-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: clientId,
          booking_id: parseInt(newQueryForm.booking_id),
          subject: newQueryForm.recipient_type === "designer" ? "Customer Inquiry - Designer" : "Customer Inquiry - Admin",
          message: newQueryForm.message,
          recipient_type: newQueryForm.recipient_type
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setShowNewQueryModal(false);
        const threadId = data.thread_id;
        setNewQueryForm({ booking_id: "", message: "", recipient_type: "admin" });
        Swal.fire({
          icon: "success",
          title: "Sent!",
          text: "Your query has been sent successfully.",
          timer: 2000,
          showConfirmButton: false
        });
        try {
          const threadRes = await fetch(`http://localhost:3001/api/queries/customer/${getClientId()}`);
          const threadData = await threadRes.json();
          if (threadData.status === "success") {
            const threads = (threadData.threads || []).map(thread => ({
              query_id: thread.thread_id,
              booking_id: thread.booking_id,
              message: thread.last_message,
              created_at: thread.created_at,
              subject: thread.subject,
              event_type: thread.event_type,
              event_date: thread.event_date
            }));
            setQueries(threads);
            const newThread = threads.find(t => t.query_id === threadId);
            if (newThread) {
              handleSelectQuery(newThread);
            }
          }
        } catch (err) {
          fetchQueries();
        }
      } else {
        Swal.fire("Error", data.message || "Failed to create query", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Network error", "error");
    }
  };

  // Layout modal logic
  const handleSendLayoutToDesigner = async () => {
    setSelectedLayoutBooking("");
    setShowLayoutModal(true);
    try {
      const clientId = getClientId();
      const res = await fetch(`http://localhost:3001/api/bookings/my-bookings/${clientId}`);
      const data = await res.json();
      if (data.status === "success") {
        setLayoutBookings((data.bookings || []).filter(b => b.status === "confirmed"));
      } else {
        setLayoutBookings([]);
      }
    } catch {
      setLayoutBookings([]);
    }
  };

  const handleSendLayout = async (e) => {
    e.preventDefault();
    if (!selectedLayoutBooking || !selectedQuery) return;
    setSendingLayout(true);
    try {
      const clientId = getClientId();
      // Fetch the booking to get custom_layout
      const booking = layoutBookings.find(b => b.booking_id.toString() === selectedLayoutBooking);
      let customLayout = booking?.custom_layout;
      if (!customLayout) {
        const res = await fetch(`http://localhost:3001/api/bookings/my-bookings/${clientId}`);
        const data = await res.json();
        if (data.status === "success") {
          const found = (data.bookings || []).find(b => b.booking_id.toString() === selectedLayoutBooking);
          customLayout = found?.custom_layout;
        }
      }
      if (!customLayout) {
        Swal.fire("Error", "No custom layout found for this booking.", "error");
        setSendingLayout(false);
        return;
      }
      const res = await fetch("http://localhost:3001/api/queries/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: selectedQuery.query_id,
          sender_id: clientId,
          message: "Customer sent booking layout",
          is_designer: false,
          layout_json: customLayout
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setShowLayoutModal(false);
        fetchMessages(selectedQuery.query_id);
        fetchQueries();
        Swal.fire({
          icon: "success",
          title: "Layout Sent!",
          text: "Your layout has been sent.",
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire("Error", data.message || "Failed to send layout", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Network error", "error");
    } finally {
      setSendingLayout(false);
    }
  };

  // Download layout image or JSON
  const handleDownloadLayout = async (layoutId) => {
    try {
      let res = await fetch(`http://localhost:3001/api/queries/design_revision/${layoutId}/image`);
      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 0) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `layout_${layoutId}.jpg`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          return;
        }
      }
      res = await fetch(`http://localhost:3001/api/queries/layout/${layoutId}/meta`);
      if (res.ok) {
        const data = await res.json();
        if (data.layout && data.layout.layout_json) {
          const jsonStr = typeof data.layout.layout_json === "string"
            ? data.layout.layout_json
            : JSON.stringify(data.layout.layout_json, null, 2);
          const blob = new Blob([jsonStr], { type: "application/json" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `layout_${layoutId}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          return;
        }
      }
      Swal.fire("Error", "No layout file found for this booking.", "error");
    } catch (err) {
      Swal.fire("Error", "Failed to download layout file", "error");
    }
  };

  // Layout JSON view/edit handlers
  const handleViewLayoutJson = async (layoutId, editable) => {
    try {
      const res = await fetch(`http://localhost:3001/api/queries/layout/${layoutId}/meta`);
      if (res.ok) {
        const data = await res.json();
        if (data.layout && data.layout.layout_json) {
          if (editable) {
            setEditingLayoutJson(data.layout.layout_json);
            setEditingLayoutId(layoutId);
          } else {
            setViewingLayoutJson(data.layout.layout_json);
          }
        } else {
          Swal.fire("Error", "No layout JSON found.", "error");
        }
      } else {
        Swal.fire("Error", "Failed to fetch layout JSON.", "error");
      }
    } catch {
      Swal.fire("Error", "Failed to fetch layout JSON.", "error");
    }
  };

  const handleSaveEditedLayout = async () => {
    if (!editingLayoutJson || !selectedQuery) return;
    try {
      const clientId = getClientId();
      const res = await fetch("http://localhost:3001/api/queries/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: selectedQuery.query_id,
          sender_id: clientId,
          message: "Updated layout from designer",
          is_designer: true,
          layout_json: editingLayoutJson
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setEditingLayoutJson(null);
        setEditingLayoutId(null);
        fetchMessages(selectedQuery.query_id);
        Swal.fire("Success", "Layout sent to customer.", "success");
      } else {
        Swal.fire("Error", data.message || "Failed to send layout", "error");
      }
    } catch {
      Swal.fire("Error", "Network error", "error");
    }
  };

  return (
    <div className="cdq-root">
      {/* Navbar */}
      <header className="cdq-navbar">
        <div className="cdq-navbar-container">
          <h1 className="cdq-brand-title">Baby's Eventique</h1>
          <nav className="cdq-nav">
            <button className="cdq-link" onClick={() => navigate("/customer-home")}>HOME</button>
            <button className="cdq-link" onClick={() => navigate("/customer-packages")}>PACKAGES</button>
            <button className="cdq-link" onClick={() => navigate("/bookings")}>MANAGE BOOKINGS</button>
            <button className="cdq-link" onClick={() => navigate("/design-queries")}>CUSTOMER INQUIRIES</button>
            <button className="cdq-link cdq-logout" onClick={() => { 
              sessionStorage.removeItem("user"); 
              navigate("/login"); 
            }}>LOGOUT</button>
          </nav>
        </div>
      </header>

      <main className="cdq-main">
        <div className="cdq-messenger">
          {/* Sidebar */}
          <aside className={`cdq-sidebar ${selectedQuery ? 'mobile-hidden' : ''}`} 
                 style={window.innerWidth <= 768 && selectedQuery ? { display: 'none' } : { display: 'flex' }}>
            <div className="cdq-sidebar-header">
              <h2>Messages</h2>
              <button className="cdq-new-btn" onClick={() => setShowNewQueryModal(true)} title="New Message">
                +
              </button>
            </div>
            <div className="cdq-thread-list">
              {loading ? (
                <div style={{padding: '2rem', textAlign: 'center', color: '#888'}}>Loading chats...</div>
              ) : queries.length === 0 ? (
                <div className="cdq-empty-sidebar">
                  <p>No messages yet.</p>
                  <button onClick={() => setShowNewQueryModal(true)}>Start a Conversation</button>
                </div>
              ) : (
                queries.map((query) => (
                  <div
                    key={query.query_id}
                    className={`cdq-thread-item ${selectedQuery?.query_id === query.query_id ? "active" : ""}`}
                    onClick={() => handleSelectQuery(query)}
                  >
                    <div className="thread-header">
                      <span className="thread-subject">
                        {query.subject?.includes('Designer') ? '🎨 Designer' : '💼 Admin'}
                      </span>
                      <span className="thread-time">
                        {new Date(query.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                      </span>
                    </div>
                    <div className="thread-preview">
                      {query.message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Conversation Area */}
          <div className={`cdq-conversation ${!selectedQuery ? 'mobile-hidden' : ''}`}
               style={window.innerWidth <= 768 && !selectedQuery ? { display: 'none' } : { display: 'flex' }}>
            {!selectedQuery ? (
              <div className="cdq-no-selection">
                <div className="empty-icon">💬</div>
                <h2>Select a conversation</h2>
              </div>
            ) : (
              <>
                <div className="cdq-conv-header">
                  <div>
                    <h3>{selectedQuery.subject?.includes('Designer') ? '🎨 Designer' : '💼 Admin'}</h3>
                    <p className="conv-meta">
                      {selectedQuery.event_type} • {new Date(selectedQuery.event_date).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedQuery.subject?.includes('Designer') && (
                    <button
                      className="cdq-send-layout-btn"
                      style={{ marginRight: 12, background: '#0ea5a4', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={handleSendLayoutToDesigner}
                    >
                      Send Layout from Booking
                    </button>
                  )}
                  <button className="cdq-close-conv" onClick={() => setSelectedQuery(null)}>✕</button>
                </div>

                <div className="cdq-messages">
                  {messagesLoading ? (
                    <div style={{padding: '2rem', textAlign: 'center', color: '#888'}}>Loading messages...</div>
                  ) : (
                    messages.map((msg, index) => {
                      const clientId = getClientId();
                      const isMe = msg.sender_id === parseInt(clientId);
                      let msgClass = "customer";
                      if (!isMe) {
                        msgClass = msg.is_designer ? "designer" : "admin";
                      }
                      const layoutId = msg.design_revision_id || msg.designer_layout_id;
                      const hasLayout = !!layoutId;
                      return (
                        <div key={index} className={`cdq-message ${msgClass}`}>
                          <span className="message-time">
                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          <div className="message-bubble">
                            <div className="message-header">
                              <strong>
                                {isMe ? "You" : (msg.is_designer ? "Designer" : "Admin")}
                              </strong>
                            </div>
                            <div className="message-text">
                              {msg.message}
                              {hasLayout && (
                                <div style={{ marginTop: 8 }}>
                                  <a
                                    href="#"
                                    style={{ color: "#0ea5a4", textDecoration: "underline", fontWeight: 500, marginRight: 12 }}
                                    onClick={e => {
                                      e.preventDefault();
                                      handleDownloadLayout(layoutId);
                                    }}
                                  >
                                    Download layout
                                  </a>
                                  <a
                                    href="#"
                                    style={{ color: "#0ea5a4", textDecoration: "underline", fontWeight: 500, marginRight: 12 }}
                                    onClick={e => {
                                      e.preventDefault();
                                      handleViewLayoutJson(layoutId, false);
                                    }}
                                  >
                                    View JSON
                                  </a>
                                  {msg.is_designer !== true && (
                                    <a
                                      href="#"
                                      style={{ color: "#0ea5a4", textDecoration: "underline", fontWeight: 500 }}
                                      onClick={e => {
                                        e.preventDefault();
                                        handleViewLayoutJson(layoutId, true);
                                      }}
                                    >
                                      Edit & Send Back
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form className="cdq-reply-form" onSubmit={handleSendReply}>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={sendingReply}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply(e);
                      }
                    }}
                  />
                  <button type="submit" className="cdq-reply-send-btn" disabled={!replyMessage.trim() || sendingReply}>
                    {sendingReply ? "..." : "Send"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      {/* New Query Modal */}
      {showNewQueryModal && (
        <div className="cdq-modal-overlay" onClick={() => setShowNewQueryModal(false)}>
          <div className="cdq-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cdq-modal-header">
              <h2>New Inquiry</h2>
              <button className="cdq-close-btn" onClick={() => setShowNewQueryModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateQuery} className="cdq-form">
              <div className="cdq-form-group">
                <label>Related Booking</label>
                <select 
                  value={newQueryForm.booking_id}
                  onChange={(e) => {
                    const bId = e.target.value;
                    const booking = bookings.find(b => b.booking_id.toString() === bId);
                    const type = booking?.status === 'confirmed' ? 'designer' : 'admin';
                    setNewQueryForm({
                      ...newQueryForm,
                      booking_id: bId,
                      recipient_type: type
                    });
                  }}
                  required
                >
                  <option value="">Select Booking...</option>
                  {bookings.map(b => (
                    <option key={b.booking_id} value={b.booking_id}>
                      {b.Package_Name || 'No Package'} • {b.event_type} • {new Date(b.event_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cdq-form-group">
                <label>Send To</label>
                <select
                  value={newQueryForm.recipient_type}
                  onChange={(e) => setNewQueryForm({...newQueryForm, recipient_type: e.target.value})}
                >
                  <option value="admin">💼 Admin (Dates, Payments, General)</option>
                  <option value="designer">🎨 Designer (Themes, Colors, Layouts)</option>
                </select>
              </div>
              <div className="cdq-form-group">
                <label>Message</label>
                <textarea
                  value={newQueryForm.message}
                  onChange={(e) => setNewQueryForm({...newQueryForm, message: e.target.value})}
                  placeholder={
                    newQueryForm.recipient_type === 'designer' 
                      ? "e.g., I want to add chairs, tables on the layout..."
                      : "e.g., I need to change my event date, or I have a question about my payment..."
                  }
                  required
                  rows="4"
                />
              </div>
              <div className="cdq-modal-actions">
                <button type="button" className="cdq-cancel-btn" onClick={() => setShowNewQueryModal(false)}>Cancel</button>
                <button type="submit" className="cdq-submit-btn">Send Message</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Layout Modal */}
      {showLayoutModal && (
        <div className="cdq-modal-overlay" onClick={() => setShowLayoutModal(false)}>
          <div className="cdq-modal" onClick={e => e.stopPropagation()}>
            <div className="cdq-modal-header">
              <h2>Send Layout to Designer</h2>
              <button className="cdq-close-btn" onClick={() => setShowLayoutModal(false)}>×</button>
            </div>
            <form className="cdq-form" onSubmit={handleSendLayout}>
              <div className="cdq-form-group">
                <label>Select Booking</label>
                <select
                  value={selectedLayoutBooking}
                  onChange={e => setSelectedLayoutBooking(e.target.value)}
                  required
                >
                  <option value="">Select confirmed booking...</option>
                  {layoutBookings.map(b => (
                    <option key={b.booking_id} value={b.booking_id}>
                      {b.Package_Name || 'No Package'} • {b.event_type} • {new Date(b.event_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cdq-modal-actions">
                <button type="button" className="cdq-cancel-btn" onClick={() => setShowLayoutModal(false)}>Cancel</button>
                <button type="submit" className="cdq-submit-btn" disabled={!selectedLayoutBooking || sendingLayout}>
                  {sendingLayout ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Layout JSON Viewer Modal */}
      {viewingLayoutJson && (
        <div className="cdq-modal-overlay" onClick={() => setViewingLayoutJson(null)}>
          <div className="cdq-modal" onClick={e => e.stopPropagation()}>
            <div className="cdq-modal-header">
              <h2>Layout JSON</h2>
              <button className="cdq-close-btn" onClick={() => setViewingLayoutJson(null)}>×</button>
            </div>
            <pre style={{ maxHeight: 400, overflow: "auto", background: "#f5f5f5", padding: 12 }}>
              {typeof viewingLayoutJson === "string"
                ? viewingLayoutJson
                : JSON.stringify(viewingLayoutJson, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Layout JSON Editor Modal (for designer) */}
      {editingLayoutJson && (
        <div className="cdq-modal-overlay" onClick={() => { setEditingLayoutJson(null); setEditingLayoutId(null); }}>
          <div className="cdq-modal" onClick={e => e.stopPropagation()}>
            <div className="cdq-modal-header">
              <h2>Edit Layout JSON</h2>
              <button className="cdq-close-btn" onClick={() => { setEditingLayoutJson(null); setEditingLayoutId(null); }}>×</button>
            </div>
            <textarea
              style={{ width: "100%", minHeight: 200, fontFamily: "monospace" }}
              value={typeof editingLayoutJson === "string" ? editingLayoutJson : JSON.stringify(editingLayoutJson, null, 2)}
              onChange={e => setEditingLayoutJson(e.target.value)}
            />
            <div className="cdq-modal-actions">
              <button className="cdq-cancel-btn" onClick={() => { setEditingLayoutJson(null); setEditingLayoutId(null); }}>Cancel</button>
              <button
                className="cdq-submit-btn"
                onClick={e => {
                  e.preventDefault();
                  handleSaveEditedLayout();
                }}
              >
                Send Back to Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}