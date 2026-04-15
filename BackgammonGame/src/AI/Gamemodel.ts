import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  gameState: Object,
  turnState: Object,
  moveState: Object,
  botColor: String,
  playerColor: String,
  timestamp: { type: Date, default: Date.now },
  userId: String,
  isRanked: { type: Boolean, default: false },
});

const GameModel = mongoose.model("Game", gameSchema);
export default GameModel;
