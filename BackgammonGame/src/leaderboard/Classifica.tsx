import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Player {
  username: string;
  score: number;
}

const Classifica: React.FC = () => {
  const navigate = useNavigate();

     // Funzione per gestire la selezione dell'opzione
     const handleSelectOption = (option: string) => {
        // Esegui la navigazione con navigate
        navigate(option);
    };

  const [classifica, setClassifica] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchClassifica = async () => {
      try {
        const response = await fetch("/api/classifica"); //URL corretto
        if (!response.ok) throw new Error("Errore nel caricamento della classifica");

        const data = await response.json();
        await setClassifica(data);
      } catch (error) {
        console.error("Errore nel caricamento della classifica:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClassifica();
  }, []);

  return (
    <div>
      <h2>🏆 LEADERBOARD 🏆</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {classifica.length > 0 ? (
            classifica.map((player, index) => (
              <li key={index}>
                #{index + 1} <strong>{player.username}</strong> - {player.score} points
              </li>
            ))
          ) : (
            <p>No player found :/</p>
          )}
        </ul>
      )}
      <div>
        <button onClick={() => handleSelectOption('/menu')}>
            Return to the main Menu
        </button>
      </div>
    </div>
    
     
  );
};

export default Classifica;
