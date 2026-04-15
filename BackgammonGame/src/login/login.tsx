import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface LoginProps {
    switchToRegister: () => void;
  }
  
  const Login: React.FC<LoginProps> = ({ switchToRegister }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
  
    const navigate = useNavigate();
  
    const handleLogin = async (event: React.FormEvent) => {
      event.preventDefault();
      
      const data = { username, password };
  
      try {
          const response = await fetch("/api/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(data),
          });
  
          if (response.ok) {
              const responseData = await response.json();
              const token = responseData.token; // Ottieni il token dalla risposta
              const user = responseData.user; // ottieni dati utente dalla risposta
              localStorage.setItem("token", token); // Salva il token nel localStorage
              localStorage.setItem("user", JSON.stringify(user)); //salva i dati utente nel localStorage
              console.log("Login successful");
              setError("");
              navigate("/menu"); // Naviga alla pagina del menu
          } else if (response.status === 401) {
              // Mostra messaggio chiaro per l'utente
              const responseData = await response.json();
              setError( "Credenziali non valide. Riprova.");
          } else {
              setError(`Errore imprevisto: ${response.status}`);
          }
      } catch (err) {
          console.error("Errore durante la connessione:", err);
          setError("Errore di connessione con il server.");
      }
  };
  

  const handleGuestLogin = async () => {
    try {
      const response = await fetch("/api/guest-login",
       { method: "POST" });
      const result = await response.json();
      if (response.ok) {
        alert(result.message);
        localStorage.setItem("isGuest", "true");

        navigate("/GuestMenu"); // Naviga alla pagina del gioco
      } else {
        alert("Errore durante l'accesso come ospite");
      }
    } catch (error) {
      alert("Errore di connessione con il server");
    }
  };

  return (
    <div className="login-container">
      <h1>Login to play Backgammon!</h1>
      <form id="loginForm" onSubmit={handleLogin}>
        <label>Username:</label>
        <input
         type="text"
         placeholder="Username"
         value={username}
         onChange={(e) => setUsername(e.target.value)}
         required 
        />
        <br />
        <label>Password:</label>
        <input 
         type="password"
         placeholder="Password"
         value={password}
         onChange={(e) => setPassword(e.target.value)}
         required
        />
        <br />
        <button type="submit">Login</button>
      </form>
      <button onClick={handleGuestLogin}>Play as a guest</button>
      <div>
        Not registered yet?{" "}
        <span
          onClick={switchToRegister}
          style={{ cursor: "pointer", color: "blue" }}
        >
          Register here!
        </span>
      </div>
    </div>
  );
};

export default Login;