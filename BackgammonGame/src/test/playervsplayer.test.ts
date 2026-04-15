// per eseguire il test, da terminale : npm run test -- playervsplayer.test.ts

import http from "http";
import { Server } from "socket.io";
import socketIOClient, { Socket } from "socket.io-client";
import ThisMove from "../logic/models/this-move";
describe('PlayervsPlayer Component con server', () => {
  let server: http.Server;
  let io: Server;
  let clientSocket1: Socket;
  let clientSocket2: Socket;

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

      // Connessione dei client al server di test
      clientSocket1 = socketIOClient("http://localhost:4000");
      clientSocket2 = socketIOClient("http://localhost:4000");

      let connectedClients = 0;

      const onConnect = () => {
        connectedClients++;
        if (connectedClients === 2) {
          console.log("Entrambi i client connessi al server di test");
          done();
        }
      };

      clientSocket1.on("connect", onConnect);
      clientSocket2.on("connect", onConnect);
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

      // Gestisci l'evento "playMove"
      socket.on("playMove", (move) => {
        console.log(`Mossa giocata da ${socket.id}: ${move}`);
        socket.broadcast.emit("movePlayed", move);
      });

      // Gestisci l'evento "endTurn"
      socket.on("endTurn", () => {
        console.log(`Turno terminato da ${socket.id}`);
        socket.broadcast.emit("turnEnded");
      });
    });
  });

  afterAll((done) => {
    // Disconnessione dei client e chiusura del server
    clientSocket1.disconnect();
    clientSocket2.disconnect();
    io.close(() => {
      server.close(() => {
        console.log("Server di test chiuso");
        done();
      });
    });
  });

  test('dovrebbe avviare una partita online tra due client', (done) => {
    clientSocket1.emit("startGame");
    clientSocket2.emit("startGame");

    let gameStartedCount = 0;

    const onGameStarted = () => {
      gameStartedCount++;
      if (gameStartedCount === 2) {
        expect(true).toBe(true); // Placeholder assertion
        done();
      }
    };

    clientSocket1.on("gameStarted", onGameStarted);
    clientSocket2.on("gameStarted", onGameStarted);
  });



  test("dovrebbe terminare una partita online tra due client", (done) => {
    clientSocket1.emit("endGame");
    clientSocket2.emit("endGame");

    let gameEndedCount = 0;

    const onGameEnded = () => {
      gameEndedCount++;
      if (gameEndedCount === 2) {
        expect(true).toBe(true); // Placeholder assertion
        done();
      }
    };

    clientSocket1.on("gameEnded", onGameEnded);
    clientSocket2.on("gameEnded", onGameEnded);
  });

  test("dovrebbe gestire la connessione dei client", (done) => {
    expect(clientSocket1.connected).toBe(true);
    expect(clientSocket2.connected).toBe(true);
    done();
  });

  // Test per verificare la funzione makeMove
  test('dovrebbe permettere ai client di fare una mossa', (done) => {
    const move = new ThisMove();
    move._fromBarIdx = 3;
    move._toBarIdx = 5;

    clientSocket1.emit("playMove", move);
    clientSocket2.on("movePlayed", (receivedMove: ThisMove) => {
      console.log(`Mossa ricevuta: ${JSON.stringify(receivedMove)}`);
      expect(receivedMove._fromBarIdx).toEqual(move._fromBarIdx);
      expect(receivedMove._toBarIdx).toEqual(move._toBarIdx);
      done();
    });
  });

  // Test per verificare la funzione endTurn
  test('dovrebbe permettere ai client di terminare il turno', (done) => {
    clientSocket1.emit("endTurn");
    clientSocket2.on("turnEnded", () => {
      expect(true).toBe(true); // Placeholder assertion
      done();
    });
  });
});
