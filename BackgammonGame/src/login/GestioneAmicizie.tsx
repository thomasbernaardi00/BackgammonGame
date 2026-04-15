import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

interface Friend {
  username: string;
  _id: string;
}

interface FriendRequest {
  _id: string;
  from: {
    _id: string;
    username: string;
  };
  status: "attesa" | "accettata" | "rifiutata";
}

const GestioneAmicizie: React.FC = () => {
  const navigate = useNavigate();

     // Funzione per gestire la selezione dell'opzione
     const handleSelectOption = (option: string) => {
        // Esegui la navigazione con navigate
        navigate(option);
    };
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendName, setFriendName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [userID, setUserID] = useState<string | null>(null);

  // Recupera l'ID utente dal token
  useEffect(() => {
    const getUserId = () => {
      const token = localStorage.getItem("token");
      if (token) {
        const decoded: any = jwtDecode(token);
        console.log("ID utente decodificato:", decoded.userId); // Debug
        return decoded.userId;
      }
      return null;
    };
  
    setUserID(getUserId());
  }, []);

  // Funzione per recuperare amici e richieste di amicizia
  const fetchData = async () => {
    if (!userID) return; // Se userID non è disponibile, non fare la richiesta

    try {
      setLoading(true);

      // Ottieni la lista amici
      const amiciResponse = await fetch(`/api/amici?userID=${userID}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });

      const amiciData = await amiciResponse.json();
      setFriends(Array.isArray(amiciData) ? amiciData : []); // Assicurati che amiciData sia un array

      // Ottieni richieste di amicizia
      const requestsResponse = await fetch(`/api/richieste-amici?userID=${userID}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
        
      });

      const requestsData = await requestsResponse.json();
console.log("Sto recuperando le richieste di amicizia per:", userID);

// Verifica che `friendRequests` sia un array prima di eseguire `.map()`
const formattedRequests = Array.isArray(requestsData.friendsRequest)
  ? requestsData.friendsRequest.map((req: any) => ({
      _id: req._id,
      from: {
        _id: req.from?._id || "Unknown",
        username: req.from?.username || "Unknown",
      },
      status: req.status,
    }))
  : [];

setFriendRequests(formattedRequests);
    } catch (error) {
      console.error("Errore nel caricamento dei dati:", error);
    } finally {
      setLoading(false);
    }
  };

  // Chiamata a fetchData quando userID cambia
  useEffect(() => {
    fetchData();
  }, [userID]);

  // Aggiunta amico
  const handleAggiungiAmico = async () => {
    if (!userID || !friendName) return;
    try {
      const response = await fetch(`/api/aggiungi-amici`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json" // Assicurati che il content-type sia corretto
        },
        credentials: "include",
        body: JSON.stringify({ userID, friendName }) // Passa i dati correttamente
      });
  
      if (!response.ok) throw new Error("Errore nella richiesta");
  
      const data = await response.json();
      console.log("Richiesta di amicizia inviata:", data);
  
      // Dopo aver inviato una richiesta, aggiorna i dati
      fetchData();
    } catch (error) {
      console.error("Errore nell'aggiunta dell'amico:", error);
    }
  };

  // Accettare o rifiutare una richiesta di amicizia
  const handleRispondiRichiesta = async (requestID: string, risposta: "accettata" | "rifiutata") => {
    if (!userID) return;
    try {
        const response = await fetch(`/api/rispondi-amicizia`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userID, requestID, risposta }),
        });
        console.log("Invio risposta amicizia:", { userID, requestID, risposta });

        if (!response.ok) throw new Error("Errore nella risposta alla richiesta");

        const resData = await response.json();
        alert(resData.message);

        // 🔥 Rimuove subito la richiesta accettata/rifiutata dal frontend
        setFriendRequests(prevRequests => prevRequests.filter(req => req._id !== requestID));

        if (risposta === "accettata") {
            // 🔥 Se accettata, aggiunge l'amico alla lista
            const newFriend = friendRequests.find(req => req._id === requestID)?.from;
            if (newFriend) {
                setFriends(prevFriends => [...prevFriends, { username: newFriend.username, _id: newFriend._id }]);
            }
        }
    } catch (error) {
        console.error("Errore nella risposta alla richiesta di amicizia:", error);
    }
};

  return (
    <div>
      <h1>Friend Management</h1>

      <div>
        <input type="text" placeholder="Nome amico" value={friendName} onChange={(e) => setFriendName(e.target.value)} />
        <button onClick={handleAggiungiAmico}>Add Friend</button>
      </div>

      <div>
        <h2>Your friends:</h2>
        {loading ? (
          <p>Loading...</p>
        ) : friends.length === 0 ? (
          <p>No friends :/</p>
        ) : (
          <ul>
            {friends.map((f) => (
              <li key={f._id}>{f.username}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2>Received Friend Requests:</h2>
        {loading ? (
          <p>Loading...</p>
        ) : friendRequests.length === 0 ? (
          <p>No requests found :/</p>
        ) : (
          <ul>
            {friendRequests.map((r) => (
              <li key={r._id}>
                {r.from.username} - {r.status}
                {r.status === "attesa" && (
                  <div>
                    <button onClick={() => handleRispondiRichiesta(r._id, "accettata")}>Accetta</button>
                    <button onClick={() => handleRispondiRichiesta(r._id, "rifiutata")}>Rifiuta</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
        <button onClick={() => handleSelectOption('/menu')}>
          Return to the main Menu
        </button>
    </div>
  );
};

export default GestioneAmicizie;