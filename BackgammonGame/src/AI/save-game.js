import { Router } from "express";
import GameModel from "./Gamemodel";
import jwt from "jsonwebtoken";  // Importa jsonwebtoken per decodificare il token

const saverouter = Router();


// Endpoint per salvare una partita
saverouter.post("/save-game", async (req, res) => {
  try {
    const { gameState, turnState, moveState, botColor, playerColor, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId mancante." });
    }

    let savedGame = await GameModel.findOne({ userId, gameState });

    if (savedGame) {
      savedGame.gameState = gameState;
      savedGame.turnState = turnState;
      savedGame.moveState = moveState;
      savedGame.botColor = botColor;
      savedGame.playerColor = playerColor;
      savedGame.timestamp = new Date();

      await savedGame.save();
      res.status(200).json({ message: "Partita aggiornata con successo!", gameId: savedGame._id });
    } else {
        savedGame = new GameModel({
        gameState,
        turnState,
        moveState,
        botColor,
        playerColor,
        userId,
        timestamp: new Date(),
      });

      await savedGame.save();
      res.status(201).json({ message: "Nuova partita salvata!", gameId: savedGame._id });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore nel salvataggio della partita." });
  }
});



// Endpoint per ottenere tutte le partite salvate per un utente specifico
saverouter.post("/saved-games", async (req, res) => {
  try {
    const { userId } = req.body;  

    if (!userId) {
      return res.status(400).json({ message: "userId mancante." });
    }

    // Filtra le partite salvate per l'userId
    const games = await GameModel.find({ userId }).sort({ timestamp: -1 }); // Ordina per data decrescente
    res.status(200).json(games);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore nel recupero delle partite salvate." });
  }
});

saverouter.get("/saved-games/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Cerca la partita per ID
    const game = await GameModel.findOne({ _id: id });

    if (!game) {
      return res.status(404).json({ message: "Partita non trovata." });
    }

    res.status(200).json(game);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore nel caricamento della partita." });
  }
});

saverouter.delete("/delete-game/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedGame = await GameModel.findByIdAndDelete(id);

    if (!deletedGame) {
      return res.status(404).json({ message: "Partita non trovata." });
    }

    res.status(200).json({ message: "Partita eliminata con successo." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore nell'eliminazione della partita." });
  }
});


export default saverouter;




