import React, { useEffect, useRef, useState } from "react"; 
import { useNavigate } from "react-router-dom";
import bgImage from "./components/assets/bg.jpg";
import img1 from "./components/assets/img1.jpg";
import img2 from "./components/assets/img2.jpg";
import img3 from "./components/assets/img3.JPG";
import img4 from "./components/assets/img4.JPG";
import img5 from "./components/assets/img5.JPG";
import img6 from "./components/assets/img6.JPG";
import img7 from "./components/assets/img7.JPG";
import img8 from "./components/assets/img8.JPG";
import img9 from "./components/assets/img9.jpg"; 
import "./CustomerHome.css";

const FadeInSection = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false); 
        }
      });
    });

    const currentElement = domRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) observer.unobserve(currentElement);
    };
  }, []);

  return (
    <div
      ref={domRef}
      className={`reveal-on-scroll ${isVisible ? 'is-visible' : ''}`}
      style={{ width: '100%' }}
    >
      {children}
    </div>
  );
};

export default function CustomerHome() {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("flash");
    navigate("/login");
  };

  const themeCards = [
    { img: img1},
    { img: img2},
    { img: img3},
    { img: img4},
    { img: img5},
    { img: img6},
    { img: img7},
    { img: img8},
    { img: img9},
  ];

  return (
    <div className="ch-root">
      <header className="ch-navbar">
        <div className="ch-navbar-container">
          <div className="ch-navbar-brand">
            <h1 className="ch-brand-title">Baby's Eventique</h1>
          </div>
          <nav className="ch-nav">
             {/* Navigation Buttons */}
            <button className="ch-link" onClick={() => navigate("/customer-home")}>HOME</button>
            <button className="ch-link" onClick={() => navigate("/customer-packages")}>PACKAGES</button>
            <button className="ch-link" onClick={() => navigate("/bookings")}>MANAGE BOOKINGS</button>
            <button className="ch-link" onClick={() => navigate("/design-queries")}>CUSTOMER INQUIRIES</button>
            <div className="ch-link ch-logout" onClick={handleLogout}>LOGOUT</div>
          </nav>
        </div>
      </header>

      <div
        className="landing-root"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          position: "relative",
          minHeight: "100vh",
          width: "100%"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(rgba(199, 152, 90, 0.49), rgba(189, 117, 23, 0.49))",
            zIndex: 0,
          }}
        />

        <main className="ch-main" style={{ position: "relative", zIndex: 1 }}>
          <section className="ch-explore-font">
            <div>
              <h1>Baby's Eventique</h1>
              <p>Curating timeless memories for life's most precious beginnings.</p>
            </div>
          </section>

          <section className="ch-explore">
            <h2>Layout Gallery</h2>
            
            <div className="ch-grid">
              {themeCards.map((card, index) => (
                <FadeInSection key={index}>
                  <article 
                    className="ch-card" 
                    style={{ background: "transparent", boxShadow: "none", border: "none" }}
                  >
                    <div className="ch-thumb">
                      <img 
                        src={card.img} 
                        alt={card.title} 
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }}
                        className="hover-effect-img"
                      />
                    </div>
                    {/* Only render text if data exists */}
                    {card.title && <h3 style={{ marginTop: "10px", textAlign: "center" }}>{card.title}</h3>}
                    {card.desc && <p style={{ textAlign: "center" }}>{card.desc}</p>}
                  </article>
                </FadeInSection>
              ))}
            </div>
          </section>
        </main>
      </div>

      <footer className="ch-footer">
        <div>Contact: events@babys-eventique.ph • +63 917 123 4567</div>
        <div>© 2025 Baby's Eventique</div>
      </footer>
    </div>
  );
}