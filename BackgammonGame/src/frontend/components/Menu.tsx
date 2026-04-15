import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Menu.css"; 

declare global {
  interface Window {
    FB: any;
  }
}

interface MenuProps {
  onSelectOption: (option: string) => void;
}

const Menu: React.FC<MenuProps> = ({ onSelectOption }) => {
  const navigate = useNavigate();

  const handleSelectOption = (option: string) => {
    navigate(option);
  };

  const shareOnFacebook = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const score = user.score || 0; // Fallback per evitare errori
    const username = encodeURIComponent(user.username || "Guest");

    // URL della pagina di condivisione nel backend
    const siteUrl = `https://backgammongame.ddns.net/share/${username}`;

    // Link di condivisione Facebook
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`;

    // Apri la finestra di condivisione
    window.open(shareUrl, "_blank", "width=600,height=400");
  };

  // Funzione per bloccare il tasto indietro del browser
  const blockBackNavigation = () => {
    // Usa pushState per manipolare la cronologia senza cambiare la pagina
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = () => {
      window.history.go(1); // Impedisce di tornare indietro
    };
  };

  useEffect(() => {
    blockBackNavigation(); // Chiama la funzione appena il componente è montato

    // Pulizia: ripristina il comportamento normale del tasto indietro quando il componente viene smontato
    return () => {
      window.onpopstate = null;
    };
  }, []); // La funzione viene eseguita una sola volta, al montaggio del componente

  return (
    <div className="menu-container">
      <h1 className="menu-title">Welcome to Backgammon!</h1>
      <h3>Select an option</h3>
      <div className="menu-section">
        <h4>Game Modes</h4>
        <div className="menu-buttons">
          <button
            className="menu-button"
            onClick={() => handleSelectOption("/Client")}
          >
            Play online
          </button>
          <button
            className="menu-button"
            onClick={() => handleSelectOption("/Play")}
          >
            Bot vs Bot
          </button>
          <button
            className="menu-button"
            onClick={() => handleSelectOption("/Playvsbot")}
          >
            Player vs Bot
          </button>
          <button
            className="menu-button"
            onClick={() => handleSelectOption("/tornei")}
          >
            Tournament mode
          </button>
        </div>
      </div>
      <div className="menu-section">
        <h4>Social</h4>
        <div className="menu-buttons">
          <button
            className="menu-button"
            onClick={() => handleSelectOption("/friends")}
          >
            Friends
          </button>
          <button className="menu-button" onClick={shareOnFacebook}>
            Share on Facebook!
          </button>
        </div>
      </div>
      <div className="menu-section">
        <h4>Others</h4>
        <div className="menu-buttons">
          <button
            className="menu-button"
            onClick={() => handleSelectOption("/Guide")}
          >
            Guide
          </button>
          <button
            className="menu-button"
            onClick={() => handleSelectOption("/classifica")}
          >
            Leaderboard
          </button>
          <button
            className="menu-button"
            onClick={() => handleSelectOption("/user-profile")}
          >
            User Info
          </button>
        </div>
      </div>
    </div>
  );
};

export default Menu;

