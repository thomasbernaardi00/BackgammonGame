import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import "../index.css";
import { backgammon, startingGame } from "./logic/events/start-game";
import { rollingDice } from "./logic/events/roll-dice";
import { selecting } from "./logic/events/select";
import BoardBottom from "./frontend/BoardBottom";
import ThisTurn from "./logic/models/this-turn";
import Game from "./logic/models/game";
import ThisMove from "./logic/models/this-move";
import BoardTop from "./frontend/BoardTop";
import {
  checkCantMove,
  calcPossibleMoves,
} from "./logic/calculations/calc-possible-moves";
import { changeTurn } from "./logic/events/change-turn";
import { useNavigate } from "react-router-dom";

export const toastStyle = (thisTurn: ThisTurn) => {
  const position = thisTurn.turnPlayer.name === "White" ? "left" : "right";

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
    position: "top-left" as const, // posizione dinamica
  };
};

function Aiplayer() {
  const navigate = useNavigate();

  // Funzione per gestire la selezione dell'opzione
  const handleSelectOption = () => {
    const isGuest = localStorage.getItem("isGuest") === "true";
    navigate(isGuest ? "/GuestMenu" : "/menu");
};


  const [game, setGame] = useState(Game.new);
  const [thisTurn, setThisTurn] = useState(ThisTurn.new);
  const [thisMove, setThisMove] = useState(ThisMove.new);
  const [bot1Color, setBot1Color] = useState<string | null>(null);
  const [bot2Color, setBot2Color] = useState<string | null>(null);
  let timeout = 500; // per una partita più lenta alzalo a 500

  useEffect(() => {
    // Se è il turno del bot1, il bot1 gioca automaticamente
    if (thisTurn.turnPlayer.name === bot1Color) {
      playBotTurn(bot1Color);
    } else if (thisTurn.turnPlayer.name === bot2Color) {
      // Se è il turno del bot2, il bot2 gioca automaticamente
      playBotTurn(bot2Color);
    }
  }, [thisTurn]);

  function startGame() {
    const tempGame = Game.new();
    tempGame.gameOn = true;
    setGame(tempGame);

    // Assegna casualmente i colori ai bot
    const isBot1White = Math.random() < 0.5;
    setBot1Color(isBot1White ? "White" : "Black");
    setBot2Color(isBot1White ? "Black" : "White");

    const tempThisTurn = startingGame(game.clone());
    setThisTurn(tempThisTurn);

    const tempThisMove = ThisMove.new();
    setThisMove(tempThisMove);
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

  function playBotTurn(botColor: string | null) {
    if (!botColor || !game.gameOn) return;

    // 1. Controlla se i dadi sono stati lanciati
    if (!thisTurn.rolledDice) {
      setTimeout(() => {
        rollDice(); // Lancia i dadi
      }, timeout);
      return;
    }

    // 2. Se canGoTo è vuota allora deve ancora selezionare la pedina
    if (!thisMove.canGoTo || thisMove.canGoTo.length === 0) {
      let fromBarIdx: string | number;
      // se l'outbar è vuota allora scegli una delle pedine dentro alla board
      if (thisTurn.turnPlayer.outBar.length == 0) {
        // Trova i punti di partenza possibili
        const possibleStartingPoints: (number | string)[] = game.board
          .map((bar, index) =>
            bar.includes(thisTurn.turnPlayer.name) ? index : -1
          )
          .filter((index) => index !== -1);

        // Se il giocatore è nella fase "inTheEnd", aggiungi endBarIdx
        if (thisTurn.turnPlayer.inTheEnd) {
          const endBarIdx = thisTurn.turnPlayer.endBarIdx;
          // Aggiungi endBarIdx ai punti di partenza, se non è già presente
          if (!possibleStartingPoints.includes(thisTurn.turnPlayer.endBarIdx)) {
            possibleStartingPoints.push(thisTurn.turnPlayer.endBarIdx);
          }
        }

        setThisTurn(checkCantMove(game, thisTurn));

        // Scegli un punto di partenza casuale
        fromBarIdx =
          possibleStartingPoints[
            Math.floor(Math.random() * possibleStartingPoints.length)
          ];
      } else {
        // se outbar non è vuota allora i pezzi nell'outbar hanno priorità e devono essere cacciati
        fromBarIdx = thisTurn.turnPlayer.outBarIdx;
      }

      // Seleziona la pedina da spostare
      setTimeout(() => {
        select(fromBarIdx);
      }, timeout);
    } else {
      // Caso canGoTo non vuoto: il bot deve scegliere una destinazione
      // Scegli una destinazione casuale tra quelle disponibili
      const toBarIdx =
        thisMove.canGoTo[Math.floor(Math.random() * thisMove.canGoTo.length)];

      setTimeout(() => {
        select(toBarIdx);
      }, timeout);
    }
  }

  return (
    <>
      <div>
        <p>Bot1 Color: {bot1Color}</p>
        <p>Bot2 Color: {bot2Color}</p>
      </div>
      <BoardTop game={game} thisMove={thisMove} select={select} />

      <BoardBottom
        game={game}
        thisMove={thisMove}
        rollDice={rollDice}
        startGame={startGame}
        select={select}
      />
      <button onClick={() => handleSelectOption()}>
            Return to the main Menu
        </button>
    </>
  );
}

export default Aiplayer;
