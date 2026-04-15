import express from "express";
import User from "../login/user.js";

const classificaRouter = express.Router();

classificaRouter.use(express.json());

//Endpoint per aggiornare il punteggio
classificaRouter.post("/aggiorna-punteggio", async (req, res) => {
    const { userID, score } = req.body;

    if (!userID || score === undefined) {
        return res.status(400).json({ message: "userID e score sono richiesti" });
    }

    try {
        const user = await User.findById(userID);
        if (!user) return res.status(404).json({ message: "Utente non trovato" });

        user.score += score; //Aggiungi il punteggio
        await user.save();

        res.json({ message: "Punteggio aggiornato!", newScore: user.score });
    } catch (error) {
        console.error("Errore nel backend:", error);
        res.status(500).json({ message: "Errore nel backend", error: error.message });
    }
});

//Endpoint per ottenere la classifica
classificaRouter.get("/classifica", async (req, res) => {
    try {
        const topPlayers = await User.find({isGuest: false})
            .sort({ score: -1 }) // Ordina in ordine decrescente
            .limit(20) // Prende solo i primi 50 giocatori
            .select("username score"); // Seleziona solo username e punteggio

        res.json(topPlayers);
    } catch (error) {
        console.error("Errore nel recupero della classifica:", error);
        res.status(500).json({ message: "Errore nel backend", error: error.message });
    }
});

export default classificaRouter;

