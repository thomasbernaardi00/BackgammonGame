/**
 * @jest-environment node
 */
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";
import mongoose from "mongoose";

// Importa le funzioni relative al torneo dal modulo server
import {
  tnmake,
  tournaments,
  waitingTnPlayers,
  notifyGameEnd,
  handleProgress,
} from "../online/server";

// Configura una porta casuale per i test (se necessario)
const PORT = Math.floor(3000 + Math.random() * 1000);
let httpServer: any;
let ioServer: Server;
let tournamentId: string | null = null;

beforeAll((done) => {
  httpServer = createServer();
  ioServer = new Server(httpServer, { cors: { origin: "*" } });

  // Avvia il server di test
  httpServer.listen(PORT, () => {
    console.log(`✅ Server di test avviato su porta ${PORT}`);
    done();
  });
});

afterAll(async () => {
  await mongoose.connection.close();
  ioServer.close();
  httpServer.close();
  console.log("✅ Server e connessioni chiuse.");
});

// Resetta gli oggetti globali per ogni test
beforeEach(() => {
  // Cancella la coda dei giocatori in attesa
  waitingTnPlayers.length = 0;
  // Cancella i tornei esistenti
  for (const key in tournaments) {
    delete tournaments[key];
  }
  tournamentId = null;
});

describe("Funzioni relative al torneo", () => {

  test("Job 1 - Creazione del torneo", () => {
    // Simula 4 socket mock per i giocatori
    const mockSockets: Partial<Socket>[] = Array.from({ length: 4 }, (_, index) => ({
      id: `player-${index}`,
      join: jest.fn(),
      emit: jest.fn(),
      once: jest.fn(),
    }));

    const usernames = ["Player1", "Player2", "Player3", "Player4"];

    // Aggiunge i 4 giocatori alla coda
    mockSockets.forEach((socket, index) => {
      waitingTnPlayers.push({
        username: usernames[index],
        socket: socket as Socket,
      });
    });

    // Chiamata a tnmake per creare il torneo
    tnmake();
    tournamentId = Object.keys(tournaments)[0];

    expect(tournamentId).toBeDefined();
    expect(tournaments[tournamentId!].players.length).toBe(4);
    // Secondo la logica di tnmake, lo status dovrebbe essere aggiornato in "in-progress" dopo startTournament
    expect(tournaments[tournamentId!].status).toBe("in-progress");
    // Verifica che siano state create 2 partite (match) nel primo turno
    expect(tournaments[tournamentId!].matches.length).toBe(2);
  });

  test("Job 2 - Simulazione fine del primo round e avanzamento al secondo", async () => {
    // Prepara un torneo con 4 giocatori
    const mockSockets: Partial<Socket>[] = Array.from({ length: 4 }, (_, index) => ({
      id: `player-${index}`,
      join: jest.fn(),
      emit: jest.fn(),
      once: jest.fn(),
    }));
    const usernames = ["Player1", "Player2", "Player3", "Player4"];
    mockSockets.forEach((socket, index) => {
      waitingTnPlayers.push({
        username: usernames[index],
        socket: socket as Socket,
      });
    });
    tnmake();
    tournamentId = Object.keys(tournaments)[0];
    expect(tournamentId).toBeDefined();
    // Simula la fine delle partite del primo round: per ogni match, emetti notifyGameEnd con vincitore "White"
    tournaments[tournamentId!].matches.forEach(match => {
      notifyGameEnd(match.gameId, "White");
    });
    // Avvia handleProgress per far avanzare il torneo al secondo round
    handleProgress(tournamentId!);
    // Ora ci aspettiamo che siano state aggiunte 2 partite in più (totale 4 match) e che quelle del round 2 siano 2
    expect(tournaments[tournamentId!].matches.length).toBe(4);
    const round2Matches = tournaments[tournamentId!].matches.filter(m => m.round === 2);
    expect(round2Matches.length).toBe(2);
  });

  test("Job 3 - Simulazione fine del torneo e cancellazione", async () => {
    // Prepara un torneo con 4 giocatori
    const mockSockets: Partial<Socket>[] = Array.from({ length: 4 }, (_, index) => ({
      id: `player-${index}`,
      join: jest.fn(),
      emit: jest.fn(),
      once: jest.fn(),
    }));
    const usernames = ["Player1", "Player2", "Player3", "Player4"];
    mockSockets.forEach((socket, index) => {
      waitingTnPlayers.push({
        username: usernames[index],
        socket: socket as Socket,
      });
    });
    tnmake();
    tournamentId = Object.keys(tournaments)[0];
    expect(tournamentId).toBeDefined();

    // Simula la fine delle partite del primo round
    tournaments[tournamentId!].matches.forEach(match => {
      notifyGameEnd(match.gameId, "White");
    });
    handleProgress(tournamentId!);
    // Simula la fine delle partite del secondo round
    tournaments[tournamentId!].matches
      .filter(m => m.round === 2)
      .forEach(match => {
        notifyGameEnd(match.gameId, "White");
      });
    // Avvia handleProgress per terminare il torneo
    handleProgress(tournamentId!);
    // Attende 1500 ms per permettere eventuali operazioni asincrone (come eventuale cleanup)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // Ora il torneo deve essere cancellato
    expect(tournaments[tournamentId!]).toBeUndefined();
    console.log("Il torneo è stato eliminato correttamente dopo il completamento.");
  });
});
