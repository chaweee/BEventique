import React, { useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";
import ThemeCategory from "../ThemeCategory";
import EventCard from "../EventCard";
import Footer from "../Footer";
import { themeCategories } from "../data/ThemeCategories";
import { eventLayouts } from "../data/eventlayouts";
import "./styles/Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [query, setQuery] = useState("");
  const categoriesRef = useRef(null);

  const handleCategoryClick = (cat) => {
    setSelectedCategory((prev) => (prev === cat.title ? null : cat.title));
    // scroll categories into view on small screens
    if (categoriesRef.current) categoriesRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const goToLayout = (layout) => {
    // route to layout detail page (implement route separately)
    navigate(`/layout/${layout.id}`);
  };

  const filteredLayouts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return eventLayouts.filter((l) => {
      const byCategory = selectedCategory ? (l.category || "").toLowerCase() === selectedCategory.toLowerCase() : true;
      const byQuery =
        !q ||
        l.name.toLowerCase().includes(q) ||
        (l.description || "").toLowerCase().includes(q) ||
        (l.tags || []).join(" ").toLowerCase().includes(q);
      return byCategory && byQuery;
    });
  }, [selectedCategory, query]);

  return (
    <div className="home-container">
      <Navbar />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">Bring Your Dream Event to Life</h1>
          <p className="hero-sub">Choose from our curated event themes and beautiful layout designs.</p>

          <div className="hero-actions">
            <button
              className="hero-btn"
              onClick={() => {
                // scroll to categories
                categoriesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Browse Event Themes
            </button>

            <input
              className="hero-search"
              type="search"
              placeholder="Search themes or keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search event layouts"
            />
          </div>
        </div>
      </section>

      {/* Theme Categories */}
      <section className="categories-section" ref={categoriesRef}>
        <div className="section-header">
          <h2>Event Categories</h2>
          <div className="clear-filter">
            {selectedCategory && (
              <button className="clear-btn" onClick={() => setSelectedCategory(null)}>
                Clear Filter
              </button>
            )}
          </div>
        </div>

        <div className="category-grid">
          {themeCategories.map((cat, index) => (
            <ThemeCategory
              key={index}
              title={cat.title}
              image={cat.image}
              icon={cat.icon}
              active={selectedCategory === cat.title}
              onClick={() => handleCategoryClick(cat)}
            />
          ))}
        </div>
      </section>

      {/* Layout Cards */}
      <section className="layouts-section">
        <div className="section-header">
          <h2>Event Layout Designs</h2>
          <div className="results-meta">{filteredLayouts.length} results</div>
        </div>

        {filteredLayouts.length === 0 ? (
          <div className="empty-state">No layouts found. Try a different category or keyword.</div>
        ) : (
          <div className="layout-grid">
            {filteredLayouts.map((layout) => (
              <div key={layout.id} className="layout-card-wrapper" onClick={() => goToLayout(layout)}>
                <EventCard
                  id={layout.id}
                  name={layout.name}
                  photo={layout.photo}
                  description={layout.description}
                  priceRange={layout.priceRange}
                  tags={layout.tags}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
