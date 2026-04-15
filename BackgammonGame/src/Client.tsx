import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import "./Client.css";
import BoardBottom from "./frontend/BoardBottom";
import BoardTop from "./frontend/BoardTop";
import Game from "./logic/models/game";
import ThisTurn from "./logic/models/this-turn";
import ThisMove from "./logic/models/this-move";
import { Socket } from "socket.io-client";
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const socket: Socket = io();

export const toastStyle = (thisTurn: ThisTurn) => {
  return {
    style: {
      borderRadius: "10px",
      background: thisTurn._turnPlayer._name,
      color: thisTurn._opponentPlayer._name,
      border:
        thisTurn._turnPlayer._name === "White"
          ? "2px solid black"
          : "2px solid white",
    },
  };
};

function App() {
  const navigate = useNavigate();

  const [game, setGame] = useState(Game.new);
  const [thisTurn, setThisTurn] = useState(ThisTurn.new);
  const [thisMove, setThisMove] = useState(ThisMove.new);
  const [playerColor, setPlayerColor] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [inLobby, setInLobby] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // per la durata della partita
  const [gameDuration, setGameDuration] = useState<number>(-1); // -1 per Unlimited
  const [isRanked, setIsRanked] = useState(false);
  // Timer specifici per ogni giocatore
  const [whiteTimeLeft, setWhiteTimeLeft] = useState<number>(0); // Tempo del giocatore bianco
  const [blackTimeLeft, setBlackTimeLeft] = useState<number>(0); // Tempo del giocatore nero
  const [timerActive, setTimerActive] = useState(false); // Stato che indica se il timer è attivo

  // Inviti
  const [inviteUsername, setInviteUsername] = useState("");
  const [receivedInvites, setReceivedInvites] = useState<
    { inviterUsername: string; inviterSocketId: string; gameDuration: number }[]
  >([]);
  const [isInvitesVisible, setIsInvitesVisible] = useState(false);

  const [activeTab, setActiveTab] = useState<"invites" | "friends">("invites");
  // lista amici
  const [friends, setFriends] = useState<string[]>([]);

  useEffect(() => {
    // Blocca il tasto indietro del browser
    window.history.pushState(null, "", window.location.href); // Aggiunge una nuova entry nella cronologia
    window.onpopstate = (event) => {
      // Quando il tasto "indietro" viene premuto, non fare nulla
      event.preventDefault(); // Prevenire la navigazione indietro
      window.history.pushState(null, "", window.location.href); // Restituisce l'utente sulla stessa pagina
    };

    // Aggiungi la gestione della ricarica della pagina
    const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      // Chiedi conferma per ricaricare la pagina o uscire
      const confirmationMessage = "Sei sicuro di voler lasciare la pagina? La tua partita verrà terminata.";
      event.preventDefault(); // Prevenire l'azione predefinita (ricarica/chiusura)
      event.returnValue = confirmationMessage; // Mostra la finestra di conferma

      // Aggiungi la logica per chiamare handleGiveUp se l'utente conferma l'uscita
      setTimeout(() => {
        // Chiama handleGiveUp solo se l'utente conferma
        handleGiveUp();
      }, 100);
    };

    // Quando l'utente cerca di ricaricare o lasciare la pagina
    window.addEventListener("beforeunload", beforeUnloadHandler);

    // Pulizia degli eventi quando il componente viene smontato
    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
    };
  }, [navigate]);

  useEffect(() => {
    console.log("Connecting to server...");
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const username = decoded.username;
        if (username) {
          console.log(`Invio username al server: ${username}`);
          socket.emit("registerUsername", username);
          socket.emit("getFriends", username);
        } else {
          console.error("Username non trovato nel token");
        }
      } catch (error) {
        console.error("Errore nella decodifica del token", error);
      }
    } else {
      console.error("Token non trovato nel localStorage");
    }
    // Connessione al server
    socket.on("connect", () => {
      console.log("Connected to server", socket);
    });

    socket.on("showToast", ({ message, style }) => {
      toast(message, style);
    });

    socket.on("updateGameState", (newGameState) => {
      if (newGameState) {
        setGame(newGameState.game);
        setThisTurn(newGameState.thisTurn);
        setThisMove(newGameState.thisMove);
      }
    });

    socket.on("friendsList", (friendsList: string[]) => {
      setFriends(friendsList);
    });

    // Nella funzione che aggiorna il timer
    socket.on("updateTimer", ({ color, timeLeft }) => {
      const newTime = timeLeft === -1 ? Infinity : timeLeft;
      if (color === "White") {
        setWhiteTimeLeft(newTime);
      } else {
        setBlackTimeLeft(newTime);
      }
    });

    // Ricezione della durata del gioco
    socket.on("gameDuration", (duration: number) => {
      setGameDuration(duration);
      setWhiteTimeLeft(duration !== -1 ? duration : Infinity);
      setBlackTimeLeft(duration !== -1 ? duration : Infinity);
    });

    socket.on("playerColor", (color: string) => {
      setPlayerColor(color);
      console.log("colore del player:", color);
      toast(`Il tuo colore è ${color}`, toastStyle(thisTurn));
    });

    // Ricezione dell'ID di una nuova partita
    socket.on("gameCreated", (newGameId: string) => {
      setGameId(newGameId);
      setInLobby(false); // esci dalla lobby quando una partita viene creata
      toast(`New game created with ID: ${newGameId}`, {
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
    });

    socket.on("error", (message: string) => {
      setError(message);
      toast(`Error: ${message}`, {
        style: { borderRadius: "10px", background: "#ff4d4f", color: "#fff" },
      });

      setGameId(null);
      setInLobby(true);
    });

    socket.on(
      "receiveInvite",
      (inviterSocketId, gameDuration, inviterUsername) => {
        setReceivedInvites((prevInvites) => [
          ...prevInvites,
          { inviterUsername, inviterSocketId, gameDuration },
        ]);
      }
    );

    socket.on("gameOver", ({ winner }) => {
      toast(`${winner} wins!`, {
        style: { borderRadius: "10px", background: "#4CAF50", color: "#fff" },
      });

      // Resetta lo stato
      setGameId(null);
      setIsSearching(false);
      setGame(Game.new);
      setThisMove(ThisMove.new);
      setThisTurn(ThisTurn.new);
      setInLobby(true);

      // Naviga al menu principale
      navigate("/client");
    });

    // Pulizia degli eventi alla disconnessione
    return () => {
      socket.off("updateGameState");
      socket.off("showToast");
      socket.off("connect");
      socket.off("playerColor");
      socket.off("gameCreated");
      socket.off("error");
      socket.off("updateTimer");
      socket.off("gameDuration");
      socket.off("receiveInvite");
    };
  }, [socket]);

  // Funzione per unirsi a una partita esistente
  const joinGame = () => {
    if (isSearching) stopSearching();
    const id = prompt("Enter the Game ID to join:");
    if (id) {
      setGameId(id);
      socket.emit("joinGame", id);
      setInLobby(false);
    }
  };

  // Funzione per avviare la partita attuale
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

  // Funzione per cercare una partita tramite matchmaking
  const findGame = () => {
    console.log("Sending findGame request");
    socket.emit("findGame", { gameDuration, isRanked });
    setIsSearching(true);
    toast("Searching for a game...", {
      style: { borderRadius: "10px", background: "#333", color: "#fff" },
    });
  };

  // Funzione per smettere di cercare una partita
  const stopSearching = () => {
    console.log("stop searching");
    socket.emit("stopSearching");
    setIsSearching(false);
    toast("Stopped Searching...", {
      style: { borderRadius: "10px", background: "#333", color: "#fff" },
    });
  };

  const createGame = () => {
    if (isSearching) stopSearching();
    socket.emit("createGame", { duration: gameDuration });
  };

  // Funzione per convertire i secondi in formato mm:ss
  const formatTime = (seconds: number) => {
    if (seconds === Infinity) return "Unlimited";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  const handleInvite = (invitedUsername: string) => {
    socket.emit("sendInvite", invitedUsername, gameDuration);
  };

  const handleAcceptInvite = (
    inviterSocketId: string,
    gameDuration: number
  ) => {
    socket.emit("acceptInvite", inviterSocketId, gameDuration);
    setReceivedInvites((prevInvites) =>
      prevInvites.filter((invite) => invite.inviterSocketId !== inviterSocketId)
    );
  };

  const handleDeclineInvite = (index: number) => {
    setReceivedInvites((prevInvites) =>
      prevInvites.filter((_, i) => i !== index)
    );
  };

  const handleGiveUp = () => {
  
    const winnerColor = playerColor === "White" ? "Black" : "White";
  
   
    if (gameId) {
      
      socket.emit("exitGame", gameId);

      setGameId(null);
      setIsSearching(false);
      setGame(Game.new);
      setThisMove(ThisMove.new);
      setThisTurn(ThisTurn.new); 
      setInLobby(true); 
      toast(`${winnerColor} wins by forfeit`, {
        style: { borderRadius: "10px", background: "#4CAF50", color: "#fff" },
      });
      navigate("/client"); 
    }
  };
  

  return (
    <>
      {inLobby ? (
        <div className="lobby">
          <h1>Welcome to Backgammon Online!</h1>
          <h3>Select game options</h3>
          <div className="invites-container">
            <button
              className="toggle-invites-button"
              onClick={() => setIsInvitesVisible(!isInvitesVisible)}
            >
              {isInvitesVisible ? "Nascondi Inviti" : "Mostra Inviti"}
            </button>

            {isInvitesVisible && (
              <div className="invites-section">
                <div className="invites-nav">
                  <button
                    className={activeTab === "invites" ? "active" : ""}
                    onClick={() => setActiveTab("invites")}
                  >
                    Inviti Ricevuti
                  </button>
                  <button
                    className={activeTab === "friends" ? "active" : ""}
                    onClick={() => setActiveTab("friends")}
                  >
                    Amici
                  </button>
                </div>

                {activeTab === "invites" && (
                  <div className="invites-list">
                    {receivedInvites.length > 0 ? (
                      receivedInvites.map((invite, index) => (
                        <div key={index} className="invite">
                          <p>{invite.inviterUsername} ti ha invitato!</p>
                          <div className="invite-buttons">
                            <button
                              onClick={() =>
                                handleAcceptInvite(
                                  invite.inviterSocketId,
                                  invite.gameDuration
                                )
                              }
                            >
                              Accetta
                            </button>
                            <button onClick={() => handleDeclineInvite(index)}>
                              Rifiuta
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>Nessun invito ricevuto.</p>
                    )}
                  </div>
                )}

                {activeTab === "friends" && (
                  <div className="friends-list">
                    {friends.length > 0 ? (
                      friends.map((friend, index) => (
                        <div key={index} className="friend-item">
                          {friend}
                          <button onClick={() => handleInvite(friend)}>
                            Invita
                          </button>
                        </div>
                      ))
                    ) : (
                      <p>Nessun amico online.</p>
                    )}
                  </div>
                )}

                <div className="invite-player">
                  <input
                    type="text"
                    placeholder="Enter an username"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                  />
                  <button onClick={() => handleInvite(inviteUsername)}>
                    Invite Player
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="game-duration">
            <label>
              Choose game duration:
              <select
                value={gameDuration}
                onChange={(e) => setGameDuration(Number(e.target.value))}
              >
                <option value={-1}>Unlimited</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
                <option value={1200}>20 minutes</option>
                <option value={1800}>30 minutes</option>
              </select>
            </label>
          </div>

          <div className="game-mode">
            <label>
              Choose game mode:
              <select
                value={isRanked.toString()}
                onChange={(e) => setIsRanked(e.target.value === "true")}
              >
                <option value="true">Ranked</option>
                <option value="false">Casual</option>
              </select>
            </label>
          </div>

          <div className="game-options">
            <button onClick={createGame}>Create New Game</button>
            <button onClick={joinGame}>Join Existing Game</button>
            {!isSearching ? (
              <button onClick={findGame}>Find a Game</button>
            ) : (
              <button onClick={stopSearching}>Stop Searching</button>
            )}
          </div>

          <button onClick={() => navigate("/menu")}>
            Return to the main Menu
          </button>
        </div>
      ) : (
        <div className="game">
          <h1>Backgammon Game</h1>
          <h3>{gameId ? `Game ID: ${gameId}` : "No game selected"}</h3>
          <h3>You are {playerColor} player</h3>

          <div className="timer">
            <p>White Time Left: {formatTime(whiteTimeLeft)}</p>
            <p>Black Time Left: {formatTime(blackTimeLeft)}</p>
            <button onClick={() => handleGiveUp()}>Give Up</button>
          </div>

          <BoardTop game={game} thisMove={thisMove} select={select} />
          <BoardBottom
            game={game}
            thisMove={thisMove}
            rollDice={rollDice}
            startGame={startGame}
            select={select}
          />
        </div>
      )}
    </>
  );
}

export default App;
