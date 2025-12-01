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
  const [newMessage, setNewMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Get designer ID from session/localStorage
  const getDesignerId = () => {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    return user.Account_ID || localStorage.getItem("userId");
  };

  // Fetch all query threads
  const fetchThreads = async () => {
    setLoading(true);
    try {
      const url = activeFilter === "all" 
        ? "http://localhost:3001/api/queries/all"
        : `http://localhost:3001/api/queries/all?status=${activeFilter}`;
      
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
      const res = await fetch("http://localhost:3001/api/queries/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: selectedThread.thread_id,
          sender_id: designerId,
          message: newMessage,
          is_designer: true
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

  // Assign thread to self
  const handleAssignToMe = async () => {
    try {
      const designerId = getDesignerId();
      const res = await fetch(`http://localhost:3001/api/queries/assign/${selectedThread.thread_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designer_id: designerId })
      });
      
      const data = await res.json();
      
      if (data.status === "success") {
        const user = JSON.parse(sessionStorage.getItem("user") || "{}");
        setSelectedThread({
          ...selectedThread, 
          assigned_to: designerId,
          designer_firstname: user.Firstname || user.FirstName,
          designer_lastname: user.Lastname || user.LastName,
          status: "in_progress"
        });
        fetchThreads();
      }
    } catch (err) {
      console.error("Error assigning:", err);
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
              <h2>Customer Queries</h2>
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
                  <div className="conv-actions">
                    {!selectedThread.assigned_to && (
                      <button className="assign-btn" onClick={handleAssignToMe}>
                        Assign to Me
                      </button>
                    )}
                    <select 
                      value={selectedThread.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="status-select"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
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
                            {msg.is_designer ? `${msg.Firstname} ${msg.Lastname} (Designer)` : `${msg.Firstname} ${msg.Lastname}`}
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
      </main>
    </div>
  );
}
