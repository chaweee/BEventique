import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "./CustomerDesignQueries.css";

export default function CustomerDesignQueries() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNewQueryModal, setShowNewQueryModal] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Form state for creating new query
  const [newQueryForm, setNewQueryForm] = useState({
    booking_id: "",
    subject: "",
    message: ""
  });

  // Get client ID from session/localStorage
  const getClientId = () => {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    return user.Account_ID || localStorage.getItem("userId");
  };

  // Fetch customer's query threads
  const fetchThreads = async () => {
    setLoading(true);
    setError("");
    try {
      const clientId = getClientId();
      const res = await fetch(`http://localhost:3001/api/queries/customer/${clientId}`);
      const data = await res.json();
      
      if (data.status === "success") {
        setThreads(data.threads);
      } else {
        setError(data.message || "Failed to fetch queries");
      }
    } catch (err) {
      setError("Network error: " + err.message);
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
          body: JSON.stringify({ is_designer: false })
        });
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  useEffect(() => {
    fetchThreads();

    // Initialize Socket.IO connection with reconnection strategy
    socketRef.current = io("http://localhost:3001", {
      transports: ["websocket"], // Prefer websocket
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 20000,
      autoConnect: true
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket connected", socketRef.current.id);
      // Re-fetch threads on (re)connect for freshness
      fetchThreads();
      // Rejoin selected thread room if any
      if (selectedThread) {
        socketRef.current.emit("join_thread", selectedThread.thread_id);
        fetchMessages(selectedThread.thread_id);
      }
    });

    socketRef.current.on("connect_error", (err) => {
      console.warn("⚠️ Socket connect error:", err.message);
    });

    socketRef.current.on("reconnect_attempt", (attempt) => {
      console.log("🔄 Reconnect attempt", attempt);
    });

    socketRef.current.on("reconnect_failed", () => {
      console.error("❌ Socket reconnection failed after max attempts");
    });

    socketRef.current.on("disconnect", (reason) => {
      if (reason === "io client disconnect") return; // manual
      console.log("⚐ Socket disconnected:", reason);
    });

    // Listen for new messages
    socketRef.current.on("new_message", (newMsg) => {
      // Only append if this message belongs to current thread
      if (selectedThread && newMsg.thread_id === selectedThread.thread_id) {
        setMessages((prev) => [...prev, newMsg]);
        scrollToBottom();
      }
    });

    // Listen for thread updates (refresh list)
    socketRef.current.on("thread_updated", ({ thread_id }) => {
      fetchThreads();
      // If current thread updated, optionally refetch messages for consistency
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
  }, []);

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

  // Create new query
  const handleCreateQuery = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      const clientId = getClientId();
      const res = await fetch("http://localhost:3001/api/queries/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: clientId,
          ...newQueryForm
        })
      });
      
      const data = await res.json();
      
      if (data.status === "success") {
        setShowNewQueryModal(false);
        setNewQueryForm({ booking_id: "", subject: "", message: "" });
        fetchThreads();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Network error: " + err.message);
    }
  };

  // Send message in conversation
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    try {
      const clientId = getClientId();
      const res = await fetch("http://localhost:3001/api/queries/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: selectedThread.thread_id,
          sender_id: clientId,
          message: newMessage,
          is_designer: false
        })
      });
      
      const data = await res.json();
      
      if (data.status === "success") {
        setNewMessage("");
        scrollToBottom();
        // No need to manually fetch - Socket.IO will update in real-time
      }
    } catch (err) {
      console.error("Error sending message:", err);
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
    <div className="cdq-root">
      {/* Header */}
      <header className="cdq-header">
        <div className="cdq-brand" onClick={() => navigate("/customer-home")}>
          Eventique
        </div>
        <nav className="cdq-nav">
          <button onClick={() => navigate("/customer-home")}>HOME</button>
          <button onClick={() => navigate("/customer-packages")}>PACKAGES</button>
          <button className="active">DESIGN QUERIES</button>
        </nav>
        <button 
          className="cdq-logout" 
          onClick={() => { sessionStorage.removeItem("user"); navigate("/login"); }}
        >
          LOGOUT
        </button>
      </header>

      {/* Main Content - Conversation Interface */}
      <main className="cdq-main">
        <div className="cdq-messenger">
          {/* Left Sidebar - Thread List */}
          <aside className="cdq-sidebar">
            <div className="cdq-sidebar-header">
              <h2>Messages</h2>
              <button className="cdq-new-btn" onClick={() => setShowNewQueryModal(true)}>
                +
              </button>
            </div>

            {loading ? (
              <div className="cdq-loading">Loading...</div>
            ) : threads.length === 0 ? (
              <div className="cdq-empty-sidebar">
                <p>No conversations yet</p>
                <button onClick={() => setShowNewQueryModal(true)}>Start a query</button>
              </div>
            ) : (
              <div className="cdq-thread-list">
                {threads.map((thread) => (
                  <div
                    key={thread.thread_id}
                    className={`cdq-thread-item ${selectedThread?.thread_id === thread.thread_id ? "active" : ""}`}
                    onClick={() => openConversation(thread)}
                  >
                    <div className="thread-header">
                      <span className="thread-subject">{thread.subject}</span>
                      {thread.unread_count > 0 && (
                        <span className="unread-badge">{thread.unread_count}</span>
                      )}
                    </div>
                    <div className="thread-preview">
                      {thread.last_message?.substring(0, 50)}
                      {thread.last_message?.length > 50 && "..."}
                    </div>
                    <div className="thread-footer">
                      <span 
                        className="thread-status"
                        style={{ backgroundColor: getStatusColor(thread.status) }}
                      >
                        {thread.status}
                      </span>
                      <span className="thread-time">{formatDate(thread.updated_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* Right Panel - Conversation */}
          <div className="cdq-conversation">
            {!selectedThread ? (
              <div className="cdq-no-selection">
                <div className="empty-icon">💬</div>
                <h2>Select a conversation</h2>
                <p>Choose a query from the list to view the conversation</p>
              </div>
            ) : (
              <>
                {/* Conversation Header */}
                <div className="cdq-conv-header">
                  <div>
                    <h3>{selectedThread.subject}</h3>
                    <p className="conv-meta">
                      {selectedThread.booking_id && `Booking #${selectedThread.booking_id} • `}
                      <span style={{ color: getStatusColor(selectedThread.status) }}>
                        {selectedThread.status}
                      </span>
                      {selectedThread.designer_firstname && ` • Assigned to ${selectedThread.designer_firstname}`}
                    </p>
                  </div>
                  <button className="cdq-close-conv" onClick={closeConversation}>✕</button>
                </div>

                {/* Messages */}
                <div className="cdq-messages">
                  {messages.map((msg) => (
                    <div
                      key={msg.message_id}
                      className={`cdq-message ${msg.is_designer ? "designer" : "customer"}`}
                    >
                      <div className="message-bubble">
                        <div className="message-header">
                          <strong>{msg.is_designer ? `${msg.Firstname} ${msg.Lastname}` : "You"}</strong>
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
                  <form className="cdq-message-input" onSubmit={handleSendMessage}>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                    />
                    <button type="submit">Send</button>
                  </form>
                )}
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
              <h2>New Design Query</h2>
              <button className="cdq-close-btn" onClick={() => setShowNewQueryModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateQuery} className="cdq-form">
              <div className="cdq-form-group">
                <label>Booking ID (Optional)</label>
                <input
                  type="number"
                  value={newQueryForm.booking_id}
                  onChange={(e) => setNewQueryForm({...newQueryForm, booking_id: e.target.value})}
                  placeholder="Enter booking ID if related"
                />
              </div>
              
              <div className="cdq-form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  value={newQueryForm.subject}
                  onChange={(e) => setNewQueryForm({...newQueryForm, subject: e.target.value})}
                  placeholder="e.g., Need to reschedule booking"
                  required
                />
              </div>
              
              <div className="cdq-form-group">
                <label>Message *</label>
                <textarea
                  value={newQueryForm.message}
                  onChange={(e) => setNewQueryForm({...newQueryForm, message: e.target.value})}
                  placeholder="Describe your inquiry..."
                  rows="5"
                  required
                />
              </div>
              
              {error && <div className="cdq-form-error">{error}</div>}
              
              <div className="cdq-modal-actions">
                <button 
                  type="button" 
                  className="cdq-cancel-btn" 
                  onClick={() => setShowNewQueryModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="cdq-submit-btn">
                  Send Query
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
