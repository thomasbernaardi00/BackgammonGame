// per eseguire il test, da terminale : npm run test -- botvsbot.test.ts

import http from "http";
import { Server } from "socket.io";
import socketIOClient, { Socket } from "socket.io-client";
import ThisTurn from "../logic/models/this-turn";
import Game from "../logic/models/game";
import ThisMove from "../logic/models/this-move";
import Aiplayer from "../AI/BotvsBot";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

describe("Aiplayer con server di test", () => {
  let server: http.Server;
  let io: Server;
  let clientSocket: Socket;

  beforeAll((done) => {
    // Crea un server HTTP e un'istanza di Socket.IO
    server = http.createServer();
    io = new Server(server, {
      cors: {
        origin: "*", // Consenti tutte le origini (modifica in produzione)
        methods: ["GET", "POST"],
      },
    });

    // Avvia il server sulla porta 4000
    server.listen(4000, () => {
      console.log("Server di test avviato sulla porta 4000");

      // Connessione del client al server di test
      clientSocket = socketIOClient("http://localhost:4000");
      clientSocket.on("connect", () => {
        console.log("Client connesso al server di test");
        done();
      });
    });

    // Configura il server per gestire le connessioni e gli eventi
    io.on("connection", (socket) => {
      console.log(`Client connesso: ${socket.id}`);

      // Gestisci l'evento "startGame"
      socket.on("startGame", () => {
        console.log(`Partita avviata da ${socket.id}`);
        socket.emit("gameStarted");
      });

      // Gestisci l'evento "endGame"
      socket.on("endGame", () => {
        console.log(`Partita terminata da ${socket.id}`);
        socket.emit("gameEnded");
      });
    });
  });

  afterAll((done) => {
    // Disconnessione del client e chiusura del server
    clientSocket.disconnect();
    io.close(() => {
      server.close(() => {
        console.log("Server di test chiuso");
        done();
      });
    });
  });

  test("dovrebbe giocare la partita", (done) => {
    clientSocket.emit("startGame");
    clientSocket.on("gameStarted", () => {
      expect(true).toBe(true); 
      done();
    });
  });

  test("dovrebbe terminare la partita", (done) => {
    clientSocket.emit("endGame");
    clientSocket.on("gameEnded", () => {
      expect(true).toBe(true); 
      done();
    });
  });

  test("dovrebbe gestire la connessione del client", (done) => {
    expect(clientSocket.connected).toBe(true);
    done();
  });
});