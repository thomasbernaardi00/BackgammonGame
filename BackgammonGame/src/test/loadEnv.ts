import dotenv from "dotenv";
import path from "path";

const result = dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (result.error) {
  console.error("Error loading .env file", result.error);
} else {
  console.log("Env variables loaded successfully.");
}

