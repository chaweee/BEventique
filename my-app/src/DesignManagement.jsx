import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./DesignManagement.css";

export default function DesignManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(""); // 'view', 'assign', 'revision', 'complete'
  const [designers, setDesigners] = useState([]);

  // Form states
  const [assignForm, setAssignForm] = useState({ designer_id: "" });
  const [revisionForm, setRevisionForm] = useState({ revision_note: "" });
  const [completeForm, setCompleteForm] = useState({ final_output: "", remarks: "" });
  const [createForm, setCreateForm] = useState({
    booking_id: "",
    client_id: "",
    layout_specs: "",
    notes: ""
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch requests based on active tab
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = activeTab === "pending" 
        ? "http://localhost:3001/api/design/pending"
        : `http://localhost:3001/api/design/list${activeTab !== "all" ? `?status=${activeTab}` : ""}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === "success") {
        setRequests(data.requests);
      } else {
        setError(data.message || "Failed to fetch requests");
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Fetch designers for assignment
  const fetchDesigners = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/design/designers/list");
      const data = await res.json();
      if (data.status === "success") {
        setDesigners(data.designers);
      }
    } catch (err) {
      console.error("Failed to fetch designers:", err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchDesigners();
  }, [fetchRequests]);

  // Open modal with specific type
  const openModal = (type, request = null) => {
    setSelectedRequest(request);
    setModalType(type);
    setShowModal(true);
    setError("");
    
    // Reset forms
    setAssignForm({ designer_id: "" });
    setRevisionForm({ revision_note: "" });
    setCompleteForm({ final_output: "", remarks: "" });
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setModalType("");
  };

  // A. Create design request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      const res = await fetch("http://localhost:3001/api/design/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm)
      });
      
      const data = await res.json();
      
      if (data.status === "success") {
        setShowCreateModal(false);
        setCreateForm({ booking_id: "", client_id: "", layout_specs: "", notes: "" });
        fetchRequests();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Network error: " + err.message);
    }
  };

  // C. Assign designer
  const handleAssign = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      const res = await fetch("http://localhost:3001/api/design/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: selectedRequest.request_id,
          designer_id: assignForm.designer_id
        })
      });
      
      const data = await res.json();
      
      if (data.status === "success") {
        closeModal();
        fetchRequests();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Network error: " + err.message);
    }
  };

  // D. Save revision
  const handleRevision = async (e) => {
    e.preventDefault();
    setError("");
    
    // Get current user ID from localStorage or session
    const currentUserId = localStorage.getItem("userId") || 1;
    
    try {
      const res = await fetch("http://localhost:3001/api/design/revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: selectedRequest.request_id,
          revision_note: revisionForm.revision_note,
          revised_by: currentUserId
        })
      });
      
      const data = await res.json();
      
      if (data.status === "success") {
        closeModal();
        fetchRequests();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Network error: " + err.message);
    }
  };

  // E. Complete design
  const handleComplete = async (e) => {
    e.preventDefault();
    setError("");
    
    const currentUserId = localStorage.getItem("userId") || 1;
    
    try {
      const res = await fetch("http://localhost:3001/api/design/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: selectedRequest.request_id,
          final_output: completeForm.final_output,
          remarks: completeForm.remarks,
          completed_by: currentUserId
        })
      });
      
      const data = await res.json();
      
      if (data.status === "success") {
        closeModal();
        fetchRequests();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Network error: " + err.message);
    }
  };

  // Update status
  const handleStatusChange = async (requestId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:3001/api/design/status/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await res.json();
      
      if (data.status === "success") {
        fetchRequests();
      }
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      pending: "#f59e0b",
      assigned: "#3b82f6",
      in_progress: "#8b5cf6",
      revision: "#ef4444",
      completed: "#10b981",
      cancelled: "#6b7280"
    };
    return colors[status] || "#6b7280";
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="dm-root">
      <aside className="dm-sidebar">
        <div className="dm-brand">Designer — Design Queries</div>
        <nav className="dm-nav">
          <button onClick={() => navigate("/designer-packages")}>Manage Packages</button>
          <button className="active">Design Queries</button>
        </nav>
        <div style={{ marginTop: "auto" }}>
          <button className="dm-logout" onClick={() => { sessionStorage.removeItem("user"); navigate("/login"); }}>
            Logout
          </button>
        </div>
      </aside>

      <main className="dm-main">
        <div className="design-management">
      <div className="design-header">
        <h1>Design Queries</h1>
        <button className="create-btn" onClick={() => setShowCreateModal(true)}>
          + New Design Request
        </button>
      </div>

      {/* Tabs */}
      <div className="design-tabs">
        {["pending", "assigned", "in_progress", "revision", "completed", "all"].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.replace("_", " ").charAt(0).toUpperCase() + tab.replace("_", " ").slice(1)}
          </button>
        ))}
      </div>

      {/* Error message */}
      {error && <div className="error-message">{error}</div>}

      {/* Loading */}
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        /* Requests Table */
        <div className="requests-table-container">
          <table className="requests-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Client</th>
                <th>Booking ID</th>
                <th>Designer</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data">No design requests found</td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.request_id}>
                    <td>#{req.request_id}</td>
                    <td>{req.client_firstname} {req.client_lastname}</td>
                    <td>#{req.booking_id}</td>
                    <td>
                      {req.designer_firstname 
                        ? `${req.designer_firstname} ${req.designer_lastname}`
                        : <span className="unassigned">Unassigned</span>
                      }
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(req.status) }}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td>{formatDate(req.created_at)}</td>
                    <td className="actions-cell">
                      <button 
                        className="action-btn view"
                        onClick={() => openModal("view", req)}
                        title="View Details"
                      >
                        👁
                      </button>
                      
                      {req.status === "pending" && (
                        <button 
                          className="action-btn assign"
                          onClick={() => openModal("assign", req)}
                          title="Assign Designer"
                        >
                          👤+
                        </button>
                      )}
                      
                      {["assigned", "in_progress"].includes(req.status) && (
                        <>
                          <button 
                            className="action-btn revision"
                            onClick={() => openModal("revision", req)}
                            title="Add Revision"
                          >
                            ✏️
                          </button>
                          <button 
                            className="action-btn complete"
                            onClick={() => openModal("complete", req)}
                            title="Complete Design"
                          >
                            ✅
                          </button>
                        </>
                      )}
                      
                      {req.status === "revision" && (
                        <button 
                          className="action-btn complete"
                          onClick={() => openModal("complete", req)}
                          title="Submit Updated Design"
                        >
                          ✅
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Design Request</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateRequest}>
              <div className="form-group">
                <label>Booking ID *</label>
                <input
                  type="number"
                  value={createForm.booking_id}
                  onChange={(e) => setCreateForm({...createForm, booking_id: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Client ID *</label>
                <input
                  type="number"
                  value={createForm.client_id}
                  onChange={(e) => setCreateForm({...createForm, client_id: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Layout Specifications</label>
                <textarea
                  value={createForm.layout_specs}
                  onChange={(e) => setCreateForm({...createForm, layout_specs: e.target.value})}
                  placeholder='{"tables": 10, "chairs": 100, "theme": "Modern"}'
                  rows="4"
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({...createForm, notes: e.target.value})}
                  placeholder="Additional notes for the designer..."
                  rows="3"
                />
              </div>
              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Create Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Modals */}
      {showModal && selectedRequest && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalType === "view" && "Design Request Details"}
                {modalType === "assign" && "Assign Designer"}
                {modalType === "revision" && "Add Revision Note"}
                {modalType === "complete" && "Complete Design"}
              </h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>

            {/* View Details */}
            {modalType === "view" && (
              <div className="request-details">
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Request ID</label>
                    <span>#{selectedRequest.request_id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Booking ID</label>
                    <span>#{selectedRequest.booking_id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Client</label>
                    <span>{selectedRequest.client_firstname} {selectedRequest.client_lastname}</span>
                  </div>
                  <div className="detail-item">
                    <label>Client Email</label>
                    <span>{selectedRequest.client_email}</span>
                  </div>
                  <div className="detail-item">
                    <label>Assigned Designer</label>
                    <span>
                      {selectedRequest.designer_firstname 
                        ? `${selectedRequest.designer_firstname} ${selectedRequest.designer_lastname}`
                        : "Unassigned"
                      }
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(selectedRequest.status) }}
                    >
                      {selectedRequest.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Created</label>
                    <span>{formatDate(selectedRequest.created_at)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Last Updated</label>
                    <span>{formatDate(selectedRequest.updated_at)}</span>
                  </div>
                </div>
                
                <div className="detail-section">
                  <label>Layout Specifications</label>
                  <pre className="specs-content">{selectedRequest.layout_specs || "No specifications provided"}</pre>
                </div>
                
                <div className="detail-section">
                  <label>Notes</label>
                  <p>{selectedRequest.notes || "No notes"}</p>
                </div>
                
                {selectedRequest.final_output && (
                  <div className="detail-section">
                    <label>Final Output</label>
                    <a href={selectedRequest.final_output} target="_blank" rel="noopener noreferrer">
                      {selectedRequest.final_output}
                    </a>
                  </div>
                )}
                
                {/* Quick status update */}
                <div className="status-update-section">
                  <label>Update Status:</label>
                  <select 
                    value={selectedRequest.status}
                    onChange={(e) => {
                      handleStatusChange(selectedRequest.request_id, e.target.value);
                      closeModal();
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="revision">Revision</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            )}

            {/* Assign Designer Form */}
            {modalType === "assign" && (
              <form onSubmit={handleAssign}>
                <div className="form-group">
                  <label>Select Designer *</label>
                  <select
                    value={assignForm.designer_id}
                    onChange={(e) => setAssignForm({...assignForm, designer_id: e.target.value})}
                    required
                  >
                    <option value="">-- Select a Designer --</option>
                    {designers.map((d) => (
                      <option key={d.Account_ID} value={d.Account_ID}>
                        {d.Firstname} {d.Lastname} ({d.Email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="request-summary">
                  <p><strong>Request:</strong> #{selectedRequest.request_id}</p>
                  <p><strong>Client:</strong> {selectedRequest.client_firstname} {selectedRequest.client_lastname}</p>
                </div>
                {error && <div className="form-error">{error}</div>}
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="submit-btn">Assign Designer</button>
                </div>
              </form>
            )}

            {/* Revision Form */}
            {modalType === "revision" && (
              <form onSubmit={handleRevision}>
                <div className="form-group">
                  <label>Revision Notes *</label>
                  <textarea
                    value={revisionForm.revision_note}
                    onChange={(e) => setRevisionForm({...revisionForm, revision_note: e.target.value})}
                    placeholder="Describe what changes need to be made..."
                    rows="5"
                    required
                  />
                </div>
                <div className="request-summary">
                  <p><strong>Request:</strong> #{selectedRequest.request_id}</p>
                  <p><strong>Designer:</strong> {selectedRequest.designer_firstname} {selectedRequest.designer_lastname}</p>
                </div>
                {error && <div className="form-error">{error}</div>}
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="submit-btn">Submit Revision</button>
                </div>
              </form>
            )}

            {/* Complete Design Form */}
            {modalType === "complete" && (
              <form onSubmit={handleComplete}>
                <div className="form-group">
                  <label>Final Output (URL or File Path) *</label>
                  <input
                    type="text"
                    value={completeForm.final_output}
                    onChange={(e) => setCompleteForm({...completeForm, final_output: e.target.value})}
                    placeholder="http://localhost:3001/uploads/designs/final_design.json"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Remarks</label>
                  <textarea
                    value={completeForm.remarks}
                    onChange={(e) => setCompleteForm({...completeForm, remarks: e.target.value})}
                    placeholder="Any final remarks or notes..."
                    rows="3"
                  />
                </div>
                <div className="request-summary">
                  <p><strong>Request:</strong> #{selectedRequest.request_id}</p>
                  <p><strong>Client:</strong> {selectedRequest.client_firstname} {selectedRequest.client_lastname}</p>
                </div>
                {error && <div className="form-error">{error}</div>}
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="submit-btn success">Mark as Completed</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}
