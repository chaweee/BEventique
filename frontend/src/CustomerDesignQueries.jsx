import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Swal from "sweetalert2";
import "./CustomerDesignQueries.css";

export default function CustomerDesignQueries() {
  const navigate = useNavigate();
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNewQueryModal, setShowNewQueryModal] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Form state for creating new query
  const [newQueryForm, setNewQueryForm] = useState({
    booking_id: "",
    message: ""
  });

  // Get client ID from session/localStorage
  const getClientId = () => {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    return user.id || user.Account_ID || localStorage.getItem("userId");
  };

  // Fetch messages for a specific query
  const fetchMessages = async (queryId) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/queries/${queryId}/messages`);
      const data = await res.json();
      
      console.log("💬 Fetched messages:", data);
      console.log("   Total messages:", data.messages?.length);
      data.messages?.forEach((msg, idx) => {
        console.log(`   [${idx}] sender_id:${msg.sender_id}, is_designer:${msg.is_designer}, message:"${msg.message?.substring(0, 30)}"`);
      });
      
      if (data.status === "success") {
        setMessages(data.messages || []);
      } else {
        console.error("Error fetching messages:", data.message);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Send reply message
  const handleSendReply = async (e) => {
    e.preventDefault();
    
    if (!replyMessage.trim() || !selectedQuery) {
      return;
    }
    
    setSendingReply(true);
    try {
      const clientId = getClientId();
      const res = await fetch(`http://localhost:3001/api/queries/${selectedQuery.query_id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: clientId,
          message: replyMessage.trim(),
          is_designer: false
        })
      });
      
      const data = await res.json();
      
      if (data.status === "success") {
        console.log("✅ Reply sent successfully");
        setReplyMessage("");
        // Refresh messages
        await fetchMessages(selectedQuery.query_id);
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        console.error("Error sending reply:", data.message);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to send reply"
        });
      }
    } catch (err) {
      console.error("Error sending reply:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "An error occurred while sending your reply"
      });
    } finally {
      setSendingReply(false);
    }
  };

  // Fetch bookings for dropdown
  const fetchBookings = React.useCallback(async () => {
    console.log("🔍 fetchBookings called");
    setBookingsLoading(true);
    try {
      const user = JSON.parse(sessionStorage.getItem("user") || "{}");
      const clientId = user.id || user.Account_ID || localStorage.getItem("userId");
      
      console.log("   User from sessionStorage:", user);
      console.log("   Client ID:", clientId);
      
      if (!clientId) {
        console.warn("⚠️ No client ID found!");
        setBookings([]);
        setBookingsLoading(false);
        return;
      }
      
      const url = `http://localhost:3001/api/bookings/my-bookings/${clientId}`;
      console.log("   Fetching from:", url);
      
      const res = await fetch(url);
      console.log("   Response status:", res.status);
      
      const data = await res.json();
      console.log("   Response data:", data);
      console.log("   Response bookings count:", data.bookings?.length || 0);
      
      if (data.status === "success" && Array.isArray(data.bookings)) {
        console.log("   ✅ Found", data.bookings.length, "bookings");
        console.log("   Before setBookings - bookings state:", bookings);
        console.log("   Calling setBookings with:", data.bookings);
        setBookings(data.bookings);
        console.log("   After setBookings - bookings state should update soon");
      } else {
        console.warn("   ⚠️ No bookings in response or unexpected format");
        console.warn("   data.status:", data.status);
        console.warn("   is array?:", Array.isArray(data.bookings));
        setBookings([]);
      }
    } catch (err) {
      console.error("❌ Error fetching bookings:", err);
      setBookings([]);
    } finally {
      console.log("   Finally block - setBookingsLoading(false)");
      setBookingsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch customer's queries (messenger style)
  const fetchQueries = async () => {
    setLoading(true);
    setError("");
    try {
      const clientId = getClientId();
      const res = await fetch(`http://localhost:3001/api/queries/customer/${clientId}`);
      const data = await res.json();
      
      console.log("📋 Fetched queries:", data);
      
      if (data.status === "success") {
        setQueries(data.queries || []);
      } else {
        setError(data.message || "Failed to fetch queries");
      }
    } catch (err) {
      console.error("Error fetching queries:", err);
      setError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Keep old fetchThreads for backward compatibility
  const fetchThreads = async () => {
    setLoading(true);
    setError("");
    try {
      const clientId = getClientId();
      const res = await fetch(`http://localhost:3001/api/queries/customer/${clientId}`);
      const data = await res.json();
      
      if (data.status === "success") {
        setQueries(data.queries || []);
      } else {
        setError(data.message || "Failed to fetch queries");
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle query selection - fetch messages
  const handleSelectQuery = (query) => {
    setSelectedQuery(query);
    setReplyMessage("");
    setMessages([]);
    fetchMessages(query.query_id);
  };

  // Log whenever bookings state changes
  useEffect(() => {
    console.log("📊 BOOKINGS STATE CHANGED - current value:", bookings);
    console.log("   Length:", bookings?.length);
    console.log("   Is array?:", Array.isArray(bookings));
  }, [bookings]);

  // Auto-fetch bookings when modal opens
  useEffect(() => {
    console.log("🔔 useEffect triggered - showNewQueryModal:", showNewQueryModal);
    if (showNewQueryModal) {
      console.log("📂 Modal opened - fetching bookings");
      fetchBookings();
    }
  }, [showNewQueryModal, fetchBookings]);

  useEffect(() => {
    fetchQueries();

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
      // Re-fetch queries on (re)connect for freshness
      fetchQueries();
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

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create new query
  const handleCreateQuery = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      const clientId = getClientId();
      console.log("🚀 Creating query with:", { clientId, ...newQueryForm });
      
      const res = await fetch("http://localhost:3001/api/queries/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: clientId,
          ...newQueryForm
        })
      });
      
      console.log("📬 Response status:", res.status);
      
      if (!res.ok) {
        const text = await res.text();
        console.error("❌ Non-OK response:", res.status, text);
        setError("Server error: " + res.status + " - " + text.substring(0, 100));
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to create design query. Please try again."
        });
        return;
      }
      
      const data = await res.json();
      console.log("✅ Response data:", data);
      
      if (data.status === "success") {
        setShowNewQueryModal(false);
        setNewQueryForm({ booking_id: "", message: "" });
        
        // Success alert
        Swal.fire({
          icon: "success",
          title: "Design Query Created!",
          text: "Your design inquiry has been submitted successfully.",
          confirmButtonColor: "#26bfa0"
        });
        
        fetchThreads();
      } else {
        setError(data.message);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Failed to create design query."
        });
      }
    } catch (err) {
      console.error("❌ Error:", err);
      setError("Error: " + err.message);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "An error occurred: " + err.message
      });
    }
  };

  // Get status badge color
  return (
    <div className="cdq-root">
      {/* Header - Match Packages navbar style */}
      <header className="cdq-navbar">
        <div className="cdq-navbar-container">
          <div className="cdq-navbar-brand">
            <h1 className="cdq-brand-title">Baby's Eventique</h1>
          </div>

          <nav className="cdq-nav">
            <button className="cdq-link" onClick={() => navigate("/customer-home")}>HOME</button>
            <button className="cdq-link" onClick={() => navigate("/customer-packages")}>PACKAGES</button>
            <button className="cdq-link" onClick={() => navigate("/bookings")}>MANAGE BOOKINGS</button>
            <button className="cdq-link" onClick={() => navigate("/design-queries")}>DESIGN QUERIES</button>
            <div
              className="cdq-link cdq-logout"
              role="button"
              tabIndex={0}
              onClick={() => { sessionStorage.removeItem("user"); navigate("/login"); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  sessionStorage.removeItem("user");
                  navigate("/login");
                }
              }}
            >
              LOGOUT
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content - Conversation Interface */}
      <main className="cdq-main">
        <div className="cdq-messenger">
          {/* Left Sidebar - Thread List */}
          <aside className="cdq-sidebar">
            <div className="cdq-sidebar-header">
              <h2>Messages</h2>
              <button className="cdq-new-btn" onClick={() => { fetchBookings(); setShowNewQueryModal(true); }}>
                +
              </button>
            </div>

            {loading ? (
              <div className="cdq-loading">Loading...</div>
            ) : queries.length === 0 ? (
              <div className="cdq-empty-sidebar">
                <p>No queries yet</p>
                <button onClick={() => { fetchBookings(); setShowNewQueryModal(true); }}>Start a query</button>
              </div>
            ) : (
              <div className="cdq-thread-list">
                {queries.map((query) => (
                  <div
                    key={query.query_id}
                    className={`cdq-thread-item ${selectedQuery?.query_id === query.query_id ? "active" : ""}`}
                    onClick={() => handleSelectQuery(query)}
                  >
                    <div className="thread-header">
                      <span className="thread-subject">
                        {query.customer_name || "Unknown Customer"}
                      </span>
                    </div>
                    <div className="thread-preview">
                      {query.message?.substring(0, 50)}
                      {query.message?.length > 50 && "..."}
                    </div>
                    <div className="thread-footer">
                      <span className="thread-time">
                        {new Date(query.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* Right Panel - Conversation */}
          <div className="cdq-conversation">
            {!selectedQuery ? (
              <div className="cdq-no-selection">
                <div className="empty-icon">💬</div>
                <h2>Select a query</h2>
                <p>Choose a query from the list to view the details</p>
              </div>
            ) : (
              <>
                {/* Query Details Header */}
                <div className="cdq-conv-header">
                  <div>
                    <h3>{selectedQuery.customer_name || "Unknown Customer"}</h3>
                    <p className="conv-meta">
                      {selectedQuery.event_type && `${selectedQuery.event_type} • `}
                      {selectedQuery.event_date && new Date(selectedQuery.event_date).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="cdq-close-conv" onClick={() => setSelectedQuery(null)}>✕</button>
                </div>

                {/* Messages Area */}
                <div className="cdq-messages">
                  {messagesLoading ? (
                    <div className="cdq-loading-messages">Loading messages...</div>
                  ) : (
                    <>
                      {/* Conversation Messages - Grouped by reply_to, ordered by created_at */}
                      {messages && messages.length > 0 && messages.map((msg) => {
                        const isAdmin = msg.sender_id === null;
                        const msgClass = msg.is_designer ? "designer" : isAdmin ? "admin" : "customer";
                        return (
                          <div
                            key={msg.message_id}
                            className={`cdq-message ${msgClass}`}
                          >
                            <div className="message-bubble">
                              <div className="message-header">
                                <strong>{isAdmin ? "Admin" : msg.sender_name || "Unknown"}</strong>
                                <span className="message-time">
                                  {new Date(msg.created_at).toLocaleString()}
                                </span>
                              </div>
                              <div className="message-text">{msg.message}</div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {messages && messages.length === 0 && (
                        <div className="cdq-no-replies">
                          <p>No messages yet</p>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Reply Input Area */}
                <form className="cdq-reply-form" onSubmit={handleSendReply}>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Message"
                    rows="3"
                    disabled={sendingReply}
                  />
                  <button
                    type="submit"
                    className="cdq-reply-send-btn"
                    disabled={!replyMessage.trim() || sendingReply}
                  >
                    {sendingReply ? "Sending..." : "Send"}
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
              <h2>New Design Query</h2>
              <button className="cdq-close-btn" onClick={() => setShowNewQueryModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateQuery} className="cdq-form">
              <div className="cdq-form-group">
                <label>My Bookings *</label>
                {bookingsLoading ? (
                  <p style={{ color: "#999" }}>⏳ Loading bookings...</p>
                ) : bookings && bookings.length > 0 ? (
                  <select
                    value={newQueryForm.booking_id}
                    onChange={(e) => setNewQueryForm({...newQueryForm, booking_id: e.target.value})}
                    required
                  >
                    <option value="">-- Select a booking --</option>
                    {bookings.map((booking) => (
                      <option key={booking.booking_id} value={booking.booking_id}>
                        {booking.event_type} - {new Date(booking.event_date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p style={{ color: "#999" }}>❌ No bookings found</p>
                )}
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
