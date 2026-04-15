import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
console.log('Mongo URI:', process.env.MONGO_URI);


const connectDB = async () => {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI non è definito!');
      return;
    }
  
    if (mongoose.connection.readyState) {
      console.log('MongoDB già connesso');
      return;
    }
  
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('MongoDB connesso');
    } catch (err) {
      console.error('Errore di connessione MongoDB:', err);
    }
  };
  
  export default connectDB;