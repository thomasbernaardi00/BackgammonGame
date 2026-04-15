import { io, server } from "../online/server";
import socketIOClient, { Socket } from "socket.io-client";
import mongoose from "mongoose";
let clientA: Socket, clientB: Socket;

beforeAll(async () => {
  // Chiudi il server se è già avviato
  if (server.listening) {
    server.close();
  }
  
  // Avvia il server di test
  server.listen(3000, () => {
    console.log("Server in ascolto sulla porta 3000");
  });

  // Setup del server
  io.on("connection", (socket) => {
    socket.on("sendInvite", (invitedUsername: string, gameDuration: number) => {
      console.log(`Invito inviato da ${socket.id} a ${invitedUsername}`);
      
      // Usa il socket.id come identificatore dell'utente connesso
      const invitedSocket = io.sockets.sockets.get(invitedUsername);
      if (invitedSocket && invitedSocket.connected) {
        invitedSocket.emit("receiveInvite", socket.id, gameDuration);
      } else {
        socket.emit("error", "User not found or not connected");
      }
    });

    socket.on("receiveInvite", (inviterSocketId, gameDuration) => {
      console.log(`Invito ricevuto da ${inviterSocketId} per una partita di ${gameDuration} minuti`);
    });
  });
});

beforeEach((done) => {
  // Connessione dei client
  clientA = socketIOClient("http://localhost:3000");
  clientB = socketIOClient("http://localhost:3000");

  // Aspetta che entrambi i client si connettano
  clientA.on("connect", () => {
    clientB.on("connect", done);  // La connessione di clientB è completata
  });

  clientA.on("connect_error", (err) => {
    console.error("Errore di connessione clientA:", err);
    done(err);
  });

  clientB.on("connect_error", (err) => {
    console.error("Errore di connessione clientB:", err);
    done(err);
  });
});

afterEach(() => {
  if (clientA && clientB) {
    clientA.disconnect();
    clientB.disconnect();
  }
});

afterAll(async () => {
  // Chiudi il server e la connessione al DB dopo tutti i test
  if (server && server.listening) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  
});

test("dovrebbe inviare e ricevere un invito", (done) => {
  const gameDuration = 30;
  const invitedUsername = clientB.id;  // Usa il socket id di clientB come 'username'

  // Quando clientB riceve l'invito
  clientB.on("receiveInvite", (inviterSocketId: string, duration: number) => {
    expect(duration).toBe(gameDuration);
    expect(inviterSocketId).toBe(clientA.id);
    done();  // Test completato
  });

  // Invia l'invito da clientA a clientB
  clientA.emit("sendInvite", invitedUsername, gameDuration);
});
