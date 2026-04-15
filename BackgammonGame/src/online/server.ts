import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import Game from '../logic/models/game';
import express, { Response, Request } from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import ThisTurn from '../logic/models/this-turn';
import ThisMove from '../logic/models/this-move';
import { startingGame } from '../logic/events/start-game';
import { rollingDice } from '../logic/events/roll-dice';
import { checkCantMove } from '../logic/calculations/calc-possible-moves';
import { selecting } from '../logic/events/select';
import logrouter from '../login/logreg';
import dotenv from "dotenv";
import login from '../login/logreg';
import { celebrateGameEnd } from '../logic/events/end-game';
import path from 'path';
import { fileURLToPath } from 'url';
import friendrouter from '../login/amicizia';
import classificaRouter from '../leaderboard/classificaback';
import userRouter from '../login/userpageback';
import saverouter from '../AI/save-game';
import User from '../login/user';
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import mongoose, { ObjectId } from 'mongoose';
import { randomUUID } from "crypto";


process.on("uncaughtException", (err) => {
  console.error("❌ ERRORE CRITICO: uncaughtException", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ ERRORE CRITICO: unhandledRejection", reason);
});


const __dirname = path.resolve();

dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server);

app.get(
  "/share/:username",
  async (req: Request<{ username: string }>, res: Response): Promise<void> => {
    try {
      console.log(`🔍 Ricevuta richiesta per /share/${req.params.username}`);

      const user = await User.findOne({ username: req.params.username });

      if (!user) {
        console.warn(`⚠️ Utente ${req.params.username} non trovato.`);
        res.status(404).send("User not found");
        return;
      }

      res.setHeader("Content-Type", "text/html");
      res.send(`
        <!DOCTYPE html>
        <html lang="it">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta property="og:title" content="${user.username} ha raggiunto ${user.score} punti! Riesci a batterlo?" />
            <meta property="og:url" content="https://backgammongame.ddns.net/share/${encodeURIComponent(user.username)}?t=${Date.now()}" />
            <meta property="og:type" content="website" />
            <meta property="fb:app_id" content="634522869154788" />
            <title>Condividi il tuo punteggio!</title>
            <script>
            console.log("🔄 Reindirizzamento immediato...");
            window.location.href = "https://backgamongame.ddns.net";
          </script>

        </head>
        <body>
          
        <h1>CONDIVIDI IL TUO PUNTEGGIO SU FACEBOOK!</h1>
        <p>Reindirizzamento in corso...</p>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("❌ Errore nel generare la pagina di condivisione:", error);
      res.status(500).send("Errore del server");
    }
  }
);




// Serve i file statici del frontend
const frontendPath = path.join(__dirname, `/dist`);
app.use(express.static(frontendPath));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionMiddleware = session({
  secret: "your-secret-key", // Cambia con una chiave segreta sicura
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority&authSource=admin`,

  }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
});

app.use(sessionMiddleware);

// Monta il router di login
app.use("/api", logrouter);
app.use("/api", login);
// Router per amicizia
app.use("/api", friendrouter);
// Route per classifica
app.use("/api", classificaRouter);
// Route per userpage
app.use("/api", userRouter);
//route per le partite salvate
app.use("/api", saverouter);




// Route fallback per il frontend
app.get("*", (req, res) => {
  if (!req.originalUrl.startsWith("/api/")) {  // Evita di intercettare le API
    res.sendFile(path.join(frontendPath, "index.html"));
  } else {
    res.status(404).json({ message: "API non trovata" });
  }
});



// Configurazione della sessione


// Condividi la sessione con WebSocket
io.use((socket, next) => {
  sessionMiddleware(socket.request as express.Request, {} as express.Response, next as express.NextFunction);
});

// Stampo su console le api disponibili
app._router.stack.forEach((middleware: any) => {
  if (middleware.route) { // Route "normali"
    console.log(`📌 API disponibile: ${middleware.route.path}`);
  } else if (middleware.name === "router") { // Route nei Router Express
    middleware.handle.stack.forEach((route: any) => {
      if (route.route) {
        console.log(`📌 API disponibile: ${route.route.path}`);
      }
    });
  }
});

const games: {
  [gameId: string]: {
    game: Game;
    thisTurn: ThisTurn;
    thisMove: ThisMove;
    players: { white: Socket | null; black: Socket | null };
    GameDuration: number;
    isRanked: boolean;
    timers: { White: NodeJS.Timeout | null; Black: NodeJS.Timeout | null };
    timeLeft: { White: number; Black: number };
  };
} = {};


export interface Player extends Socket {
  gameDuration: number;
  isRanked: boolean;
}

export const waitingPlayers: Player[] = [];
export const connectedUsers: { [username: string]: Socket } = {};
const gamePlayerIds: { [gameId: string]: { white: mongoose.Types.ObjectId; black: mongoose.Types.ObjectId } } = {};
//funzione per prendere userid
async function getUserIdByUsername(username: string) {
  const user = await User.findOne({ username }).select("_id"); // Recupera solo l'ID
  return user ? user._id : null;
}

export async function matchmakePlayer() {
  console.log("🎯 Inizio matchmaking, giocatori in attesa:", waitingPlayers.length);

  // Raggruppiamo i giocatori per durata e modalità (Ranked/Casual)
  const groupedPlayers: { [key: number]: { ranked: Player[]; casual: Player[] } } = {};

  // Classifica i giocatori in base alla durata e alla modalità
  waitingPlayers.forEach(player => {
    if (!player.gameDuration) {
      console.error(`❌ Giocatore ${player.id} non ha una durata valida, rimosso dalla coda.`);
      return;
    }

    if (!groupedPlayers[player.gameDuration]) {
      groupedPlayers[player.gameDuration] = { ranked: [], casual: [] };
    }

    if (player.isRanked) {
      groupedPlayers[player.gameDuration].ranked.push(player);
    } else {
      groupedPlayers[player.gameDuration].casual.push(player);
    }
  });

  console.log("📊 Giocatori raggruppati per durata e modalità:", groupedPlayers);

  // Esegui matchmaking per ogni gruppo
  for (const duration in groupedPlayers) {
    const { ranked, casual } = groupedPlayers[Number(duration)];

    console.log(`🔎 Tentativo di matchmaking per durata ${duration}`);

    // Matchmaking per partite ranked
    while (ranked.length >= 2) {
      const player1 = ranked.shift()!;
      const player2 = ranked.shift()!;

      const player1Username = Object.keys(connectedUsers).find(
        (key) => connectedUsers[key] === player1
      );
      const player2Username = Object.keys(connectedUsers).find(
        (key) => connectedUsers[key] === player2
      );
      const player1Db = await User.findOne({ username: player1Username });
      const player2Db = await User.findOne({ username: player2Username });

      if (!player1Db || !player2Db) {
        console.error(`❌ ERRORE CRITICO: Uno dei due giocatori non è registrato nel database!`);
        return;
      }

      const player1Id = player1Db._id;
      const player2Id = player2Db._id;

      // Creazione partita
      const gameId = `game-${randomUUID()}`;
      const game = Game.new();

      games[gameId] = {
        game,
        thisTurn: startingGame(game.clone(), io, gameId),
        thisMove: ThisMove.new(),
        players: { white: player1, black: player2 },
        GameDuration: Number(duration),
        isRanked: true,
        timers: { White: null, Black: null },
        timeLeft: { White: Number(duration), Black: Number(duration) },
      };

      player1.join(gameId);
      player2.join(gameId);
      gamePlayerIds[gameId] = {
        white: new mongoose.Types.ObjectId(player1Id),
        black: new mongoose.Types.ObjectId(player2Id),
      };

      console.log("mongoose id white and black", gamePlayerIds[gameId].white, gamePlayerIds[gameId].black);

      console.log(`✅ Partita creata: ${gameId} | Ranked: TRUE | ${player1.id} (White) vs ${player2.id} (Black)`);

      player1.emit("gameCreated", gameId);
      player2.emit("gameCreated", gameId);
      player1.emit("playerColor", "White");
      player2.emit("playerColor", "Black");
      player1.emit("gameDuration", Number(duration));
      player2.emit("gameDuration", Number(duration));
    }

    // Matchmaking per partite casual
    while (casual.length >= 2) {
      const player1 = casual.shift()!;
      const player2 = casual.shift()!;

      const player1Username = Object.keys(connectedUsers).find(
        (key) => connectedUsers[key] === player1
      );
      const player2Username = Object.keys(connectedUsers).find(
        (key) => connectedUsers[key] === player2
      );
      const player1Db = await User.findOne({ username: player1Username });
      const player2Db = await User.findOne({ username: player2Username });

      if (!player1Db || !player2Db) {
        console.error(`❌ ERRORE CRITICO: Uno dei due giocatori non è registrato nel database!`);
        return;
      }

      const player1Id = player1Db._id;
      const player2Id = player2Db._id;

      // Creazione partita
      const gameId = `game-${randomUUID()}`;
      const game = Game.new();

      games[gameId] = {
        game,
        thisTurn: startingGame(game.clone(), io, gameId),
        thisMove: ThisMove.new(),
        players: { white: player1, black: player2 },
        GameDuration: Number(duration),
        isRanked: false,
        timers: { White: null, Black: null },
        timeLeft: { White: Number(duration), Black: Number(duration) },
      };

      player1.join(gameId);
      player2.join(gameId);
      gamePlayerIds[gameId] = {
        white: new mongoose.Types.ObjectId(player1Id),
        black: new mongoose.Types.ObjectId(player2Id),
      };

      console.log("mongoose id white and black", gamePlayerIds[gameId].white, gamePlayerIds[gameId].black);

      console.log(`✅ Partita creata: ${gameId} | Ranked: FALSE | ${player1.id} (White) vs ${player2.id} (Black)`);

      player1.emit("gameCreated", gameId);
      player2.emit("gameCreated", gameId);
      player1.emit("playerColor", "White");
      player2.emit("playerColor", "Black");
      player1.emit("gameDuration", Number(duration));
      player2.emit("gameDuration", Number(duration));
    }
  }

  // Aggiorna la lista d'attesa con i giocatori non abbinati
  waitingPlayers.length = 0;
  for (const duration in groupedPlayers) {
    waitingPlayers.push(...groupedPlayers[Number(duration)].ranked);
    waitingPlayers.push(...groupedPlayers[Number(duration)].casual);
  }

  console.log("⏳ Giocatori rimanenti in coda:", waitingPlayers.map(player => player.id));
}





function rollDice(socket: Socket, gameId: string) {
  const gameData = games[gameId];

  if (!gameData || gameData.thisTurn._rolledDice) return;

  let returnedThisTurn = rollingDice(gameData.thisTurn.clone(), io, gameId);
  if (returnedThisTurn._rolledDice) {
    returnedThisTurn = checkCantMove(gameData.game, returnedThisTurn.clone(), io, gameId);
  }
  gameData.thisTurn = returnedThisTurn;
  io.to(gameId).emit('updateGameState', {
    game: gameData.game,
    thisMove: gameData.thisMove,
    thisTurn: gameData.thisTurn
  });
}

function startGame(gameId: string, GameDuration: number, isRanked: boolean) {
  console.log(`🔍 [startGame] Ricevuto: gameId=${gameId}, GameDuration=${GameDuration}, isRanked=${isRanked}`);

  console.log(`startGame chiamata per gioco: ${gameId}`);
  const game = Game.new();
  game._gameOn = true;

  games[gameId].game = game;
  games[gameId].thisTurn = startingGame(game.clone(), io, gameId);
  games[gameId].thisMove = ThisMove.new();
  games[gameId].GameDuration = GameDuration;
  games[gameId].isRanked = isRanked;
  games[gameId].timeLeft = { White: GameDuration, Black: GameDuration };

  const thisturnplayer = games[gameId].thisTurn._turnPlayer._name === "White" ? "White" : "Black";
  io.to(gameId).emit("updateGameState", {
    game: games[gameId].game,
    thisMove: games[gameId].thisMove,
    thisTurn: games[gameId].thisTurn
  });
  startTurnTimer(gameId, thisturnplayer);
}


export function startTurnTimer(gameId: string, color: "White" | "Black") {
  console.log(`startTurnTimer chiamato per gioco ${gameId}, giocatore: ${color}`);

  const gameData = games[gameId];
  if (!gameData || !gameData.game._gameOn) {
    console.error(`Gioco ${gameId} non trovato o già terminato`);
    return;
  }

  const opponentColor = color === "White" ? "Black" : "White";

  // Cancella eventuali timer già attivi per evitare conflitti
  if (gameData.timers[color]) {
    console.log(`Cancello il timer precedente per ${color}`);
    clearInterval(gameData.timers[color]!);
    gameData.timers[color] = null;
  }

  // Verifica se il tempo rimanente è illimitato
  if (gameData.timeLeft[color] === -1) {
    console.log(`Il tempo per ${color} è illimitato, non avvio il timer`);
    return;
  }

  // Avvia un nuovo timer
  gameData.timers[color] = setInterval(() => {
    if (!gameData.game._gameOn) {
      clearInterval(gameData.timers[color]!);
      gameData.timers[color] = null;
      return;
    }

    if (gameData.thisTurn._turnPlayer._name !== color) {
      return;
    }

    const timeLeft = gameData.timeLeft[color];

    if (timeLeft > 0) {
      gameData.timeLeft[color] -= 1;

      // Emetti l'evento per aggiornare il client
      // Nel server, quando trasmetti il tempo
      io.to(gameId).emit("updateTimer", {
        color,
        timeLeft: gameData.timeLeft[color] !== Infinity ? gameData.timeLeft[color] : -1,
      });


      console.log(`Tempo aggiornato per ${color}: ${gameData.timeLeft[color]}`);

    } else if (timeLeft === 0) {
      clearInterval(gameData.timers[color]!);
      gameData.timers[color] = null;
      console.log(`Chiamata a endGame per ${gameId} con vincitore ${opponentColor}`);
      endGame(gameId, opponentColor);
    }
  }, 1000);
}

export async function endGame(gameId: string, winnerColor: "White" | "Black") {
  const gameData = games[gameId];
  if (!gameData) return;

  gameData.game._gameOn = false;
  celebrateGameEnd(gameData.thisTurn, io, gameId, winnerColor);

  console.log(`🔍 [endGame] Stato attuale della partita prima di eliminazione: ${gameData.isRanked}`);

  console.log(`🔍 Debug partita ${gameId} prima di determinare il vincitore`);
  const winnerId = gamePlayerIds[gameId]?.[winnerColor.toLowerCase() as "white" | "black"];
  const loserId = gamePlayerIds[gameId]?.[winnerColor === "White" ? "black" : "white"];
  console.log("mongoose objectId of the winner", winnerId);
  console.log("mongoose objectId of the winner", loserId);

  if (isTournamentGame(gameId)) notifyGameEnd(gameId, winnerColor);
  io.to(gameId).emit("gameOver", { winner: winnerColor });

  if (gameData.timers.White) {
    clearInterval(gameData.timers.White);
    gameData.timers.White = null;
  }
  if (gameData.timers.Black) {
    clearInterval(gameData.timers.Black);
    gameData.timers.Black = null;
  }

  console.log(`🏆 Game ${gameId} terminato. Vincitore: ${winnerId} (${winnerColor}), perdente: ${loserId}`);
  console.log(`🔄 Tentativo di aggiornamento score per ${winnerId} e ${loserId}`);
  console.log(`📌 isRanked = ${gameData.isRanked}`);

  if (gameData.isRanked) {
    try {
      console.log(`🔄 Aggiornamento score: Vincitore (${winnerId}) +100 | Perdente (${loserId}) -25`);
      await updatePlayerScore(new mongoose.Types.ObjectId(winnerId), 100);
      await updatePlayerScore(new mongoose.Types.ObjectId(loserId), -25);
    } catch (error) {
      console.error(`❌ Errore nell'aggiornamento dello score: ${error}`);
    }
  } else {
    console.log(`⚠️ Partita non Ranked, nessun aggiornamento del punteggio.`);
  }

  delete games[gameId];
  delete gamePlayerIds[gameId];
  console.log(`🗑️ Partita ${gameId} eliminata correttamente. Vincitore: ${winnerColor}`);

}

export async function updatePlayerScore(userId: mongoose.Types.ObjectId, points: number) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ Utente ${userId} non trovato nel database.`);
      return;
    }

    // Aggiorniamo lo score, evitando punteggi negativi
    user.score = Math.max(0, user.score + points);
    await user.save();
    
    console.log(`🔄 Score aggiornato: ${user.username} → ${user.score} punti`);
  } catch (error) {
    console.error(`❌ Errore nell'aggiornamento dello score per ${userId}: ${error}`);
    return null;
  }
}


function select(index: number | string, socket: Socket, gameId: string) {
  const gameData = games[gameId];
  if (!gameData) return;

  const [updatedGame, updatedTurn, updatedMove] = selecting(
    index,
    gameData.game.clone(),
    gameData.thisTurn.clone(),
    gameData.thisMove.clone(),
    socket,
    io,
    gameId
  );

  gameData.game = updatedGame;
  gameData.thisTurn = updatedTurn;
  gameData.thisMove = updatedMove;

  io.to(gameId).emit("updateGameState", {
    game: gameData.game,
    thisMove: gameData.thisMove,
    thisTurn: gameData.thisTurn
  });
}

//TORNEI
const tournaments: {
  [tournamentId: string]: {
    status: string; // 'waiting', 'ready', 'in-progress', 'completed'
    players: { username: string | null; socket: Socket | null }[];
    matches: {
      gameId: string;
      round: number;
      players: { White: string | null; Black: string | null };
      winner: string | null;
      loser: string | null;
    }[];
  };
} = {};

export const waitingTnPlayers: { username: string, socket: Socket }[] = [];

function isTournamentGame(gameId: string): boolean {
  return Object.values(tournaments).some(tournament =>
    tournament.matches.some(m => m.gameId === gameId)
  );
}

function tournamentOver(tournament: typeof tournaments[string]) {
  if (tournament.matches.length !== 4 || tournament.matches.some(m => !m.winner)) return false;
  else return true;
}

function readyToStart(tournament: typeof tournaments[string]) {
  if (tournament.players.length === 4 && tournament.players.every(p => p.socket !== null && p.username !== null)) return true;
  else {
    console.log("il torneo non può partire");
    return false;
  }
}

//crea i game per i tornei
function createGameForT(player1: Socket, player2: Socket): string {
  const gameId = `game-${randomUUID()}`;
  const game = Game.new();

  games[gameId] = {
    game,
    thisTurn: startingGame(game.clone(), io, gameId),
    thisMove: ThisMove.new(),
    players: { white: player1, black: player2 },
    GameDuration: Number(600),
    isRanked: false,
    timers: { White: null, Black: null },
    timeLeft: { White: Number(600), Black: Number(600) },
  };

  player1.join(gameId);
  player2.join(gameId);

  // Debug: Verifica invio dell'evento
  console.log(`📡 [SERVER] Inviando evento gameCreated a ${player1.id} e ${player2.id} con gameId: ${gameId}`);

  player1.emit("gameCreated", gameId);
  player2.emit("gameCreated", gameId);

  player1.emit("playerColor", "White");
  player2.emit("playerColor", "Black");

  player1.emit("gameDuration", Number(600));
  player2.emit("gameDuration", Number(600));

  // Attesa conferma lato client
  player1.once("gameCreatedConfirmed", (receivedGameId) => {
    console.log(`✅ [SERVER] Conferma ricevuta da ${player1.id}: gameId = ${receivedGameId}`);
  });

  player2.once("gameCreatedConfirmed", (receivedGameId) => {
    console.log(`✅ [SERVER] Conferma ricevuta da ${player2.id}: gameId = ${receivedGameId}`);
  });

  return gameId;
}



//esegue il tournament making
function tnmake() {
  console.log("Match dei giocatori del torneo:");

  while (waitingTnPlayers.length >= 4) {
    const player1 = waitingTnPlayers.shift();
    const player2 = waitingTnPlayers.shift();
    const player3 = waitingTnPlayers.shift();
    const player4 = waitingTnPlayers.shift();

    if (player1 && player2 && player3 && player4) {
      const tournamentId = `tournament-${randomUUID()}`;

      tournaments[tournamentId] = {
        status: "ready",
        players: [player1, player2, player3, player4],
        matches: [],
      };

      player1.socket.join(tournamentId);
      player2.socket.join(tournamentId);
      player3.socket.join(tournamentId);
      player4.socket.join(tournamentId);
      player1.socket.emit("tournamentCreated", tournamentId);
      player2.socket.emit("tournamentCreated", tournamentId);
      player3.socket.emit("tournamentCreated", tournamentId);
      player4.socket.emit("tournamentCreated", tournamentId);

      console.log("torneo creato con ID: " + tournamentId);
      if (readyToStart(tournaments[tournamentId])) startTournament(tournamentId);
    }
  }
}

//fa partire il torneo
function startTournament(tournamentId: string) {
  const tournament = tournaments[tournamentId];
  const pairs: [{ username: string; socket: Socket }, { username: string; socket: Socket }][] = [];
  tournament.status = 'in-progress';

  if (!tournament) return;
  else {

    const nNullp = tournament.players as { username: string; socket: Socket }[];
    for (let i = 0; i < nNullp.length; i += 2) {
      pairs.push([nNullp[i], nNullp[i + 1]]);
    }

    pairs.forEach((pair) => {
      const gameId = createGameForT(pair[0].socket, pair[1].socket)
      console.log("startTournament: game creato, gameID: " + gameId + " white: " + pair[0].username + ", black: " + pair[1].username);
      tournament.matches.push({
        gameId,
        round: 1,
        players: { White: pair[0].username, Black: pair[1].username },
        winner: null,
        loser: null,
      });

    });
  }

}

//gestisce i turni e i game del torneo
function handleProgress(tournamentId: string) {
  const tournament = tournaments[tournamentId];

  if (!tournament) {
    console.error(`❌ ERRORE: Torneo ${tournamentId} non trovato!`);
    return;
  }

  // Caso in cui il torneo è completato
  if (tournamentOver(tournament) && tournament.status !== "completed") {
    tournament.status = "completed";
    const round1 = tournament.matches.filter(m => m.round === 1);
    const round2 = tournament.matches.filter(m => m.round === 2);
    const classifica: string[] = [];

    tournament.players.forEach(p => {
      if (round1.some(m => m.winner === p.username) && round2.some(m => m.winner === p.username)) {
        classifica[0] = p.username as string;
      } else if (round1.some(m => m.winner === p.username) && round2.some(m => m.loser === p.username)) {
        classifica[1] = p.username as string;
      } else if (round1.some(m => m.loser === p.username) && round2.some(m => m.winner === p.username)) {
        classifica[2] = p.username as string;
      } else {
        classifica[3] = p.username as string;
      }
    });

    console.log(`🏆 Classifica finale:`, classifica);
    io.to(tournamentId).emit("tournamentEnded", classifica);
    delete tournaments[tournamentId];
    return;
  }

  // Controlla se tutte le partite del primo turno sono terminate
  if (tournament.matches.every(m => m.round === 1 && m.winner !== null)) {
    console.log(`🔄 Avanzamento al secondo round del torneo`);

    const winners = tournament.players.filter(player =>
      tournament.matches.some(match => match.winner === player.username)
    );

    const losers = tournament.players.filter(player =>
      tournament.matches.some(match => match.loser === player.username)
    );

    console.log("🔍 Debug winners:", winners.map(p => p.username));
    console.log("🔍 Debug losers:", losers.map(p => p.username));

    // Verifica che ci siano esattamente 2 vincitori e 2 perdenti
    if (winners.length !== 2 || losers.length !== 2) {
      console.error("❌ ERRORE: Numero di vincitori o perdenti errato!");
      return;
    }

    // Controlla che tutti i vincitori abbiano un socket valido
    if (winners.some(w => !w.socket)) {
      console.error("❌ ERRORE: Un vincitore non ha un socket valido!");
      return;
    }

    // Controlla che tutti i perdenti abbiano un socket valido
    if (losers.some(l => !l.socket)) {
      console.error("❌ ERRORE: Un perdente non ha un socket valido!");
      return;
    }

    // Creazione partita tra i vincitori
    const gameIdWinners = createGameForT(winners[0].socket as Socket, winners[1].socket as Socket);
    console.log(`🏆 Partita tra vincitori creata: ${gameIdWinners}`);
    tournament.matches.push({
      gameId: gameIdWinners,
      round: 2,
      players: { White: winners[0].username, Black: winners[1].username },
      winner: null,
      loser: null,
    });

    // Creazione partita tra i perdenti
    const gameIdLosers = createGameForT(losers[0].socket as Socket, losers[1].socket as Socket);
    console.log(`⚔️ Partita tra perdenti creata: ${gameIdLosers}`);
    tournament.matches.push({
      gameId: gameIdLosers,
      round: 2,
      players: { White: losers[0].username, Black: losers[1].username },
      winner: null,
      loser: null,
    });

  } else {
    console.log("⌛ Alcune partite del primo turno sono ancora in corso.");
  }
}

export function notifyGameEnd(gameId: string, winnerColor: "White" | "Black") {
  if (isTournamentGame(gameId)) {
    console.log("notifyfunction: partita di torneo, gameID: " + gameId);
    const keys = Object.keys(tournaments);
    const index = keys.findIndex((id) =>
      tournaments[id].matches.some((m) => m.gameId === gameId)
    );

    if (index === -1) return;

    const tournamentId = keys[index];
    const tournament = tournaments[tournamentId];

    const match = tournament.matches.find((m) => m.gameId === gameId);
    if (match) {
      match.winner = match.players[winnerColor];
      match.loser = match.players.White === match.winner ? match.players.Black : match.players.White;
      console.log("notifyfunction: tournamentId: " + tournamentId + " match trovato, vincitore: " + match.winner + ", perdente: " + match.loser);
    }
    handleProgress(tournamentId);
  }
  else console.log("notifyfunction: partita non di un torneo");
}

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Registra l'username quando il client lo invia
  socket.on("registerUsername", (username) => {
    console.log(`Registrazione username: ${username} con socket ID: ${socket.id}`);
    connectedUsers[username] = socket; // Memorizza l'username e il socket
    console.log(`Utenti connessi:`, Object.keys(connectedUsers)); // Stampa gli utenti connessi
  });

  // Gestisci l'invito
  socket.on("sendInvite", (invitedUsername, gameDuration) => {
    console.log(`Tentativo di invitare ${invitedUsername}`);
    console.log(`Utenti connessi:`, Object.keys(connectedUsers));

    const invitedSocket = connectedUsers[invitedUsername];
    if (invitedSocket && invitedSocket.connected) {
      console.log(`Socket trovato per ${invitedUsername}`);
      const inviterUsername = Object.keys(connectedUsers).find(username => connectedUsers[username].id === socket.id);
      invitedSocket.emit("receiveInvite", socket.id, gameDuration, inviterUsername);
    } else {
      console.log(`Socket non trovato per ${invitedUsername}`);
      socket.emit("error", "User not found or not connected");
    }
  });

  socket.on('receiveInvite', (inviterSocketId, gameDuration, inviterUsername) => {
    console.log(`Invito ricevuto da ${inviterUsername}, durata del gioco: ${gameDuration} minuti`);

    // Chiedi al giocatore se vuole accettare
    const accept = confirm(`Hai ricevuto un invito da ${inviterUsername} per una partita di durata ${gameDuration} minuti. Accetti?`);

    // Emittiamo la risposta del giocatore
    if (accept) {
      socket.emit("acceptInvite", inviterSocketId, gameDuration);
    } else {
      console.log("Invito rifiutato");
    }
  });


  socket.on("acceptInvite", (inviterSocketId, gameDuration, isRanked) => {
    const inviterSocket = io.sockets.sockets.get(inviterSocketId);
    if (inviterSocket) {
      const gameId = `game-${randomUUID()}`;
      const sanitizedDuration = gameDuration > 0 ? gameDuration : -1;

      games[gameId] = {
        game: Game.new(),
        thisTurn: ThisTurn.new(),
        thisMove: ThisMove.new(),
        players: { white: inviterSocket, black: socket },
        GameDuration: sanitizedDuration,
        isRanked: false,
        timers: { White: null, Black: null },
        timeLeft: {
          White: sanitizedDuration !== -1 ? sanitizedDuration : Infinity,
          Black: sanitizedDuration !== -1 ? sanitizedDuration : Infinity,
        },
      };

      inviterSocket.join(gameId);
      socket.join(gameId);

      inviterSocket.emit("gameCreated", gameId);
      socket.emit("gameCreated", gameId);

      inviterSocket.emit("playerColor", "White");
      socket.emit("playerColor", "Black");

      inviterSocket.emit("gameDuration", sanitizedDuration);
      socket.emit("gameDuration", sanitizedDuration);

      console.log(`Game ${gameId} created by invite between ${inviterSocket.id} and ${socket.id}`);
    } else {
      socket.emit("error", "Inviter not found or not connected");
    }
  });

  socket.on("getFriends", async (username: string) => {
    try {
      const user = await User.findOne({ username })
        .populate("friends", "username") // Popola solo il campo "username" degli amici
        .exec();

      if (user && user.friends) {
        const friendUsernames = user.friends
          .map((friend: any) => friend.username)
          .filter((friendUsername: string) => connectedUsers.hasOwnProperty(friendUsername)); // filtra solo gli amici online

        socket.emit("friendsList", friendUsernames);
      } else {
        socket.emit("friendsList", []);
      }
    } catch (error) {
      console.error("Errore nel recupero amici:", error);
      socket.emit("friendsList", []);
    }
  });




  socket.on("createGame", ({ duration, isRanked = false }) => {
    const gameId = `game-${randomUUID()}`;
    const sanitizedDuration = duration > 0 ? duration : -1;

    games[gameId] = {
      game: Game.new(),
      thisTurn: ThisTurn.new(),
      thisMove: ThisMove.new(),
      players: { white: socket, black: null },
      GameDuration: sanitizedDuration,
      isRanked: isRanked,
      timers: { White: null, Black: null },
      timeLeft: {
        White: sanitizedDuration !== -1 ? sanitizedDuration : Infinity,
        Black: sanitizedDuration !== -1 ? sanitizedDuration : Infinity,
      },
    };

    socket.join(gameId);
    socket.emit("gameCreated", gameId);
    socket.emit("playerColor", "White");
    socket.emit("gameDuration", sanitizedDuration); // Invia la durata del gioco al client
    socket.emit("isRanked", isRanked);
  });

  socket.on("joinGame", (gameId) => {
    const gameData = games[gameId];
    if (!gameData) {
      socket.emit("error", "Game not found");
      return;
    }

    if (!gameData.players.white) {
      gameData.players.white = socket;
      socket.emit("playerColor", "White");
      socket.join(gameId);
      socket.emit("gameDuration", gameData.GameDuration); // Invia la durata del gioco al client
    } else if (!gameData.players.black) {
      gameData.players.black = socket;
      socket.emit("playerColor", "Black");
      socket.join(gameId);

      // Invia un aggiornamento dello stato del gioco a entrambi i giocatori
      io.to(gameId).emit("updateGameState", {
        game: gameData.game,
        thisMove: gameData.thisMove,
        thisTurn: gameData.thisTurn,
        timeLeft: gameData.timeLeft,
      });

      // Invia la durata del gioco al giocatore che si è unito
      socket.emit("gameDuration", gameData.GameDuration);

      console.log(`Giocatore ${socket.id} si è unito alla partita ${gameId} come Black`);
    } else {
      socket.emit("error", "Game is full");
    }
  });

  socket.on("findGame", ({ gameDuration, isRanked }) => {
    console.log(`Giocatore ${socket.id} sta cercando una partita`);

    // Aggiungi il giocatore alla coda di attesa solo se non è già presente
    const playerSocket = socket as Player;
    playerSocket.gameDuration = gameDuration;
    playerSocket.isRanked = isRanked; // Assign a default value or get it from the client
    if (!waitingPlayers.includes(playerSocket)) {
      waitingPlayers.push(playerSocket);
      console.log(`Giocatore ${socket.id} aggiunto alla coda di attesa. Numero di giocatori in coda: ${waitingPlayers.length}`);
    } else {
      console.log(`Giocatore ${socket.id} già presente nella coda.`);
    }
    // Richiama `matchmakePlayer` per cercare di abbinare i giocatori
    matchmakePlayer();
  });

  socket.on("stopSearching", () => {
    // Rimuovi il socket dalla coda di attesa se è presente
    console.log("rimuovo player dalla coda...");
    const index = waitingPlayers.indexOf(socket as Player);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
      console.log(`Giocatore ${socket.id} rimosso dalla coda di attesa`);
    }
  });

  socket.on("startGame", (gameId, gameDuration, isRanked) => startGame(gameId, gameDuration, isRanked));

  socket.on("rollDice", (gameId) => rollDice(socket, gameId));

  socket.on("select", (index, gameId) => select(index, socket, gameId));



  const JWT_SECRET = "tuasecretkey";

  socket.on("githubLogin", async ({ email, uid, token }) => {
    try {
      console.log("📡 Ricevuto login con GitHub:", { email, uid, token });

      if (!token) {
        console.error("❌ Errore: Token non ricevuto!");
        socket.emit("githubLoginError", "Token GitHub assente.");
        return;
      }

      // 🔥 **Recupera i dati reali da GitHub**
      const githubResponse = await fetch("https://api.github.com/user", {
        headers: { Authorization: `token ${token}` }, // ✅ Usa "token" invece di "Bearer"
      });

      if (!githubResponse.ok) {
        throw new Error("Impossibile ottenere i dati di GitHub");
      }

      const githubData = (await githubResponse.json()) as { login: string };
      const githubUsername = githubData.login;

      console.log("✅ Username GitHub recuperato:", githubUsername);

      // 🔍 Cerca se l'utente esiste già nel database
      let user = await User.findOne({ uid });

      if (!user) {
        user = await User.findOne({ email });

        if (!user) {
          console.log("🆕 Utente non trovato, creazione di un nuovo utente...");
          user = new User({
            username: githubUsername,
            email,
            uid,
            password: null,
            isGuest: false,
          });

          console.log("💾 Salvando il nuovo utente nel database...");
          await user.save();
          console.log("✅ Utente salvato con successo:", user);
        } else {
          console.log("⚠️ Utente con questa email già esiste, aggiorno l'UID e lo username...");
          user.uid = uid;
          user.username = githubUsername;
          await user.save();
        }
      } else {
        console.log("✔️ Utente esistente trovato:", user);
      }

      // 🔹 Genera un JWT per il client
      const jwtToken = jwt.sign(
        { username: user.username, userId: user._id.toString(), uid: user.uid },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      console.log("✅ JWT generato:", jwtToken);
      socket.emit("githubLoginSuccess", { user, jwtToken });

    } catch (error) {
      console.error("❌ Errore login GitHub:", error);
      socket.emit("githubLoginError", `Errore durante il login: ${(error as Error).message}`);
    }
  });




  socket.on("disconnect", () => {
    console.log("[disconnect ENDPOINT]");
    console.log(`⚠️ Player disconnected: ${socket.id}`);

    let gameIdToEnd: string | null = null;
    let winnerColor: "White" | "Black" | null = null;

    // Cerca in tutte le partite in corso
    for (const gameId in games) {
      const gameData = games[gameId];

      console.log(`White socket ID: ${gameData.players.white?.id}, Black socket ID: ${gameData.players.black?.id}`);
      if (gameData.players.white?.id === socket.id) {
        console.log("Il Bianco si è disconnesso")
        winnerColor = "Black";
        gameIdToEnd = gameId;
      } else if (gameData.players.black?.id === socket.id) {
        console.log("Il Nero si è disconesso");
        winnerColor = "White";
        gameIdToEnd = gameId;
      }

      if (gameIdToEnd && winnerColor) {
        console.log(`🏆 Partita ${gameIdToEnd} terminata per disconnessione. Vincitore: ${winnerColor}`);

        // Invia il messaggio di fine partita all'altro giocatore
        io.to(gameIdToEnd).emit("gameOver", { winner: winnerColor });

        // Termina la partita e assegna la vittoria
        endGame(gameIdToEnd, winnerColor);
        break;
      }
    }
  });

  socket.on("exitGame", (gameId) => {
    if (!games[gameId]) return;

    const gameData = games[gameId];

    // Determina chi sta abbandonando e chi è il vincitore
    const leavingPlayer =
      gameData.players.white?.id === socket.id ? "White" : "Black";
    const winningPlayer = leavingPlayer === "White" ? "Black" : "White";

    console.log(`🚪 Il giocatore ${leavingPlayer} ha lasciato la partita ${gameId}. Vittoria per ${winningPlayer}!`);

    // Invia l'evento di fine partita a entrambi i giocatori
    io.to(gameId).emit("gameOver", { winner: winningPlayer });

    // Termina la partita e assegna la vittoria
    endGame(gameId, winningPlayer);
  });

  socket.on("createTournament", (username: string) => {

    const tournamentId = `tournament-${randomUUID()}`;

    tournaments[tournamentId] = {
      status: "searching",
      players: [{ username, socket }],
      matches: [],
    };

    socket.join(tournamentId);
    socket.emit("tournamentCreated", tournamentId);
    console.log(`📡 [SERVER] Evento "tournamentCreated" inviato a: ${username}`);
  })

  socket.on("joinTournament", (tournamentId: string, username: string) => {
    const tnData = tournaments[tournamentId];
    if (!tnData) {
      socket.emit("error", "Tournament not found");
      return;
    }
    else if (tnData.players.length >= 4 || tnData.status !== "searching") {
      socket.emit("error", "Tournament is full or just started");
    }
    else {
      tnData.players.push({ username, socket })
      socket.emit("Player added");
      socket.join(tournamentId);
      if (readyToStart(tnData)) startTournament(tournamentId);
    }
  });

  socket.on("findTournament", (username: string) => {
    console.log(`Player ${socket.id} searching a tournament`);

    if (!waitingTnPlayers.some((player) => player.socket === socket)) {
      waitingTnPlayers.push({ username, socket });
      console.log(`Giocatore ${socket.id} aggiunto alla coda di attesa`);
    } else {
      console.log(`Giocatore ${socket.id} già presente nella coda.`);
    }

    tnmake();
  });

  socket.on("stopSearchingT", (username: string) => {
    // Rimuovi il socket dalla coda di attesa se è presente
    console.log("rimuovo player dalla coda...");
    const index = waitingTnPlayers.indexOf({ username, socket });
    if (index !== -1) {
      waitingTnPlayers.splice(index, 1);
      console.log(`Giocatore ${socket.id} rimosso dalla coda di attesa`);
    }
  });


});

const PORT = process.env.PORT || 3000;
console.log(`Server listening on port ${PORT}`);
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


export { games, gamePlayerIds };
export {io, server};
export { tournaments, createGameForT, startTournament, tnmake, handleProgress };

