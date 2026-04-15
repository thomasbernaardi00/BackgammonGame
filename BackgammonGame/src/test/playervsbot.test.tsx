/**
 * @jest-environment jsdom
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlayervsBot from "../AI/PlayervsBot";

// MOCK: react-hot-toast
jest.mock("react-hot-toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// MOCK: jwt-decode (nota: il componente importa jwtDecode come named export)
import { jwtDecode } from "jwt-decode";
jest.mock("jwt-decode", () => {
  const jwtDecodeMock = jest.fn();
  return {
    __esModule: true,
    jwtDecode: jwtDecodeMock,
    default: jwtDecodeMock,
  };
});
const mockJwtDecode = jwtDecode as jest.Mock<any, any>;

// MOCK: useNavigate di react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// MOCK: Sostituisci i componenti BoardTop e BoardBottom con versioni fittizie
jest.mock("../frontend/BoardTop", () => () => <div>Mock BoardTop</div>);
jest.mock("../frontend/BoardBottom", () => () => <div>Mock BoardBottom</div>);

describe("PlayervsBot Component", () => {
  beforeEach(() => {
    // Imposta i dati in localStorage
    localStorage.setItem("token", "fake.jwt.token");
    localStorage.setItem("isGuest", "false");

    // Configura il mock di jwtDecode per restituire un fake decoded token
    mockJwtDecode.mockReturnValue({ userId: "user123" });

    // MOCK: Global fetch per simulare le chiamate API
    global.fetch = jest.fn().mockImplementation((url: string, options?: any) => {
      // Recupero delle partite salvate
      if (url.includes("/api/saved-games") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      // Caricamento di una partita salvata
      if (url.includes("/api/saved-games/") && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              gameState: {}, // Simula uno stato di gioco vuoto/minimale
              turnState: {},
              moveState: {},
              botColor: "White",
              playerColor: "Black",
            }),
        });
      }
      // Salvataggio di una partita
      if (url.includes("/api/save-game")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: "Partita salvata con successo!" }),
        });
      }
      // Eliminazione di una partita salvata
      if (url.includes("/api/delete-game/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: "Partita eliminata con successo!" }),
        });
      }
      // Gestione delle richieste di amicizia (default)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ friendsRequest: [] }),
      });
    });
    mockNavigate.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  test("renderizza lo stato iniziale con 'Select an option' e l'assenza di partite salvate", async () => {
    render(
      <MemoryRouter>
        <PlayervsBot />
      </MemoryRouter>
    );
    // Verifica che venga visualizzato "Select an option"
    expect(screen.getByText(/Select an option/i)).toBeInTheDocument();
    // Attendi che la fetch per le partite salvate finisca ed il componente mostri il messaggio
    await waitFor(() => {
      expect(screen.getByText(/No saved games found :\//i)).toBeInTheDocument();
    });
    // Verifica che il pulsante "Return to the main Menu" sia presente
    expect(screen.getByText(/Return to the main Menu/i)).toBeInTheDocument();
  });

  test("avvia una nuova partita quando si clicca 'New Game'", async () => {
    render(
      <MemoryRouter>
        <PlayervsBot />
      </MemoryRouter>
    );
    const newGameButton = screen.getByRole("button", { name: /New Game/i });
    act(() => {
      fireEvent.click(newGameButton);
    });
    // Dopo aver avviato la partita, i componenti BoardTop e BoardBottom (mock) devono essere visualizzati
    await waitFor(() => {
      expect(screen.getByText(/Mock BoardTop/i)).toBeInTheDocument();
      expect(screen.getByText(/Mock BoardBottom/i)).toBeInTheDocument();
    });
    // Verifica che il pulsante "Save Game" sia visibile (non guest)
    expect(screen.getByRole("button", { name: /Save Game/i })).toBeInTheDocument();
  });

  test("naviga al menu principale quando si clicca 'Return to the main Menu'", () => {
    render(
      <MemoryRouter>
        <PlayervsBot />
      </MemoryRouter>
    );
    const returnButton = screen.getByRole("button", {
      name: /Return to the main Menu/i,
    });
    fireEvent.click(returnButton);
    // Dal momento che isGuest è false, ci aspettiamo "/menu"
    expect(mockNavigate).toHaveBeenCalledWith("/menu");
  });

  test("salva una partita quando si clicca 'Save Game'", async () => {
    render(
      <MemoryRouter>
        <PlayervsBot />
      </MemoryRouter>
    );
    // Avvia una nuova partita
    const newGameButton = screen.getByRole("button", { name: /New Game/i });
    act(() => {
      fireEvent.click(newGameButton);
    });
    await waitFor(() => {
      expect(screen.getByText(/Mock BoardTop/i)).toBeInTheDocument();
    });
    const saveButton = screen.getByRole("button", { name: /Save Game/i });
    act(() => {
      fireEvent.click(saveButton);
    });
    // Verifica che fetch sia chiamato per il salvataggio
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/save-game"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        })
      );
    });
  });

  test("carica una partita salvata quando viene cliccato 'Load'", async () => {
    // Modifica il mock di fetch per restituire una partita salvata
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/saved-games") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([{ _id: "game1", timestamp: new Date().toISOString() }]),
        });
      }
      if (url.includes("/api/saved-games/game1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              gameState: {},
              turnState: {},
              moveState: {},
              botColor: "White",
              playerColor: "Black",
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: "Success" }),
      });
    });

    render(
      <MemoryRouter>
        <PlayervsBot />
      </MemoryRouter>
    );
    // Attendi che la sezione "Saved Games" venga renderizzata
    await waitFor(() => {
      expect(screen.getByText(/Saved Games/i)).toBeInTheDocument();
    });
    // Trova il pulsante "Load" per la partita salvata
    const loadButton = screen.getByRole("button", { name: /Load/i });
    act(() => {
      fireEvent.click(loadButton);
    });
    // Verifica che la chiamata a fetch per il caricamento sia stata effettuata
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/saved-games/game1"),
        expect.any(Object)
      );
    });
  });

  test("elimina una partita salvata quando viene cliccato 'Eliminate'", async () => {
    // Modifica il mock di fetch per restituire una partita salvata
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/saved-games") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([{ _id: "game1", timestamp: new Date().toISOString() }]),
        });
      }
      if (url.includes("/api/delete-game/game1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ message: "Partita eliminata con successo!" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: "Success" }),
      });
    });

    render(
      <MemoryRouter>
        <PlayervsBot />
      </MemoryRouter>
    );
    // Attendi che la sezione "Saved Games" venga renderizzata
    await waitFor(() => {
      expect(screen.getByText(/Saved Games/i)).toBeInTheDocument();
    });
    // Trova il pulsante "Eliminate" per la partita salvata
    const eliminateButton = screen.getByRole("button", { name: /Eliminate/i });
    act(() => {
      fireEvent.click(eliminateButton);
    });
    // Verifica che fetch venga chiamato con DELETE
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/delete-game/game1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });
});
