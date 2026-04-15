import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import connectDB from './database';
import path from "path";
import { fileURLToPath } from "url";
import User from "./user";



dotenv.config();

const app = express();
app.use(express.json());

 // Ottiene la directory del file
const friendrouter = express.Router();

// Connetti MongoDB
connectDB();

// Endpoint per ottenere amici
friendrouter.get("/amici", async (req, res) => {
  const { userID } = req.query;
  try {
    const user = await User.findById(userID).populate("friends", "username");
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ message: "Errore nella lista amici", error });
  }
});

// Endpoint per ottenere richieste di amicizia
friendrouter.get("/richieste-amici", async (req, res) => {
  const { userID } = req.query;
  try {
    const user = await User.findById(userID);
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    res.json({ friendsRequest: user.friendsRequest });
  } catch (error) {
    res.status(500).json({ message: "Errore nel backend", error: error.message });
  }
});

// Endpoint per aggiungere amici
friendrouter.post("/aggiungi-amici", async (req, res) => {
  console.log("✅ DEBUG: API Aggiungi Amico chiamata!");

  console.log("➡️ Dati ricevuti:", req.body);

  const { userID, friendName } = req.body;

  if (!userID || !friendName) {
    console.error("❌ ERRORE: userID o friendName mancanti!");
    return res.status(400).json({ message: "userID o friendName mancanti" });
  }

  try {
    console.log(`🔍 Cerco l'utente con username: ${friendName}`);
    const friend = await User.findOne({ username: friendName });

    if (!friend) {
      console.error(`❌ ERRORE: Utente ${friendName} non trovato!`);
      return res.status(404).json({ message: "Utente non trovato" });
    }

    console.log(`🔍 Cerco l'utente con ID: ${userID}`);
    const user = await User.findById(userID);

    if (!user) {
      console.error(`❌ ERRORE: UserID ${userID} non trovato!`);
      return res.status(404).json({ message: "Utente non trovato" });
    }

    console.log(`✅ DEBUG: Aggiungo richiesta di amicizia da ${user.username} a ${friend.username}`);

    await User.findByIdAndUpdate(friend._id, {
      $push: { friendsRequest: { from: userID, status: "attesa" } }
    });

    res.json({ message: "Richiesta di amicizia inviata!" });

  } catch (error) {
    console.error("❌ ERRORE CRITICO NEL BACKEND:", error);
    res.status(500).json({ message: "Errore nel backend", error: error.message });
  }
});


// Endpoint per rispondere alle richieste di amicizia
friendrouter.post("/rispondi-amicizia", async (req, res) => {
  const { userID, requestID, risposta } = req.body;
  if (!userID || !requestID || !risposta) {
    return res.status(400).json({ message: "Dati mancanti" });
  }
  try {
    const user = await User.findById(userID);
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    const requestIndex = user.friendsRequest.findIndex(r => r._id.toString() === requestID);
    if (requestIndex === -1) return res.status(404).json({ message: "Richiesta non trovata" });

    if (risposta === "accettata") {
      user.friends.push(user.friendsRequest[requestIndex].from);
    }
    user.friendsRequest.splice(requestIndex, 1);
    await user.save();

    res.json({ message: `Richiesta ${risposta} con successo!` });
  } catch (error) {
    res.status(500).json({ message: "Errore nel backend", error: error.message });
  }
});

export default friendrouter;