# Usa un'immagine base con Node.js
FROM node:18

# Imposta la directory di lavoro
WORKDIR /app

# Copia solo i file di configurazione (dalla cartella corretta)
COPY BackgammonGame/package*.json ./  
# Installa le dipendenze
RUN npm install

# Copia tutto il codice sorgente (dalla cartella BackgammonGame)
COPY BackgammonGame/ ./  
# Compila il progetto (se necessario)
RUN npm run build


# Esponi la porta usata dall'app
EXPOSE 3000

# Avvia il server
CMD ["npm", "start"]

