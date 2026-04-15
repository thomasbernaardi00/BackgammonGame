/**
 * @jest-environment node
 */

// Disabilita i log globalmente (per evitare errori dopo la fine dei test)
console.log = jest.fn();
console.error = jest.fn();

import { Socket } from "socket.io";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { matchmakePlayer, waitingPlayers, games, gamePlayerIds, Player } from "../online/server";
import User from "../login/user";

// Fake utenti per il mock di User.findOne
const fakeUsers: { [username: string]: { _id: string; username: string } } = {
  "Player1": { _id: "id1", username: "Player1" },
  "Player2": { _id: "id2", username: "Player2" },
  "PlayerInvalid": { _id: "id_invalid", username: "PlayerInvalid" },
  "Player3": { _id: "id3", username: "Player3" },
  "Player4": { _id: "id4", username: "Player4" },
};

// Funzione helper per creare un fake socket con le proprietà minime necessarie
function createFakeSocket(id: string, gameDuration: number, isRanked: boolean): Socket {
  const s = {
    id,
    join: (room: string) => {
      // implementazione minima (vuota)
    },
    emit: jest.fn(),
    gameDuration,
    isRanked,
  };
  return s as unknown as Socket;
}

beforeEach(() => {
  // Reset degli array globali
  waitingPlayers.length = 0;
  for (const key in games) delete games[key];
  for (const key in gamePlayerIds) delete gamePlayerIds[key];

  // Mock di User.findOne per restituire dati fittizi in base a query.username
  jest.spyOn(User, "findOne").mockImplementation((query: any) => {
    return {
      exec: () => Promise.resolve(fakeUsers[query.username])
    } as any;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("matchmakePlayer - Raggruppamento e creazione partite", () => {
  test("Dovrebbe raggruppare correttamente 2 giocatori ranked e creare una partita", async () => {
    // Creiamo 2 fake socket per giocatori ranked con durata 600
    const player1 = createFakeSocket("player-1", 600, true);
    const player2 = createFakeSocket("player-2", 600, true);

    // Inseriamo nella coda waitingPlayers usando Object.assign per includere anche la proprietà extra "username"
    waitingPlayers.push(
      Object.assign({}, player1, {
        username: "Player1",
        gameDuration: 600,
        isRanked: true,
      }) as any as Player
    );
    waitingPlayers.push(
      Object.assign({}, player2, {
        username: "Player2",
        gameDuration: 600,
        isRanked: true,
      }) as any as Player
    );

    await matchmakePlayer();

    // Verifica: una partita deve essere stata creata
    const createdGames = Object.keys(games);
    expect(createdGames.length).toBe(1);
    // La coda waitingPlayers deve essere svuotata
    expect(waitingPlayers.length).toBe(0);
  });

  test("Se un giocatore non ha una durata valida viene ignorato", async () => {
    // Inseriamo un giocatore non valido (durata 0)
    waitingPlayers.push(
      Object.assign({}, createFakeSocket("player-invalid", 0, true), {
        username: "PlayerInvalid",
        gameDuration: 0,
        isRanked: true,
      }) as any as Player
    );
    // Aggiungiamo altri 2 giocatori validi
    waitingPlayers.push(
      Object.assign({}, createFakeSocket("player-1", 600, true), {
        username: "Player1",
        gameDuration: 600,
        isRanked: true,
      }) as any as Player
    );
    waitingPlayers.push(
      Object.assign({}, createFakeSocket("player-2", 600, true), {
        username: "Player2",
        gameDuration: 600,
        isRanked: true,
      }) as any as Player
    );

    await matchmakePlayer();

    // Verifica: una partita deve essere stata creata (solo per i giocatori validi)
    const createdGames = Object.keys(games);
    expect(createdGames.length).toBe(1);
    // La coda non deve contenere il giocatore non valido
    const usernamesInQueue = waitingPlayers.map((p: any) => p.username);
    expect(usernamesInQueue).not.toContain("PlayerInvalid");
  });

  test("Dovrebbe raggruppare correttamente 2 giocatori casual e creare una partita", async () => {
    // Creiamo 2 fake socket per giocatori casual (isRanked false) con durata 600
    const player1 = createFakeSocket("player-1", 600, false);
    const player2 = createFakeSocket("player-2", 600, false);

    waitingPlayers.push(
      Object.assign({}, player1, {
        username: "Player1",
        gameDuration: 600,
        isRanked: false,
      }) as any as Player
    );
    waitingPlayers.push(
      Object.assign({}, player2, {
        username: "Player2",
        gameDuration: 600,
        isRanked: false,
      }) as any as Player
    );

    await matchmakePlayer();

    // Verifica: una partita deve essere stata creata per i giocatori casual
    const createdGames = Object.keys(games);
    expect(createdGames.length).toBe(1);
    expect(waitingPlayers.length).toBe(0);
  });
});
