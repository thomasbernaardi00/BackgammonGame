import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import "../index.css";
import { startingGame } from "./logic/events/start-game";
import { rollingDice } from "./logic/events/roll-dice";
import { selecting } from "./logic/events/select";
import BoardBottom from "./frontend/BoardBottom";
import ThisTurn from "./logic/models/this-turn";
import Game from "./logic/models/game";
import ThisMove from "./logic/models/this-move";
import BoardTop from "./frontend/BoardTop";
import { checkCantMove } from "./logic/calculations/calc-possible-moves";
import { changeTurn } from "./logic/events/change-turn";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

export const toastStyle = (thisTurn: ThisTurn) => {
  return {
    style: {
      borderRadius: "10px",
      background: thisTurn.turnPlayer.name,
      color: thisTurn.opponentPlayer.name,
      border:
        thisTurn.turnPlayer.name === "White"
          ? "2px solid black"
          : "2px solid white",
    },
  };
};



function PlayervsBot() {
  const navigate = useNavigate();

  // Funzione per gestire la selezione dell'opzione
  const handleSelectOption = () => {
    const isGuest = localStorage.getItem("isGuest") === "true";
    navigate(isGuest ? "/GuestMenu" : "/menu");
};

  const [game, setGame] = useState(Game.new);
  const [thisTurn, setThisTurn] = useState(ThisTurn.new);
  const [thisMove, setThisMove] = useState(ThisMove.new);

  // Variabili di stato per i colori
  const [botColor, setBotColor] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<string | null>(null);

  // Verifico presenza di guest
  const [isGuest, setIsGuest] = useState<boolean>(false);

  useEffect(() => {
    const guestStatus = localStorage.getItem("isGuest") === "true";
    setIsGuest(guestStatus);
  }, []);


  // partite salvate
  const [savedGames, setSavedGames] = useState<
    { _id: string; timestamp: string }[]
  >([]);

  const [isGameStarted, setIsGameStarted] = useState(false);

  useEffect(() => {
    if (!isGameStarted) {
      fetchSavedGames();
    } else if (thisTurn.turnPlayer.name === botColor) {
      playBotTurn();
    }
  }, [thisTurn]);

  async function fetchSavedGames() {
    try {
      const token = localStorage.getItem("token");
      let userId;

      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          userId = decoded.userId;
        } catch (error) {
          console.error("Errore nella decodifica del token", error);
          return;
        }
      } else {
        console.error("Token non trovato nel localStorage");
        return;
      }

      const response = await fetch("/api/saved-games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Errore:", errorData.message);
        toast.error(errorData.message);
      } else {
        const data = await response.json();
        console.log("Partite salvate:", data);
        setSavedGames(data);
      }
    } catch (error) {
      console.error("Errore nel caricamento delle partite salvate", error);
    }
  }

  const loadGame = async (gameId: string) => {
    try {
      const response = await fetch(`/api/saved-games/${gameId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Errore nel caricamento della partita."
        );
      }

      console.log("Dati ricevuti:", data);

      // Verifica che i dati contengano gameState, turnState e moveState
      if (!data.gameState || !data.turnState || !data.moveState) {
        throw new Error("Dati di gioco mancanti o corrotti.");
      }

      // Deserializzazione degli oggetti Game, ThisTurn, ThisMove
      const loadedGame = Game.fromJson(data.gameState);
      const loadedTurn = ThisTurn.fromJson(data.turnState);
      const loadedMove = ThisMove.fromJson(data.moveState);

      setGame(loadedGame);
      setThisTurn(loadedTurn);
      setThisMove(loadedMove);

      setBotColor(data.botColor || "White");
      setPlayerColor(data.playerColor || "Black");

      setIsGameStarted(true);
      console.log("Partita caricata con successo!");
    } catch (error) {
      console.error("Errore nel caricamento della partita:", error);
    }
  };

  const saveGameResult = async () => {
    if (isGuest) {
      toast.error("Guests cannot save games!");
      return;
    }
    const token = localStorage.getItem("token");
    let userId;

    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        userId = decoded.userId;
      } catch (error) {
        console.error("Errore nella decodifica del token", error);
        return;
      }
    } else {
      console.error("Token non trovato nel localStorage");
      return;
    }

    const gameData = {
      gameState: game.toJson(),
      turnState: thisTurn.toJson(),
      moveState: thisMove.toJson(),
      botColor,
      playerColor,
      userId,
    };

    console.log("Salvataggio dati:", gameData);

    try {
      const response = await fetch(`/api/save-game`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gameData),
      });

      if (!response.ok) throw new Error("Errore nel salvataggio");

      const responseData = await response.json();

      toast.success(responseData.message);
      fetchSavedGames();
    } catch (error) {
      toast.error("Impossibile salvare la partita.");
    }
  };

  const deleteGame = async (gameId: string) => {
    try {
      const response = await fetch(`/api/delete-game/${gameId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Errore nell'eliminazione della partita.");
      }

      toast.success("Partita eliminata con successo!");
      fetchSavedGames();
    } catch (error) {
      console.error("Errore:", error);
      toast.error("Impossibile eliminare la partita.");
    }
  };

  function startGame() {
    const tempGame = Game.new();
    tempGame.gameOn = true;
    setGame(tempGame);

    // Assegna casualmente i colori
    const isBotWhite = Math.random() < 0.5;
    setBotColor(isBotWhite ? "White" : "Black");
    setPlayerColor(isBotWhite ? "Black" : "White");

    const tempThisTurn = startingGame(game.clone());
    setThisTurn(tempThisTurn);

    const tempThisMove = ThisMove.new();
    setThisMove(tempThisMove);

    setIsGameStarted(true);
  }

  function rollDice() {
    if (thisTurn.rolledDice) {
      toast.error(
        `Play your move first
          ${thisTurn.turnPlayer.icon} 🎲 ${thisTurn.dices} 🎲`,
        toastStyle(thisTurn)
      );
      return;
    }

    let returnedThisTurn = rollingDice(thisTurn.clone());

    if (returnedThisTurn.rolledDice)
      returnedThisTurn = checkCantMove(game, returnedThisTurn.clone());

    setThisTurn(returnedThisTurn);
  }

  function select(index: number | string) {
    const [returnedGame, returnedThisTurn, returnedThisMove] = selecting(
      index,
      game.clone(),
      thisTurn.clone(),
      thisMove.clone()
    );

    setGame(returnedGame);
    setThisTurn(returnedThisTurn);
    setThisMove(returnedThisMove);
  }

  function playBotTurn() {
    if (!thisTurn.rolledDice) {
      setTimeout(() => {
        rollDice(); // Lancia i dadi
      }, 500); // Ritardo di mezzo secondo
      return;
    }

    if (!thisMove.canGoTo || thisMove.canGoTo.length === 0) {
      let fromBarIdx: string | number;
      if (thisTurn.turnPlayer.outBar.length == 0) {
        const possibleStartingPoints: number[] = game.board
          .map((bar, index) =>
            bar.includes(thisTurn.turnPlayer.name) ? index : -1
          )
          .filter((index) => index !== -1);
        if (possibleStartingPoints.length === 0) {
          toast.error(
            `${thisTurn.turnPlayer.icon} cannot move!`,
            toastStyle(thisTurn)
          );
          const newTurn = changeTurn(game.clone(), thisTurn.clone());
          setThisTurn(newTurn);
          return;
        }
        setThisTurn(checkCantMove(game, thisTurn));
        fromBarIdx =
          possibleStartingPoints[
            Math.floor(Math.random() * possibleStartingPoints.length)
          ];
      } else {
        fromBarIdx = thisTurn.turnPlayer.outBarIdx;
      }
      setTimeout(() => {
        select(fromBarIdx);
      }, 500); // Ritardo di mezzo secondo
    } else {
      const toBarIdx =
        thisMove.canGoTo[Math.floor(Math.random() * thisMove.canGoTo.length)];

      setTimeout(() => {
        select(toBarIdx);
      }, 500); // Ritardo di mezzo secondo
    }
  }

  return (
    <div>
      {!isGameStarted ? (
        <div>
          <h2>Select an option</h2>
          <button onClick={startGame}>New Game</button>
          {!isGuest && (
            <>
              <h3>Saved Games</h3>
              {savedGames.length > 0 ? (
                <ul>
                  {savedGames.map((g) => (
                    <li key={g._id}>
                      {new Date(g.timestamp).toLocaleString()}{" "}
                      {/* Mostra la data */}
                      <button onClick={() => loadGame(g._id)}>Load</button>
                      <button onClick={() => deleteGame(g._id)}>Eliminate</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No saved games found :/</p>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <BoardTop game={game} thisMove={thisMove} select={select} />
          <BoardBottom
            game={game}
            thisMove={thisMove}
            rollDice={rollDice}
            startGame={startGame}
            select={select}
          />
          {!isGuest && (
            <button onClick={saveGameResult}>
              Save Game
            </button>
          )}
        </>
      )}
      <button onClick={() => handleSelectOption()}>
        Return to the main Menu
      </button>
    </div>
  );
}


export default PlayervsBot;
