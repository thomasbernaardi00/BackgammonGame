import React from "react";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { io, Socket } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import BoardBottom from "./frontend/BoardBottom";
import BoardTop from "./frontend/BoardTop";
import Game from "./logic/models/game";
import ThisTurn from "./logic/models/this-turn";
import ThisMove from "./logic/models/this-move";
import { toastStyle } from "./Client";

export const socket: Socket = io();

export const getUsername = (): string | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    return jwtDecode<{ username: string }>(token).username;
  } catch {
    console.error("Errore nella decodifica del token");
    return null;
  }
};

// Funzioni esportate per test
export const createTournament = () => {
  const username = getUsername();
  if (username) socket.emit("createTournament", username);
};

export const joinTournament = (id: string) => {
  const username = getUsername();
  if (username && id) socket.emit("joinTournament", id, username);
};

export const findTournament = () => {
  const username = getUsername();
  toast("Searching for a tournament...", {
    style: { borderRadius: "10px", background: "#333", color: "#fff" },
  });
  if (username) socket.emit("findTournament", username);
};

export const stopSearching = () => {
  const username = getUsername();
  toast("Stopped Searching...", {
    style: { borderRadius: "10px", background: "#333", color: "#fff" },
  });
  if (username) socket.emit("stopSearching", username);
};

export const handleGiveUp = (gameId: string | null, playerColor: string | null) => {
  if (!gameId || gameId === "null" || gameId.trim() === "") { // Migliore controllo
      console.warn("⚠️ [CLIENT] Tentativo di Give Up senza gameId valido.");
      return;
  }

  console.log(`🏳️ [CLIENT] Giocatore ${playerColor} si arrende. GameId: ${gameId}`);
  socket.emit("exitGame", gameId);
  toast(`${playerColor === "White" ? "Black" : "White"} wins by forfeit`);
};

const PaginaTornei: React.FC = () => {
  const navigate = useNavigate();
  const [game, setGame] = useState(Game.new);
  const [thisTurn, setThisTurn] = useState(ThisTurn.new);
  const [thisMove, setThisMove] = useState(ThisMove.new);
  const [playerColor, setPlayerColor] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [forceRender, setForceRender] = useState(0); // Stato per forzare il re-render
  const [inLobby, setInLobby] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [whiteTimeLeft, setWhiteTimeLeft] = useState<number>(0);
  const [blackTimeLeft, setBlackTimeLeft] = useState<number>(0);
  const isRanked = false;
  const gameDuration = 600;

  const startGame = () => {
    if (!error && gameId) {
      socket.emit("startGame", gameId, gameDuration, isRanked);
    } else {
      toast("Cannot start game. Please check if you are in a valid game.", {
        style: { background: "#333", color: "#fff" },
      });
    }
  };

  // Funzione rollare dadi
  const rollDice = () => {
    if (gameId && playerColor === thisTurn._turnPlayer._name) {
      socket.emit("rollDice", gameId);
    } else {
      toast("Wait for your turn or join a game first!", toastStyle(thisTurn));
    }
  };

  // Funzione per selezionare pedine e fare mosse
  const select = (index: number | string) => {
    if (gameId && playerColor === thisTurn._turnPlayer._name) {
      socket.emit("select", index, gameId);
    } else {
      toast("Wait for your turn or join a game first!", toastStyle(thisTurn));
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const username = decoded.username;
        if (username) {
          socket.emit("registerUsername", username);
        }
      } catch (error) {
        console.error("Errore nella decodifica del token", error);
      }
    }

    socket.on("connect", () => console.log("✅ [CLIENT] Connessione al server stabilita."));
    socket.on("showToast", ({ message, style }) => toast(message, style));

    socket.on("updateGameState", (newGameState) => {
      if (newGameState) {
        setGame(newGameState.game);
        setThisTurn(newGameState.thisTurn);
        setThisMove(newGameState.thisMove);
      }
    });

    socket.on("updateTimer", ({ color, timeLeft }) => {
      const newTime = timeLeft === -1 ? Infinity : timeLeft;
      if (color === "White") {
        setWhiteTimeLeft(newTime);
      } else {
        setBlackTimeLeft(newTime);
      }
    });

    socket.on("playerColor", (color: string) => {
      setPlayerColor(color);
      toast(`Il tuo colore è ${color}`);
    });

    socket.on("gameCreated", (newGameId: string) => {
      console.log(`🎮 [CLIENT] Ricevuto gameCreated con gameId: ${newGameId}`);
  
      if (!newGameId) {
          console.error("❌ [CLIENT] Errore: gameId ricevuto è null o undefined");
          return;
      }
  
      if (gameId === newGameId) {
          console.warn(`⚠️ [CLIENT] Il gameId ${newGameId} è già stato assegnato!`);
          return;
      }
  
      setGameId(newGameId);
      setForceRender((prev) => prev + 1); // 🔄 Forza un re-render
      console.log(`✅ [CLIENT] gameId aggiornato correttamente a: ${newGameId}`);
  
      setInLobby(false);
  
      // Conferma al server che il gameId è stato ricevuto
      socket.emit("gameCreatedConfirmed", newGameId);
      console.log("📡 [CLIENT] Inviata conferma di gameCreated al server.");
    });

    socket.on("error", (message: string) => {
      setError(message);
      setGameId(null);
      setInLobby(true);
    });

    socket.on("gameOver", ({ winner }) => {
      toast(`${winner} wins!`);
      
      console.log(`🏆 [CLIENT] Partita terminata, vincitore: ${winner}`);
  
      // Attendi qualche secondo per vedere se il server invia un nuovo gameCreated
      setTimeout(() => {
          if (!gameId) {
              console.warn("⚠️ [CLIENT] gameId ancora nullo dopo il gameOver. Forzando richiesta...");
              socket.emit("requestGameId");
          }
      }, 2000);
    });

    socket.on("tournamentCreated", (tournamentId: string) => {
      console.log(`📡 [CLIENT] Torneo creato con ID: ${tournamentId}`);
      toast(`Tournament created! ID: ${tournamentId}`);

      // Se vogliamo aggiornare lo stato:
      setGameId(tournamentId);
      setInLobby(false);
  });

    socket.on("tournamentEnded", (classifica) => {
      console.log("🏆 Torneo terminato! Classifica finale:", classifica);
      const classificaText = classifica
      .map((player, index) => `${index + 1}. ${player}`)
      .join("\n");
  
    // Mostra la classifica nel toast
    toast(`🏆 Tournament has ended! 🏆 \n Leaderboard:\n${classificaText}`, {
      duration: 6000, // Il toast resta visibile più a lungo
    });
      
      // Resetta lo stato e torna alla home
      setGameId(null);
      setGame(Game.new);
      setThisMove(ThisMove.new);
      setThisTurn(ThisTurn.new);
      setInLobby(true);
  });

    return () => {
      socket.off("updateGameState");
      socket.off("showToast");
      socket.off("connect");
      socket.off("playerColor");
      socket.off("gameCreated");
      socket.off("error");
      socket.off("updateTimer");
      socket.off("gameOver");
    };
  }, []);

  // Se il gameId non è stato aggiornato, forziamo una richiesta al server
  useEffect(() => {
    if (!gameId) {
        console.warn("⚠️ [CLIENT] gameId è nullo! Forzando richiesta al server...");
        socket.emit("requestGameId");

        setTimeout(() => {
            if (!gameId) {
                console.error("❌ [CLIENT] Il gameId è ancora nullo dopo 5 secondi!");
            }
        }, 5000);
    }
}, [gameId]);

  return (
    <>
      {inLobby ? (
        <div>
          <div>
            <h1>Welcome to Tournament mode!</h1>
            <h3>Select an option:</h3>
          </div>
          <div className="game-options">
            <button onClick={createTournament}>Create Tournament</button>
            <button onClick={() => joinTournament(prompt("Enter Tournament ID:") || "")}>
              Join Tournament
            </button>
            <button onClick={findTournament}>Find Tournament</button>
            <button onClick={stopSearching}>Stop Searching</button>
            <button onClick={() => navigate("/menu")}>Return to the main Menu</button>
          </div>
        </div>
      ) : (
        <div className="game">
          <h1>Backgammon Game</h1>
          <h3>Game ID: {gameId ? gameId : "Caricamento..."}</h3>
          <h3>You are {playerColor} player</h3>
          <BoardTop game={game} thisMove={thisMove} select={select} />
                    <BoardBottom
                      game={game}
                      thisMove={thisMove}
                      rollDice={rollDice}
                      startGame={startGame}
                      select={select}
                    />
          <button onClick={() => handleGiveUp(gameId, playerColor)}>Give Up</button>
        </div>
      )}
    </>
  );
};

export default PaginaTornei;
