import express from "express";
import session from "express-session";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import path from "path"; // Configura il percorso per i file statici
import dotenv from "dotenv";
import User from "./user.js"; 
import cors from "cors";
import jwt from "jsonwebtoken";
import connectDB from './database.js';

dotenv.config();
const JWT_SECRET='tuasecretkey'; // Chiave segreta per la generazione del token JWT
const logrouter = express.Router();

logrouter.use(cors());
logrouter.use(express.json())

// MongoDB connection
connectDB();


// Route di Login
logrouter.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: "Credenziali non valide" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ message: "Credenziali non valide" });
        }

        // Log dei dati utente
        console.log("Utente trovato:", user);

        // Verifica la presenza della variabile JWT_SECRET
        console.log("JWT_SECRET:", JWT_SECRET);  // Log per verificare la presenza della variabile d'ambiente

        // Genera il token
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,  // Usa la variabile d'ambiente JWT_SECRET
            { expiresIn: '1h' }
        );

        // Log del token generato
        console.log("Token generato:", token);

        res.status(200).json({
            token,
            user: {
                username: user.username,
                score: user.score
            }
        });

    } catch (error) {
        console.error("Errore durante il login:", error);
        res.status(500).json({ message: "Errore durante il login", error: error.message });
    }
}); 


logrouter.get('/home', (req, res) => {
    if (req.session.userId) {
        res.send("Login effettuato con successo! Benvenuto nel gioco di backgammon!");
    } else {
        res.redirect("/login"); // Reindirizza alla pagina di login se non loggato
    }
});


//route per giocare come account ospite
logrouter.post('/guest-login', async(req, res) => {
   
    try{
        const guestUsername =  `guest_${Date.now()}`;
        //creo account ospite nel database
        const guestUser = new User({
            username: guestUsername,
            email: `${guestUsername}@guest.com`,
            password: await bcrypt.hash("guest", 10),
            friends: [],
            gameInvites: [],
            isGuest: true,
        });
        await guestUser.save();
        //l'ID ospite viene memorizzato nella sessione
        req.session.userId = guestUser._id;
       
        res.json({success: true, message:`Welcome guest ${guestUsername}!`, guestUsername});
    } catch (error){
        console.error("Error during guest creation", error);
        res.status(500).json({success: false, message: "Error during guest creation", error });
    }
});

// Route di Logout
logrouter.post('/logout', (req, res) => {
    try {
        res.status(200).json({ message: "Successfully logged out!" });
    } catch (error) {
        console.error("Errore durante il logout:", error);
        res.status(500).json({ message: "Errore durante il logout", error: error.message });
    }
});




// Route di registrazione
logrouter.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "Compile all the fields!" });
    }

    try {
        // Controlla se l'username è già registrato
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: "This user already exists!" });
        }

        // Hash della password e salvataggio
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: "Successfully registered!" });
    } catch (error) {
        console.error("Errore during registration:", error);
        res.status(500).json({ message: "An error has occurred during user registration!" });
    }
});

export default logrouter;