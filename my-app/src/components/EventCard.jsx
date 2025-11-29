import React from "react";
import "./styles/EventCard.css";

export default function EventCard({ title, image, description, price }) {
  return (
    <div className="event-card">
      <img src={image} alt={title} className="event-img" />
      <h3>{title}</h3>
      <p className="event-desc">{description}</p>
      <p className="event-price">Price: {price}</p>
      <button className="event-btn">View Details</button>
    </div>
  );
}