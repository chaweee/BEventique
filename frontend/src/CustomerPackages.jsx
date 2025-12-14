import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas as FabricCanvas } from "fabric";
import "./CustomerPackages.css";
import bgImage from "./components/assets/bg.jpg"; // updated import

export default function CustomerPackages() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [canvasImage, setCanvasImage] = useState(null);

  // Convert canvas layout to image when modal opens
  useEffect(() => {
    if (modalOpen && selectedPackage) {
      console.log("Selected package:", selectedPackage);
      console.log("Package layout field:", selectedPackage.package_layout);
      
      if (selectedPackage.package_layout) {
        try {
          const layoutData = typeof selectedPackage.package_layout === 'string' 
            ? JSON.parse(selectedPackage.package_layout) 
            : selectedPackage.package_layout;
          
          console.log("Parsed layout data:", layoutData);
          
          if (layoutData && typeof layoutData === 'object' && layoutData.objects) {
            console.log("Creating canvas with", layoutData.objects.length, "objects");
            
            // Calculate canvas dimensions from objects if not specified
            let canvasWidth = layoutData.width;
            let canvasHeight = layoutData.height;
            
            if (!canvasWidth || !canvasHeight) {
              // Calculate bounding box from all objects
              let maxX = 0, maxY = 0;
              layoutData.objects.forEach(obj => {
                const objWidth = (obj.width || 0) * (obj.scaleX || 1);
                const objHeight = (obj.height || 0) * (obj.scaleY || 1);
                const right = (obj.left || 0) + objWidth;
                const bottom = (obj.top || 0) + objHeight;
                maxX = Math.max(maxX, right);
                maxY = Math.max(maxY, bottom);
              });
              canvasWidth = maxX + 100; // Add padding
              canvasHeight = maxY + 100;
            }
            
            // Create a temporary canvas element and attach to DOM
            const tempCanvas = document.createElement('canvas');
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '-9999px';
            document.body.appendChild(container);
            container.appendChild(tempCanvas);
            
            tempCanvas.width = canvasWidth;
            tempCanvas.height = canvasHeight;
            
            // Create fabric canvas on the temporary element
            const fabricCanvas = new FabricCanvas(tempCanvas, {
              width: canvasWidth,
              height: canvasHeight,
              backgroundColor: layoutData.background || '#1f2937'
            });
            
            // Load the layout data with proper callback handling
            fabricCanvas.loadFromJSON(layoutData).then(() => {
              // Set background if specified in layout
              if (layoutData.background) {
                fabricCanvas.backgroundColor = layoutData.background;
              }
              
              // Render and convert to image
              fabricCanvas.renderAll();
              
              // Small delay to ensure rendering is complete
              setTimeout(() => {
                try {
                  const dataUrl = fabricCanvas.toDataURL({
                    format: 'png',
                    quality: 1
                  });
                  setCanvasImage(dataUrl);
                } catch (err) {
                  console.log("Error converting canvas:", err);
                  setCanvasImage(null);
                } finally {
                  fabricCanvas.dispose();
                  if (container && container.parentNode) {
                    document.body.removeChild(container);
                  }
                }
              }, 100);
            }).catch((err) => {
              console.error("Error loading canvas JSON:", err);
              fabricCanvas.dispose();
              if (container && container.parentNode) {
                document.body.removeChild(container);
              }
            });
          } else {
            setCanvasImage(null);
          }
        } catch (e) {
          console.log("Could not parse canvas layout:", e);
          setCanvasImage(null);
        }
      } else {
        setCanvasImage(null);
      }
    } else {
      setCanvasImage(null);
    }
    setCurrentPhotoIndex(0);
  }, [modalOpen, selectedPackage]);

  useEffect(() => {
    const user = sessionStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }
    fetchPackages();
  }, [navigate]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3001/api/packages/list");
      if (!response.ok) throw new Error("Failed to fetch packages");
      
      const data = await response.json();
      setPackages(Array.isArray(data) ? data : data.packages || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("flash");
    navigate("/login");
  };

  const handleViewDetails = (pkg) => {
    setSelectedPackage(pkg);
    setModalOpen(true);
    setCurrentPhotoIndex(0);
  };

  const getDisplayPhotos = () => {
    if (!selectedPackage) return [];
    
    const photos = selectedPackage.photos || [];
    
    // If there's a canvas image, insert it as the 2nd photo
    if (canvasImage) {
      const displayPhotos = [...photos];
      displayPhotos.splice(1, 0, canvasImage);
      return displayPhotos;
    }
    return photos;
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedPackage(null);
    setCurrentPhotoIndex(0);
  };

  const nextPhoto = () => {
    const displayPhotos = getDisplayPhotos();
    if (displayPhotos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev + 1) % displayPhotos.length);
    }
  };

  const prevPhoto = () => {
    const displayPhotos = getDisplayPhotos();
    if (displayPhotos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev - 1 + displayPhotos.length) % displayPhotos.length);
    }
  };

  return (
    <div
      className="cp-root"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed", // FIX 1: Keeps background fixed during scroll
        minHeight: "100vh",
        minWidth: "100vw",
        position: "relative",
      }}
    >
      {/* Semi-transparent overlay */}
      <div
        style={{
          position: "fixed", // FIX 2: Fixed position so overlay covers entire viewport
          inset: 0,
          background: "linear-gradient(rgba(255,255,255,0.65), rgba(255,255,255,0.65))",
          zIndex: 0,
          pointerEvents: "none"
        }}
      />
      
      <header className="cp-navbar" style={{ position: "relative", zIndex: 1 }}>
        <div className="cp-navbar-container">
          <div className="cp-navbar-brand">
            <h1 className="cp-brand-title">Baby's Eventique</h1>
          </div>

          <nav className="cp-nav">
            <button className="cp-link" onClick={() => navigate("/customer-home")}>HOME</button>
            <button className="cp-link" onClick={() => navigate("/customer-packages")}>PACKAGES</button>
            <button className="cp-link" onClick={() => navigate("/bookings")}>MANAGE BOOKINGS</button>
            <button className="cp-link" onClick={() => navigate("/design-queries")}>CUSTOMER INQUIRIES</button>
            <div
              className="cp-link cp-logout"
              role="button"
              tabIndex={0}
              onClick={handleLogout}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleLogout(); }}
            >
              LOGOUT
            </div>
          </nav>
        </div>
      </header>

      {/* FIX 3: Added background: "transparent" to override CSS */}
      <main className="cp-main" style={{ position: "relative", zIndex: 1, background: "transparent" }}>
        <section className="cp-content cp-content-centered">
          <div className="cp-header">
            <h1>Our Packages</h1>
            <p>Browse and select the perfect package for your event</p>
          </div>

          {loading && <div className="cp-loading">Loading packages...</div>}
          {error && <div className="cp-error">Error: {error}</div>}
          
          {!loading && !error && packages.length === 0 && (
            <div className="cp-empty">No packages available</div>
          )}

          {!loading && !error && packages.length > 0 && (
            <div className="cp-grid cp-grid-centered">
              {packages.map((pkg) => {
                const packageId = pkg.Package_ID || pkg.id;
                const packageName = pkg.Package_Name || pkg.name;
                const description = pkg.Description || pkg.description || "";
                const price = pkg.Package_Amount || pkg.price || "";
                const photos = pkg.photos || [];

                return (
                  <div key={packageId} className="cp-card">
                    <div className="cp-card-image">
                      {photos.length > 0 ? (
                        <img src={photos[0]} alt={packageName} className="cp-image" />
                      ) : (
                        <div className="cp-image-placeholder">No Image</div>
                      )}
                    </div>

                    <div className="cp-card-content">
                      <h2 className="cp-card-title">{packageName}</h2>
                      <p className="cp-card-desc">{description}</p>
                      
                      <div className="cp-card-footer">
                        <div className="cp-price">
                          {price ? `₱${Number(price).toLocaleString()}` : "Contact for pricing"}
                        </div>
                        <div className="cp-card-buttons">
                          <button 
                            className="cp-details-btn"
                            onClick={() => handleViewDetails(pkg)}
                          >
                            Details
                          </button>
                          <button 
                            className="cp-book-btn"
                            onClick={() => navigate("/booking", { state: { package: pkg } })}
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {modalOpen && selectedPackage && (
        <div className="cp-modal-overlay" onClick={closeModal}>
          <div className="cp-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="cp-modal-close" onClick={closeModal}>✕</button>
            
            <div className="cp-modal-body">
              {/* Left: Images Gallery */}
              <div className="cp-modal-images">
                <div className="cp-modal-main-image">
                  {(() => {
                    const displayPhotos = getDisplayPhotos();
                    return displayPhotos.length > 0 ? (
                      <>
                        <img src={displayPhotos[currentPhotoIndex]} alt={selectedPackage.Package_Name} />
                        {displayPhotos.length > 1 && (
                          <>
                            <button className="cp-photo-nav cp-photo-prev" onClick={prevPhoto}>❮</button>
                            <button className="cp-photo-nav cp-photo-next" onClick={nextPhoto}>❯</button>
                            <div className="cp-photo-counter">{currentPhotoIndex + 1} / {displayPhotos.length}</div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="cp-modal-image-placeholder">No Image</div>
                    );
                  })()}
                </div>
                
                {(() => {
                  const displayPhotos = getDisplayPhotos();
                  return displayPhotos.length > 1 ? (
                    <div className="cp-modal-thumbnails">
                      {displayPhotos.map((photo, idx) => (
                        <img 
                          key={idx} 
                          src={photo} 
                          alt="" 
                          className={`cp-modal-thumbnail ${idx === currentPhotoIndex ? 'active' : ''}`}
                          onClick={() => setCurrentPhotoIndex(idx)}
                        />
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Right: Details */}
              <div className="cp-modal-details">
                <h2 className="cp-modal-title">{selectedPackage.Package_Name || selectedPackage.name}</h2>
                
                <div className="cp-modal-price">
                  {selectedPackage.Package_Amount ? `₱${Number(selectedPackage.Package_Amount).toLocaleString()}` : "Contact for pricing"}
                </div>

                <div className="cp-modal-specs">
                  {selectedPackage.NumTables > 0 && (
                    <div className="cp-spec-item">
                      <span className="cp-spec-label">Tables:</span>
                      <span className="cp-spec-value">{selectedPackage.NumTables}</span>
                    </div>
                  )}
                  {selectedPackage.NumRoundTables > 0 && (
                    <div className="cp-spec-item">
                      <span className="cp-spec-label">Round Tables:</span>
                      <span className="cp-spec-value">{selectedPackage.NumRoundTables}</span>
                    </div>
                  )}
                  {selectedPackage.NumChairs > 0 && (
                    <div className="cp-spec-item">
                      <span className="cp-spec-label">Chairs:</span>
                      <span className="cp-spec-value">{selectedPackage.NumChairs}</span>
                    </div>
                  )}
                  {selectedPackage.NumTent > 0 && (
                    <div className="cp-spec-item">
                      <span className="cp-spec-label">Tents:</span>
                      <span className="cp-spec-value">{selectedPackage.NumTent}</span>
                    </div>
                  )}
                  {selectedPackage.NumPlatform > 0 && (
                    <div className="cp-spec-item">
                      <span className="cp-spec-label">Platform:</span>
                      <span className="cp-spec-value">{selectedPackage.NumPlatform}</span>
                    </div>
                  )}
                </div>

                <div className="cp-modal-description">
                  <h3>Description</h3>
                  <p>{selectedPackage.Description || selectedPackage.description || "No description available"}</p>
                </div>

                <div className="cp-modal-footer">
                  <button 
                    className="cp-modal-book-btn"
                    onClick={() => {
                      navigate("/booking", { state: { package: selectedPackage } });
                    }}
                  >
                    Book Now
                  </button>
                  <button className="cp-modal-cancel-btn" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="cp-footer" style={{ position: "relative", zIndex: 1 }}>
        <div>Contact: events@babys-eventique.ph • +63 917 123 4567</div>
        <div>© 2025 Baby's Eventique</div>
      </footer>
    </div>
  );
}