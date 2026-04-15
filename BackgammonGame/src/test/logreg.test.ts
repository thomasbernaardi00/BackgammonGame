import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcrypt";
import express from "express";
import session from "express-session";
import logrouter from "../login/logreg";
import User from "../login/user";

let mongoServer;
const app = express();

// Abilita le sessioni per evitare errori di undefined su req.session
app.use(session({
    secret: "testsecret", 
    resave: false,
    saveUninitialized: true,
}));

app.use(express.json());
app.use("/", logrouter);

beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, { dbName: "testdb" });
});

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    }
    await mongoServer.stop();
});

describe("Test API di autenticazione", () => {
    let testUser = { username: "testuser", email: "test@example.com", password: "password123" };

    test("Registrazione utente", async () => {
        const res = await request(app).post("/register").send(testUser);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Successfully registered");

        const userInDb = await User.findOne({ username: testUser.username });
        expect(userInDb).not.toBeNull();
        if (userInDb) {
            expect(await bcrypt.compare(testUser.password, userInDb.password)).toBe(true);
        }
    });

    test("Login utente", async () => {
        const res = await request(app).post("/login").send({
            username: testUser.username,
            password: testUser.password
        });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("token");
        expect(res.body.user.username).toBe(testUser.username);
    });

    test("Login come ospite", async () => {
        const res = await request(app).post("/guest-login").send();
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty("guestUsername");

        const guestInDb = await User.findOne({ username: res.body.guestUsername });
        expect(guestInDb).not.toBeNull();
        if (guestInDb) {
            expect(guestInDb.isGuest).toBe(true);
        }
    });

    test("Login con credenziali errate", async () => {
        const res = await request(app).post("/login").send({
            username: "usernonesistente",
            password: "passworderrata"
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Credenziali non valide");
    });
});
