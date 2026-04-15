import { TextEncoder, TextDecoder } from "util";

// Assicura che TextEncoder e TextDecoder siano definiti (necessario per alcuni ambienti di test)
Object.assign(global, { TextDecoder, TextEncoder });
/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
// Assicura metodi come toBeInTheDocument()
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Classifica from "../leaderboard/Classifica";
console.log("Importato Classifica:", Classifica);
// Mock della fetch API
beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock di `fetch` per evitare l'errore `fetch is not defined`
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    })
  ) as jest.Mock;

  // Silenzia `console.error` per evitare log di errori nei test
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("🟢 Classifica Component", () => {
  test("dovrebbe mostrare il messaggio di caricamento inizialmente", async () => {
    (fetch as jest.Mock).mockImplementationOnce(() =>
      new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => [] }), 100))
    );
  
    await act(async () => {
      render(
        <MemoryRouter>
          <Classifica />
        </MemoryRouter>
      );
    });
    expect(screen.getByText(/loading.../i)).toBeInTheDocument();
  });

  test("dovrebbe mostrare la classifica quando i dati sono caricati", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { username: "Player1", score: 100 },
        { username: "Player2", score: 90 },
        { username: "Player3", score: 80 },
      ],
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <Classifica />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Player1/i)).toBeInTheDocument();
      expect(screen.getByText(/100 points/i)).toBeInTheDocument();
      expect(screen.getByText(/Player2/i)).toBeInTheDocument();
      expect(screen.getByText(/90 points/i)).toBeInTheDocument();
      expect(screen.getByText(/Player3/i)).toBeInTheDocument();
      expect(screen.getByText(/80 points/i)).toBeInTheDocument();
    });
  });

  test("dovrebbe mostrare il messaggio quando la classifica è vuota", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <Classifica />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/no player found/i)).toBeInTheDocument();
    });
  });

  test("dovrebbe gestire gli errori della fetch", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false, // Simula un errore lato server
      json: async () => ({ message: "Errore nel caricamento" }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <Classifica />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/no player found/i)).toBeInTheDocument();
    });
  });
});
