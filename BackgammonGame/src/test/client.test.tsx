/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../Client"; // Assicurati che il percorso sia corretto
import { MemoryRouter } from "react-router-dom";

// MOCK: socket.io-client
jest.mock("socket.io-client", () => {
  const mSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn()
  };
  return { io: jest.fn(() => mSocket) };
});

// MOCK: react-hot-toast
jest.mock("react-hot-toast", () => ({
  toast: jest.fn(),
}));

// MOCK: jwt-decode
jest.mock("jwt-decode", () => ({
  jwtDecode: jest.fn(() => ({ username: "testUser", userId: "testId" })),
}));

// MOCK: useNavigate di react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Impostazione globale di fetch: per default restituisce un array vuoto (partite salvate)
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ([]),
});

beforeEach(() => {
  localStorage.clear();
  // Imposta un token fittizio per jwtDecode
  localStorage.setItem("token", "fakeToken");
  jest.clearAllMocks();
});

describe("App Component", () => {
  test("renders initial lobby UI", async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    // Verifica che il componente renda i testi chiave della lobby
    expect(screen.getByText(/Welcome to Backgammon Online!/i)).toBeInTheDocument();
    expect(screen.getByText(/Select game options/i)).toBeInTheDocument();
    expect(screen.getByText(/Create New Game/i)).toBeInTheDocument();
    expect(screen.getByText(/Join Existing Game/i)).toBeInTheDocument();
    expect(screen.getByText(/Find a casual Game/i)).toBeInTheDocument();
    expect(screen.getByText(/Return to the main Menu/i)).toBeInTheDocument();
  });

  test("navigates to menu on 'Return to the main Menu' button click", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    const returnButton = screen.getByText(/Return to the main Menu/i);
    fireEvent.click(returnButton);
    expect(mockNavigate).toHaveBeenCalledWith("/menu");
  });

  test("calls socket.emit on 'Create New Game' click", () => {
    // Recupera il mock di socket
    const { io } = require("socket.io-client");
    const mSocket = io();
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    const createButton = screen.getByText(/Create New Game/i);
    fireEvent.click(createButton);

    expect(mSocket.emit).toHaveBeenCalledWith("createGame", { duration: expect.any(Number) });
  });

  test("calls socket.emit on 'Join Existing Game' click", () => {
    const { io } = require("socket.io-client");
    const mSocket = io();
    // Simula la funzione prompt
    window.prompt = jest.fn().mockReturnValue("game123");

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    const joinButton = screen.getByText(/Join Existing Game/i);
    fireEvent.click(joinButton);

    expect(mSocket.emit).toHaveBeenCalledWith("joinGame", "game123");
  });

  // Puoi aggiungere ulteriori test per altre funzionalità (es. findGame, stopSearching, rollDice, ecc.)
});
