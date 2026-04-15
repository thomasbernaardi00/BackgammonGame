import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";
import dotenv from "dotenv";

// Carica le variabili d'ambiente dal file .env
dotenv.config();

// Assegna TextEncoder e TextDecoder globalmente
if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === "undefined") {
  Object.assign(global, { TextDecoder });
}
