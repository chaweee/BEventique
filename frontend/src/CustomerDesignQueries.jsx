import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Swal from "sweetalert2";
import "./CustomerDesignQueries.css"; // Ensure this matches the CSS file name

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
  const [sendingReply, setSendingReply] = useState(false);
  
  // Refs
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Form State
  const [newQueryForm, setNewQueryForm] = useState({
    booking_id: "",
    message: "",
    recipient_type: "admin"
  });

  // --- Helpers ---
  const getClientId = () => {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    return user.id || user.Account_ID || localStorage.getItem("userId");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- Effects ---

  // 1. Initial Load & Socket
  useEffect(() => {
    fetchQueries();

    // Socket Connection
    socketRef.current = io("http://localhost:3001", {
      transports: ["websocket"],
      reconnection: true,
      autoConnect: true
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket connected");
      fetchQueries();
    });

    // Listen for incoming messages (Real-time update)
    socketRef.current.on("receive_message", (data) => {
      if (selectedQuery && data.thread_id === selectedQuery.query_id) {
        setMessages((prev) => [...prev, data]);
      }
      // Refresh thread list to show new message preview
      fetchQueries();
    });

    return () => {
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line
  }, [selectedQuery]); // Re-bind if selectedQuery changes

  // 2. Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Fetch bookings when modal opens
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
    
    // Join socket room if your backend supports rooms
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
        fetchQueries(); // Update preview in sidebar
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
        const savedMessage = newQueryForm.message;
        const savedSubject = newQueryForm.recipient_type === "designer" ? "Customer Inquiry - Designer" : "Customer Inquiry - Admin";
        
        setNewQueryForm({ booking_id: "", message: "", recipient_type: "admin" });
        
        Swal.fire({
          icon: "success",
          title: "Sent!",
          text: "Your query has been sent successfully.",
          timer: 2000,
          showConfirmButton: false
        });
        
        // Fetch the thread details from the backend to get complete data
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
            
            // Find and select the newly created thread
            const newThread = threads.find(t => t.query_id === threadId);
            if (newThread) {
              handleSelectQuery(newThread);
            }
          }
        } catch (err) {
          console.error("Error fetching updated threads:", err);
          fetchQueries(); // Fallback to regular fetch
        }
      } else {
        Swal.fire("Error", data.message || "Failed to create query", "error");
      }
    } catch (err) {
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
          
          {/* Sidebar - Hidden on mobile if a query is selected */}
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

          {/* Conversation Area - Hidden on mobile if NO query is selected */}
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
                  {/* Close button acts as 'Back' on mobile */}
                  <button className="cdq-close-conv" onClick={() => setSelectedQuery(null)}>✕</button>
                </div>

                <div className="cdq-messages">
                  {messagesLoading ? (
                    <div style={{padding: '2rem', textAlign: 'center', color: '#888'}}>Loading messages...</div>
                  ) : (
                    messages.map((msg, index) => {
                      const clientId = getClientId();
                      const isMe = msg.sender_id === parseInt(clientId);
                      const isAdmin = msg.sender_id === null; // Assuming null sender_id is admin
                      
                      // Determine class based on role
                      let msgClass = "customer"; // Default (Me)
                      if (!isMe) {
                        msgClass = msg.is_designer ? "designer" : "admin";
                      }

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
                            <div className="message-text">{msg.message}</div>
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
                    // Auto-suggest recipient based on booking status
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
    </div>
  );
}