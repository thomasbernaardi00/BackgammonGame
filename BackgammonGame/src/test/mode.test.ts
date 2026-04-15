import { io, server, waitingPlayers } from "../online/server";
import { io as ClientIO, Socket } from "socket.io-client";
import mongoose from "mongoose";

describe("Socket.IO Game mode", () => {
  let clientSocket: Socket;

  beforeAll(async () => {
    // Assicuriamoci che il server sia attivo
    if (!server.listening) {
      await new Promise<void>((resolve) => {
        server.listen(3000, () => {
          console.log("✅ Server di test avviato sulla porta 3000");
          resolve();
        });
      });
    }

    clientSocket = ClientIO("http://localhost:3000");
  
    await Promise.all([
      new Promise<void>((resolve) => clientSocket.on("connect", resolve)),
    ]);
  
    console.log("✅ Giocatori connessi");
  }, 30000);
  
  afterAll(async () => {

    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
    // Chiusura server e MongoDB alla fine dei test
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  test("Dovrebbe creare una partita e ricevere gli eventi corretti", (done) => {

    let receivedEvents = 0;
    clientSocket.on("gameCreated", (gameId: string) => {
      console.log("Evento ricevuto: gameCreated", gameId);
      expect(gameId).toMatch(/^game-/);
      receivedEvents++;
    });

    clientSocket.on("playerColor", (color: string) => {
      console.log("Evento ricevuto: gameCreated", color);
      expect(color).toBe("White");
      receivedEvents++;
    });

    clientSocket.on("gameDuration", (duration: number) => {
      console.log("Evento ricevuto: gameCreated", duration);
      expect(duration).toBe(300);
      receivedEvents++;
    });

    clientSocket.on("isRanked", (isRanked: boolean) => {
      console.log("Evento ricevuto: gameCreated", isRanked);
      expect(isRanked).toBe(true);
      receivedEvents++;
    });

    setTimeout(() => {
      expect(receivedEvents).toBe(4);
      done();
    }, 1000);

    clientSocket.emit("createGame", { duration: 300, isRanked: true });
  });

  test("Dovrebbe aggiungere il giocatore alla coda e chiamare matchmakePlayer", (done) => {
    clientSocket.emit("findGame", { gameDuration: 300, isRanked: false });
    console.log(clientSocket.id);
    console.log(waitingPlayers);
    setTimeout(() => {
      // Verifica che il giocatore sia stato aggiunto alla coda
      expect(waitingPlayers.some(p => p.id === clientSocket.id)).toBe(true);

      done();
    }, 1000);
  });

});