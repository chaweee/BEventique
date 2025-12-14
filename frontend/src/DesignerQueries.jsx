import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "./DesignerQueries.css";
import DesignerSidebar from "./DesignerSidebar";

export default function DesignerQueries() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState("");
  const [showNewQuery, setShowNewQuery] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Get designer ID from session/localStorage
  const getDesignerId = () => {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    return user.Account_ID || user.id || user.account_id || localStorage.getItem("userId");
  };

  // Fetch all query threads
  const fetchThreads = async () => {
    setLoading(true);
    try {
      const url = activeFilter === "all" 
        ? "http://localhost:3001/api/queries/designer"
        : `http://localhost:3001/api/queries/designer?status=${activeFilter}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === "success") {
        setThreads(data.threads);
      }
    } catch (err) {
      console.error("Failed to fetch threads:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for selected thread
  const fetchMessages = async (threadId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/queries/messages/${threadId}`);
      const data = await res.json();
      
      if (data.status === "success") {
        setMessages(data.messages);
        // Mark messages as read
        await fetch(`http://localhost:3001/api/queries/mark-read/${threadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_designer: true })
        });
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const user = JSON.parse(sessionStorage.getItem("user") || "{}");
        if (!user.id) return;

        const res = await fetch(`http://localhost:3001/api/bookings/designer/${user.id}`);
        const data = await res.json();
        
        if (data.status === "success") {
          setBookings(data.bookings || []);
        }
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
      }
    };

    fetchBookings();
    fetchThreads();

    // Initialize Socket.IO connection with reconnection strategy
    socketRef.current = io("http://localhost:3001", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 20000,
      autoConnect: true
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Designer socket connected", socketRef.current.id);
      fetchThreads();
      if (selectedThread) {
        socketRef.current.emit("join_thread", selectedThread.thread_id);
        fetchMessages(selectedThread.thread_id);
      }
    });

    socketRef.current.on("connect_error", (err) => {
      console.warn("⚠️ Designer socket connect error:", err.message);
    });

    socketRef.current.on("reconnect_attempt", (attempt) => {
      console.log("🔄 Designer reconnect attempt", attempt);
    });

    socketRef.current.on("reconnect_failed", () => {
      console.error("❌ Designer socket reconnection failed");
    });

    socketRef.current.on("disconnect", (reason) => {
      if (reason === "io client disconnect") return;
      console.log("⚐ Designer socket disconnected:", reason);
    });

    socketRef.current.on("new_message", (newMsg) => {
      if (selectedThread && newMsg.thread_id === selectedThread.thread_id) {
        setMessages((prev) => [...prev, newMsg]);
        scrollToBottom();
      }
    });

    socketRef.current.on("thread_updated", ({ thread_id }) => {
      fetchThreads();
      if (selectedThread && selectedThread.thread_id === thread_id) {
        fetchMessages(thread_id);
      }
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  // Open conversation
  const openConversation = (thread) => {
    // Leave previous thread room
    if (selectedThread && socketRef.current) {
      socketRef.current.emit("leave_thread", selectedThread.thread_id);
    }

    setSelectedThread(thread);
    fetchMessages(thread.thread_id);

    // Join new thread room
    if (socketRef.current) {
      socketRef.current.emit("join_thread", thread.thread_id);
    }
  };

  // Close conversation
  const closeConversation = () => {
    if (selectedThread && socketRef.current) {
      socketRef.current.emit("leave_thread", selectedThread.thread_id);
    }
    setSelectedThread(null);
    setMessages([]);
    setNewMessage("");
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Send message in conversation
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    try {
      const designerId = getDesignerId();
      console.log("=== SEND MESSAGE DEBUG ===");
      console.log("Designer ID:", designerId);
      console.log("Selected thread object:", selectedThread);
      console.log("Thread ID:", selectedThread?.thread_id);
      console.log("Message:", newMessage);
      
      if (!selectedThread?.thread_id) {
        alert("Error: No thread selected");
        return;
      }
      
      if (!designerId) {
        alert("Error: Designer ID not found");
        return;
      }
      
      const payload = {
        thread_id: selectedThread.thread_id,
        sender_id: designerId,
        message: newMessage,
        is_designer: true
      };
      
      console.log("Sending payload:", payload);
      
      const res = await fetch("http://localhost:3001/api/queries/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      console.log("Send message response:", data);
      
      if (data.status === "success") {
        setNewMessage("");
        scrollToBottom();
        // No need to manually fetch - Socket.IO will update in real-time
      } else {
        console.error("Failed to send message:", data.message);
        alert("Failed to send message: " + data.message);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Error sending message. Please try again.");
    }
  };

  // Update thread status
  const handleStatusChange = async (newStatus) => {
    try {
      const res = await fetch(`http://localhost:3001/api/queries/status/${selectedThread.thread_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await res.json();
      
      if (data.status === "success") {
        setSelectedThread({...selectedThread, status: newStatus});
        fetchThreads();
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Submit new query
  const submitNewQuery = async (e) => {
    e.preventDefault();
    if (!selectedBooking.trim() || !newSubject.trim() || !newMessage.trim()) {
      alert("Please select a booking and fill in all fields");
      return;
    }

    try {
      const user = JSON.parse(sessionStorage.getItem("user") || "{}");
      const res = await fetch("http://localhost:3001/api/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: selectedBooking,
          designer_id: user.id,
          subject: newSubject,
          message: newMessage,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        setShowNewQuery(false);
        setSelectedBooking("");
        setNewSubject("");
        setNewMessage("");
        fetchThreads();
      } else {
        alert(data.message || "Failed to create query");
      }
    } catch (err) {
      console.error("Error creating query:", err);
      alert("Failed to create query");
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      open: "#f59e0b",
      in_progress: "#3b82f6",
      resolved: "#10b981",
      closed: "#6b7280"
    };
    return colors[status] || "#6b7280";
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="dq-root">
      <DesignerSidebar />

      <main className="dq-main">
        <div className="dq-messenger">
          {/* Left Sidebar - Thread List */}
          <aside className="dq-threads-sidebar">
            <div className="dq-sidebar-header">
              <h2>Customer Inquiries</h2>
            </div>

            {/* Filter Tabs (only All, In Progress, Resolved) */}
            <div className="dq-filter-tabs">
              {["all", "in_progress", "resolved"].map((filter) => (
                <button
                  key={filter}
                  className={`filter-tab ${activeFilter === filter ? "active" : ""}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter === "all" ? "All" : filter === "in_progress" ? "In Progress" : "Resolved"}
                  {filter === "all" && threads.length > 0 && ` (${threads.length})`}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="dq-loading">Loading...</div>
            ) : threads.length === 0 ? (
              <div className="dq-empty-sidebar">
                <p>No {activeFilter !== "all" ? activeFilter : ""} queries found</p>
              </div>
            ) : (
              <div className="dq-thread-list">
                {threads.map((thread) => (
                  <div
                    key={thread.thread_id}
                    className={`dq-thread-item ${selectedThread?.thread_id === thread.thread_id ? "active" : ""}`}
                    onClick={() => openConversation(thread)}
                  >
                    <div className="thread-header">
                      <span className="thread-customer">
                        {thread.customer_firstname} {thread.customer_lastname}
                      </span>
                      {thread.unread_count > 0 && (
                        <span className="unread-badge">{thread.unread_count}</span>
                      )}
                    </div>
                    <div className="thread-subject">{thread.subject}</div>
                    <div className="thread-preview">
                      {thread.last_message?.substring(0, 50)}
                      {thread.last_message?.length > 50 && "..."}
                    </div>
                    <div className="thread-footer">
                      <select
                        className={`thread-status-select${thread.status === 'in_progress' ? ' brown' : ''}`}
                        value={thread.status}
                        onChange={e => handleStatusChange(e.target.value)}
                        style={{
                          background: '#fff',
                          border: '1px solid #e4e6eb',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          color: thread.status === 'in_progress' ? '#7a4a13' : '#222',
                          fontWeight: thread.status === 'in_progress' ? 600 : 500,
                          outline: 'none',
                          cursor: 'pointer',
                          minWidth: '90px',
                          appearance: 'none',
                        }}
                        disabled={selectedThread?.thread_id !== thread.thread_id}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      <span className="thread-time">{formatDate(thread.updated_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* Right Panel - Conversation */}
          <div className="dq-conversation">
            {!selectedThread ? (
              <div className="dq-no-selection">
                <div className="empty-icon">💬</div>
                <h2>Select a query</h2>
                <p>Choose a customer query from the list to view the conversation</p>
              </div>
            ) : (
              <>
                {/* Conversation Header */}
                <div className="dq-conv-header">
                  <div>
                    <h3>{selectedThread.customer_firstname} {selectedThread.customer_lastname}</h3>
                    <p className="conv-subject">{selectedThread.subject}</p>
                    <p className="conv-meta">
                      {selectedThread.booking_id && `Booking #${selectedThread.booking_id} • `}
                      {selectedThread.customer_email}
                    </p>
                  </div>
                  <div className="conv-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <select
                      className={`thread-status-select${selectedThread.status === 'in_progress' ? ' brown' : ''}`}
                      value={selectedThread.status}
                      onChange={e => handleStatusChange(e.target.value)}
                      style={{
                        background: '#fff',
                        border: '1px solid #e4e6eb',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '0.85rem',
                        color: selectedThread.status === 'in_progress' ? '#7a4a13' : '#222',
                        fontWeight: selectedThread.status === 'in_progress' ? 600 : 500,
                        outline: 'none',
                        cursor: 'pointer',
                        minWidth: '110px',
                        appearance: 'none',
                      }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <button className="dq-close-conv" onClick={closeConversation}>✕</button>
                  </div>
                </div>

                {/* Messages */}
                <div className="dq-messages">
                  {messages.map((msg) => (
                    <div
                      key={msg.message_id}
                      className={`dq-message ${msg.is_designer ? "designer" : "customer"}`}
                    >
                      <div className="message-bubble">
                        <div className="message-header">
                          <strong>
                            {msg.is_designer 
                              ? `${msg.Firstname || 'Designer'} ${msg.Lastname || ''} `.trim() 
                              : `${msg.Firstname || ''} ${msg.Lastname || ''}`.trim()
                            }
                          </strong>
                          <span className="message-time">{formatMessageTime(msg.created_at)}</span>
                        </div>
                        <div className="message-text">{msg.message}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {selectedThread.status !== "closed" && (
                  <form className="dq-message-input" onSubmit={handleSendMessage}>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your response..."
                    />
                    <button type="submit">Send</button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>

        {/* New Query Modal (simplified) */}
        {showNewQuery && (
          <div className="modal-backdrop" onClick={() => setShowNewQuery(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>New Query</h3>
              <form onSubmit={submitNewQuery}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                    Select Booking <span style={{ color: "red" }}>*</span>
                  </label>
                  <select
                    value={selectedBooking}
                    onChange={(e) => setSelectedBooking(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e4e6eb",
                      borderRadius: "8px",
                      fontSize: "0.938rem"
                    }}
                  >
                    <option value="">Choose from your bookings...</option>
                    {bookings.map((booking) => {
                      const eventDate = booking.event_date 
                        ? new Date(booking.event_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })
                        : 'No date';
                      const displayText = `${booking.package_name || 'Package'} - ${booking.customer_name || 'Customer'} - ${eventDate}`;
                      
                      return (
                        <option key={booking.id} value={booking.id}>
                          {displayText}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                    Subject <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Enter query subject"
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e4e6eb",
                      borderRadius: "8px",
                      fontSize: "0.938rem"
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                    Message <span style={{ color: "red" }}>*</span>
                  </label>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Enter your message"
                    required
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e4e6eb",
                      borderRadius: "8px",
                      fontSize: "0.938rem",
                      resize: "vertical"
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setShowNewQuery(false)}
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: "#f0f2f5",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: "#1877f2",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                  >
                    Send Query
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
