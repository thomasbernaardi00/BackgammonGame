import { auth, provider } from "../../FirebaseConfig"; // ✅ Usa la configurazione Firebase
import { signInWithPopup, GithubAuthProvider } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io();

// 🔍 Funzione per ottenere lo username GitHub dall'API ufficiale
const fetchGithubUsername = async (accessToken: string): Promise<string | null> => {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${accessToken}`, // ✅ Usa il token di accesso GitHub
      },
    });

    if (!response.ok) {
      console.error("❌ Errore nel recupero dello username GitHub:", response.statusText);
      return null;
    }

    const data = await response.json();
    console.log("✅ Dati GitHub ottenuti:", data);
    return data.login; // 🆔 **Usa lo username corretto**
  } catch (error) {
    console.error("❌ Errore durante la richiesta a GitHub:", error);
    return null;
  }
};

const GithubLogin = () => {
  const navigate = useNavigate();

  const handleGithubLogin = async () => {
    try {
      console.log("🚀 Avvio login con GitHub...");
      const result = await signInWithPopup(auth, provider);

      if (!result.user) {
        console.error("❌ Errore: Utente non autenticato!");
        return;
      }

      console.log("✅ Utente autenticato con Firebase:", result.user);

      // 🔥 **Estrai il token GitHub dalla credenziale**
      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubToken = credential?.accessToken; // ✅ Token GitHub

      if (!githubToken) {
        console.error("❌ Errore: Token GitHub non trovato!");
        return;
      }

      console.log("✅ Token GitHub ottenuto:", githubToken);

      // 🔍 **Ottieni lo username GitHub**
      const githubUsername = await fetchGithubUsername(githubToken);

      if (!githubUsername) {
        console.error("❌ Errore: Impossibile ottenere lo username di GitHub!");
        return;
      }

      console.log("🆔 Username GitHub recuperato:", githubUsername);

      // 🔹 Salviamo utente e token nel localStorage
      localStorage.setItem(
        "user",
        JSON.stringify({
          username: githubUsername,
          email: result.user.email || null,
          uid: result.user.uid,
          
        })
      );
      localStorage.setItem("token", githubToken);

      // 🔹 Invia il token al server per salvare l'utente nel database
      console.log("📡 Inviando il token al server...");
      socket.emit("githubLogin", {
        username: githubUsername,
        email: result.user.email || null,
        uid: result.user.uid,
        token: githubToken,
      });

      // 🔹 Gestione della risposta dal server
      socket.on("githubLoginSuccess", ({ user, jwtToken }) => {
        console.log("✅ Utente salvato nel database:", user);
        console.log("✅ JWT ricevuto dal server:", jwtToken);

        // Salva il JWT nel localStorage
        localStorage.setItem("token", jwtToken);
        localStorage.setItem("user", JSON.stringify({
          username: user.username,
          email: user.email || null,
          uid: user.uid,
          userId: user._id  // ✅ Aggiungiamo l'userId per i prossimi fetch
      }));

        // Reindirizza al menu
        setTimeout(() => {
          navigate("/menu");
        }, 1000);
      });

      socket.on("githubLoginError", (errorMessage) => {
        console.error("❌ Errore login GitHub:", errorMessage);
      });
    } catch (error) {
      console.error("❌ Errore durante il login con GitHub:", error);
    }
  };

  return <button onClick={handleGithubLogin}>Sign up with GitHub</button>;
};

export default GithubLogin;
