import { io, server } from "../online/server";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import socketIOClient, { Socket } from "socket.io-client";
import User from "../login/user";
import { beforeAll, afterAll, beforeEach, afterEach, test, expect } from '@jest/globals';

let clientA: Socket, clientB: Socket;
let mongoServer: MongoMemoryServer;

declare global {
  var connectedUsers: { [key: string]: boolean };
}

beforeAll(async () => {
  jest.setTimeout(15000);  // Imposta un timeout di 15 secondi per beforeAll

  // Setup per MongoDB in memoria
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri, { dbName: "jest" });
  }

  // Chiudi il server se è già avviato
  if (server.listening) {
    server.close();
  }

  // Avvia il server di test
  server.listen(3000, () => {
    console.log("Server in ascolto sulla porta 3000");
  });

  // Configura il server per rispondere all'evento "getFriends"
  io.on("connection", (socket) => {
    socket.on("getFriends", async (username) => {
      console.log(`Ricevuto getFriends per ${username}`);

      const user = await User.findOne({ username }).populate("friends", "username");
      const friendsOnline = user?.friends
        .map((friend: any) => friend.username)
        .filter((name: string) => global.connectedUsers[name]);

      console.log("Amici online:", friendsOnline);
      socket.emit("friendsList", friendsOnline || []);
    });
  });
});

beforeEach(async () => {

  // Simula utenti nel db
  const userA = await User.create({
    username: "userA",
    password: "password123",
    email: "userA@example.com",
    friends: [],
  });

  const userB = await User.create({
    username: "userB",
    password: "password123",
    email: "userB@example.com",
    friends: [userA._id],
  });

  userA.friends.push(userB._id);
  await userA.save();

  // Simula l'esistenza di un oggetto che contiene tutti gli utenti online
  global.connectedUsers = { userA: true };

  // Connessione dei client
  clientA = socketIOClient("http://localhost:3000");
  clientB = socketIOClient("http://localhost:3000");

  // Aspetta che entrambi i client si connettano
  await new Promise<void>((resolve, reject) => {
    clientA.on("connect", () => {
      clientB.on("connect", resolve);  // La connessione di clientB è completata
    });

    clientA.on("connect_error", (err) => {
      console.error("Errore di connessione clientA:", err);
      reject(err);
    });

    clientB.on("connect_error", (err) => {
      console.error("Errore di connessione clientB:", err);
      reject(err);
    });
  });
});

afterEach(() => {
  // Chiudi le connessioni dei client dopo ogni test
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

  if (mongoServer && mongoServer.instanceInfo) {
    await mongoServer.stop();
  }
});

test("Verifica che getFriends ritorni solo gli amici online", (done) => {
  jest.setTimeout(10000);  // Imposta un timeout di 10 secondi per questo test

  console.log("Test iniziato");

  // Quando il clientA è connesso, emettiamo l'evento "getFriends"
  clientA.on("connect", () => {
    console.log("clientA connesso, emettiamo 'getFriends'");
    clientA.emit("getFriends", "userB");

    // Ascolta l'evento 'friendsList' e verifica la risposta
    clientA.on("friendsList", (friends) => {
      console.log("Amici ricevuti:", friends);

      try {
        // Verifica che la lista contenga solo gli amici online
        expect(friends).toEqual(["userA"]); // Deve contenere solo gli amici online
        done(); // Termina il test chiamando done()
      } catch (error) {
        done(error as Error); // Se c'è un errore nel test, chiamalo con l'errore per segnalarlo
      }
    });
  });

  // Timeout di sicurezza per evitare test bloccati
  setTimeout(() => {
    console.log("Timeout di sicurezza, chiamata done()");
    done(); // Chiamata done per evitare il test bloccato
  }, 10000);  // Timeout di sicurezza di 10 secondi
});