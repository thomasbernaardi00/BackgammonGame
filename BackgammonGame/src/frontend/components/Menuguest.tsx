import React from 'react';
import { useNavigate } from 'react-router-dom';


interface GuestMenuProps {
    onSelectOption: (option: string) => void;
}

const GuestMenu: React.FC<GuestMenuProps> = ({ onSelectOption }) => {
    const navigate = useNavigate();

    // Funzione per gestire la selezione dell'opzione
    const handleSelectOption = (option: string) => {
        onSelectOption(option);
        navigate(option);
    };
    
    const handleGuestLogout = () => {
        // Pulisce i dati locali se ci sono (localStorage, sessionStorage, etc.)
        localStorage.clear(); // Pulisce tutto il localStorage
        sessionStorage.clear(); // Pulisce anche il sessionStorage se utilizzato
    
        // Pulisce eventuali cookie, se necessario (se la tua app usa cookie specifici)
        document.cookie.split(';').forEach((cookie) => {
          const cookieName = cookie.split('=')[0].trim();
          document.cookie = `${cookieName}=;expires=${new Date(0).toUTCString()};path=/`;
        });
    
        console.log("✅ Logout guest effettuato con successo");
    
        // Reindirizza alla pagina di login o alla home
        navigate("/auth"); // O naviga dove preferisci, per esempio alla pagina di login
      };
    

    return (
        <div className="menu-container">
            <h1 className="menu-title">Welcome to Backgammon!</h1>
            <h3>Select an option</h3>
            <div className="menu-buttons">
                <button className="menu-button" onClick={() => handleSelectOption("/play")}>
                    Bot vs Bot
                </button>
                <button className="menu-button" onClick={() => handleSelectOption("/playvsbot")}>
                    Player vs Bot
                </button>
                <button className="menu-button" onClick={() => handleSelectOption("/guide")}>
                    Guide
                </button>
                <button
            onClick={handleGuestLogout}
            style={{
              backgroundColor: "red",
              color: "white",
              border: "none",
              padding: "10px 20px",
              fontSize: "16px",
              borderRadius: "5px",
              cursor: "pointer",
              marginTop: "20px",
            }}
          >
            Logout
          </button>
            </div>
        </div>
    );
};

export default GuestMenu;
