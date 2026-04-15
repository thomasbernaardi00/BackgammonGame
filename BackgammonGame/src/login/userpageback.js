import jwt from "jsonwebtoken";
import express from "express";
import User from "../login/user.js";

const userRouter = express.Router();
const JWT_SECRET = "tuasecretkey";

userRouter.get("/userProfile", async (req, res) => {
    try {
        console.log("🔍 [DEBUG] Ricevuta richiesta per /api/userProfile");

        // ✅ Controlla se il token è presente
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log("❌ Token non presente o malformato!");
            return res.status(403).json({ message: "Token non valido o assente" });
        }

        const token = authHeader.split(" ")[1];

        // ✅ Decodifica il token JWT
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            console.error("❌ Errore nella decodifica del token:", err);
            return res.status(403).json({ message: "Token non valido" });
        }

        console.log("✅ Token decodificato:", decoded);

        let user;
        if (decoded.userId) {
            console.log(`🔍 Ricerca per userId: ${decoded.userId}`);
            user = await User.findById(decoded.userId).select("username score");
        } else if (decoded.uid) {
            console.log(`🔍 Ricerca per uid: ${decoded.uid}`);
            user = await User.findOne({ uid: decoded.uid }).select("username score");
        }

        if (!user) {
            console.log("❌ Nessun utente trovato nel database!");
            return res.status(404).json({ message: "Utente non trovato" });
        }

        console.log("✅ [DEBUG] Dati utente trovati:", user);
        res.json(user);
    } catch (error) {
        console.error("❌ Errore nel recupero dell'utente:", error);
        res.status(500).json({ message: "Errore del server" });
    }
});

export default userRouter;