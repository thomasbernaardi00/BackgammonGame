module.exports = {
  preset: "ts-jest", // Imposta ts-jest come preset per Jest
  testEnvironment: "jsdom", // Usa jsdom per simulare il browser
  coverageProvider: "v8", // Usa V8 per la coverage (più veloce e preciso)
  verbose: true, // Mostra dettagli sui test
  
  // Ignora i moduli specificati per il trasformamento
  transformIgnorePatterns: [
    "/node_modules/(?!mongoose|socket.io|express|supertest|uuid)/"
  ],
  
  coverageReporters: ["json", "lcov", "text", "html"], // Report della coverage
  collectCoverage: true, // Raccogli la coverage dei test
  collectCoverageFrom: [
    "src/**/*.{ts,tsx,js}", // Copri tutti i file .ts e .tsx
    "!src/**/*.test.{ts,tsx}", // Escludi i test stessi
    "!src/setupTests.ts", // Escludi il file di setup
    
  ],
  
  // Trasforma i file .ts, .tsx, .js, .jsx con Babel
  transform: {
    "^.+\\.(ts|tsx|js|jsx)?$": "babel-jest" // Usa Babel per i file TS e JSX
  },

  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy" // Mock dei file CSS
  },

  // File di setup che verranno eseguiti prima di ogni test
  setupFiles: [
    // Carica dotenv per leggere le variabili di ambiente
    "<rootDir>/src/test/loadEnv.ts"
  ],
  setupFilesAfterEnv: [
    // Carica il setup di jest-dom e altre configurazioni
    "<rootDir>/src/test/jest.setup.ts"
  ],
  
  // Configura i test che saranno eseguiti
  testMatch: ["<rootDir>/src/test/**/*.test.{ts,tsx}"], // Cerca i test in src/test
  
  // Permetti a Jest di eseguire codice asincrono
  globals: {
    "ts-jest": {
      isolatedModules: true, // Utilizza l'elaborazione separata dei moduli TypeScript
    }
  },
  testTimeout:15000
};
