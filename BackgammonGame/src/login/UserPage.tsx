import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut, getAuth } from "firebase/auth";

const auth = getAuth();

const UserProfile: React.FC = () => {
  const navigate = useNavigate();

  // Stato per i dati utente
  const [user, setUser] = useState<{ username: string; score: number } | null>(null);

  // 🔹 Funzione per ottenere i dati aggiornati dal backend
  const fetchUserData = async () => {
    try {
      console.log("📡 Recupero dati utente...");
  
      // ✅ Recuperiamo il token dal localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("❌ Nessun token trovato, utente non autenticato!");
        return;
      }
  
      const response = await fetch("/api/userProfile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // ✅ Invia il token nel backend
        }
      });
  
      if (!response.ok) throw new Error("Errore nel recupero dati utente");
  
      const data = await response.json();
      console.log("✅ Dati utente ricevuti:", data);
  
      setUser(data); // ✅ Aggiorna lo stato React
      localStorage.setItem("user", JSON.stringify(data)); // ✅ Aggiorna `localStorage`
    } catch (error) {
      console.error("❌ Errore nel recupero dei dati utente:", error);
    }
  };

  // Recupera i dati dal backend ogni volta che la pagina viene aperta
  useEffect(() => {
    fetchUserData();
  }, []);
  // Funzione di logout
  const handleLogout = async () => {
    try {
      // 🔹 Effettua il logout da Firebase Authentication
      await signOut(auth);
      console.log("✅ Logout da Firebase completato");

      // 🔹 Effettua il logout dal backend
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include", // Necessario per inviare il cookie di sessione
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        console.log("✅ Logout effettuato con successo");
        localStorage.clear(); // ✅ Pulisce tutti i dati locali
        navigate("/auth"); // ✅ Reindirizza alla pagina di login
      } else {
        const data = await response.json();
        console.error("❌ Errore nel logout:", data.message);
      }
    } catch (error) {
      console.error("❌ Errore durante il logout:", error);
    }
  };

  // Funzione per navigare alle altre pagine
  const handleSelectOption = (option: string) => {
    navigate(option);
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>User Profile</h2>

      {user ? (
        <div>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Score:</strong> {user.score}</p> {/* Mostriamo il punteggio */}

          {/* Bottone di logout */}
          <button
            onClick={handleLogout}
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

          {/* Bottone per tornare al menu */}
          <button
            onClick={() => handleSelectOption('/menu')}
          >
            Return to the Main Menu
          </button>
          <button onClick={() => navigate('/delete-data')}>How to delete your data?</button>
        </div>
      ) : (
        <p>Nessun utente loggato.</p>
      )}
    </div>
  );
};

export default UserProfile;



