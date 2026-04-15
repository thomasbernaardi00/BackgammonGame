
/**
 * @jest-environment node
 */

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import saverouter from '../AI/save-game'; 
import GameModel from '../AI/Gamemodel';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;
let app: express.Express | null = null;

beforeAll(async () => {
  jest.setTimeout(30000); // Imposta un timeout globale di 30s
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  app = express();
  app.use(express.json());
  app.use('/api', saverouter);
});

afterAll(async () => {
  if (app) {
    app = null; 
  }
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) {
    await mongod.stop();
  }
});

describe('Test API di salvataggio partite', () => {
  it('Dovrebbe salvare una partita', async () => {
    const response = await request(app!).post('/api/save-game').send({
      userId: '123',
      gameState: 'stato di gioco',
      turnState: 'turno',
      moveState: 'mosse',
      botColor: 'nero',
      playerColor: 'bianco'
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Nuova partita salvata!');
  });

  it('Dovrebbe aggiornare una partita gia esistente', async () => {
    const game = await GameModel.create({
      userId: '123',
      gameState: 'vecchio stato',
      turnState: 'turno vecchio',
      moveState: 'mosse vecchie',
      botColor: 'nero',
      playerColor: 'bianco',
      timestamp: new Date()
    });

    const response = await request(app!).post('/api/save-game').send({
      userId: '123',
      gameState: 'vecchio stato',
      turnState: 'turno aggiornato',
      moveState: 'mosse aggiornate',
      botColor: 'nero',
      playerColor: 'bianco'
    });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Partita aggiornata con successo!');
});

it('Dovrebbe dare errore se manca userId', async () => {
  const response = await request(app!).post('/api/save-game').send({
    gameState: 'stato di gioco',
    turnState: 'turno',
    moveState: 'mosse',
    botColor: 'nero',
    playerColor: 'bianco'
});
expect(response.status).toBe(400);
expect(response.body.message).toBe('userId mancante.');
});

it('Dovrebbe recuperare le partite salvate da un utente', async () => {
  await GameModel.create({
    userId: '456',
    gameState: 'stato1',
    turnState: 'turno1',
    moveState: 'mosse1',
    botColor: 'nero',
    playerColor: 'bianco',
    timestamp: new Date(),
  });

  // facciamo una richiesta POST per recuperare le partite
  const response = await request(app!)
    .post('/api/saved-games')  
    .send({ userId: '456' })  

  expect(response.status).toBe(200);
  expect(response.body.length).toBe(1);
  expect(response.body[0].gameState).toBe('stato1');
}, 10000);

it('dovrebbe eliminare una partita', async () => {
  const game = await GameModel.create({
    userId: '789',
      gameState: 'da eliminare',
      turnState: 'turno',
      moveState: 'mosse',
      botColor: 'nero',
      playerColor: 'bianco'
  });

  const response = await request(app!).delete(`/api/delete-game/${game._id}`);
  expect(response.status).toBe(200);
  expect(response.body.message).toBe('Partita eliminata con successo.');
});

it('Dovrebbe dare errore se si tenta di eliminare una partita inesistente', async () => {
  const response = await request(app!).delete('/api/delete-game/65f1d7f5c9b4d5f7d5c7b8a9'); // ID inesistente
  expect(response.status).toBe(404);
  expect(response.body.message).toBe('Partita non trovata.');
});
});
