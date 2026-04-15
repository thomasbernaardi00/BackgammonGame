/**
 * @jest-environment node
 */

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../login/user";
import { updatePlayerScore } from "../online/server"; 

jest.doMock("../cliente", () => {
    return jest.fn();
  });

describe("Test aggiornamento rating con updatePlayerScore", () => {
    let mongoServer: MongoMemoryServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.disconnect(); // Assicura che non ci siano connessioni aperte
        await mongoose.connect(mongoServer.getUri(), { dbName: "test" });
    
        await User.deleteMany({});
        await User.create({ _id: "65f23d123456789012345678", username: "Player1", score: 1000, email: "player1@example.com" });
        await User.create({ _id: "65f23d987654321098765432", username: "Player2", score: 1000, email: "player2@example.com" });
    });

    afterAll(async () => {
        await mongoose.connection.close(); // Chiude la connessione in modo pulito
        await mongoServer.stop(); // Spegne il server MongoDB in memoria
    });

    afterEach(async () => {
        // Ripristina gli score originali per evitare interferenze tra i test
        await User.updateOne({ _id: "65f23d123456789012345678" }, { score: 1000 });
        await User.updateOne({ _id: "65f23d987654321098765432" }, { score: 1000 });
    });

    test("Dovrebbe aggiornare correttamente il punteggio del vincitore e del perdente", async () => {
        const winnerId = new mongoose.Types.ObjectId("65f23d123456789012345678");
        const loserId = new mongoose.Types.ObjectId("65f23d987654321098765432");

        await updatePlayerScore(winnerId, 100);
        await updatePlayerScore(loserId, -25);

        const updatedWinner = await User.findById(winnerId);
        const updatedLoser = await User.findById(loserId);

        expect(updatedWinner?.score).toBe(1100);
        expect(updatedLoser?.score).toBe(975);
    });

    test("Dovrebbe evitare punteggi negativi", async () => {
        const loserId = new mongoose.Types.ObjectId("65f23d987654321098765432");
        await updatePlayerScore(loserId, -2000);

        const updatedLoser = await User.findById(loserId);
        expect(updatedLoser?.score).toBe(0);
    });
});