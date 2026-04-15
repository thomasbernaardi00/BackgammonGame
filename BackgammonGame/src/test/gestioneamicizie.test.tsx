/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GestioneAmicizie from "../login/GestioneAmicizie";

// MOCK: Configuriamo il mock di jwt-decode per fornire sia il named export che il default export
jest.mock("jwt-decode", () => {
  const jwtDecodeMock = jest.fn();
  return {
    __esModule: true,
    jwtDecode: jwtDecodeMock,
    default: jwtDecodeMock,
  };
});

import { jwtDecode } from "jwt-decode"; // Rimane uguale nel componente

const mockJwtDecode = jwtDecode as jest.Mock<any, any>;

// MOCK: useNavigate di react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Impostiamo una fake token e il risultato decodificato
const fakeToken = "fake.jwt.token";
const fakeDecoded = { userId: "user123" };

describe("GestioneAmicizie Component", () => {
  beforeEach(() => {
    // Imposta il token in localStorage
    localStorage.setItem("token", fakeToken);
    // Configura il mock di jwtDecode per restituire fakeDecoded
    mockJwtDecode.mockReturnValue(fakeDecoded);

    // MOCK: Global fetch per il recupero dei dati
    global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
      if (url.includes("/api/amici")) {
        // Simula risposta per la lista degli amici (vuota)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      } else if (url.includes("/api/richieste-amici")) {
        // Simula risposta per le richieste di amicizia (vuota di default)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ friendsRequest: [] }),
        });
      } else if (url.includes("/api/aggiungi-amici")) {
        // Simula risposta per l'invio della richiesta
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: "Richiesta inviata" }),
        });
      } else if (url.includes("/api/rispondi-amicizia")) {
        // Simula risposta per la gestione della richiesta
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: "Richiesta gestita" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
    mockNavigate.mockReset();
  });

  test("renderizza il componente mostrando 'Loading' e poi 'No friends' e 'No requests'", async () => {
    render(
      <MemoryRouter>
        <GestioneAmicizie />
      </MemoryRouter>
    );

    // Verifica che venga mostrato inizialmente il messaggio di Loading
    // Se ci sono duplicati, usiamo queryAllByText e verifichiamo che almeno uno sia presente
    expect(screen.getAllByText(/Loading/i).length).toBeGreaterThanOrEqual(1);

    // Attendi che fetchData completi ed il loading finisca
    await waitFor(() => {
      expect(screen.getByText(/No friends :\//i)).toBeInTheDocument();
      expect(screen.getByText(/No requests found :\//i)).toBeInTheDocument();
    });
  });

  test("gestisce l'aggiunta di un amico", async () => {
    render(
      <MemoryRouter>
        <GestioneAmicizie />
      </MemoryRouter>
    );

    // Attendi che i dati vengano caricati (le liste saranno vuote)
    await waitFor(() => {
      expect(screen.getByText(/No friends :\//i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Nome amico") as HTMLInputElement;
    const addButton = screen.getByText("Add Friend");

    // Cambia il valore dell'input
    fireEvent.change(input, { target: { value: "NewFriend" } });
    expect(input.value).toBe("NewFriend");

    // Simula il click sul pulsante
    fireEvent.click(addButton);

    // Verifica che fetch sia stato chiamato con il corretto body (per aggiungere l'amico)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/aggiungi-amici"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ userID: fakeDecoded.userId, friendName: "NewFriend" }),
        })
      );
    });
  });

  test("gestisce la risposta alle richieste di amicizia", async () => {
    // Aggiorna il mock di fetch per restituire una richiesta di amicizia
    (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url.includes("/api/amici")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      } else if (url.includes("/api/richieste-amici")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              friendsRequest: [
                {
                  _id: "req1",
                  from: { _id: "friend1", username: "Friend1" },
                  status: "attesa",
                },
              ],
            }),
        });
      } else if (url.includes("/api/rispondi-amicizia")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: "Richiesta gestita" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter>
        <GestioneAmicizie />
      </MemoryRouter>
    );

    // Attendi che le richieste di amicizia vengano caricate
    await waitFor(() => {
      expect(screen.getByText(/Friend1 - attesa/i)).toBeInTheDocument();
    });

    // Simula il click sul bottone "Accetta"
    const acceptButton = screen.getByText("Accetta");
    fireEvent.click(acceptButton);

    // Verifica che fetch venga chiamato per rispondere alla richiesta
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/rispondi-amicizia"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ userID: fakeDecoded.userId, requestID: "req1", risposta: "accettata" }),
        })
      );
    });

    // Verifica che la richiesta sia stata rimossa dalla UI
    await waitFor(() => {
      expect(screen.queryByText(/Friend1 - attesa/i)).toBeNull();
    });
  });

  test("naviga al menu principale quando si clicca 'Return to the main Menu'", async () => {
    render(
      <MemoryRouter>
        <GestioneAmicizie />
      </MemoryRouter>
    );

    // Trova il pulsante e cliccaci sopra
    const button = screen.getByText("Return to the main Menu");
    fireEvent.click(button);

    // Verifica che useNavigate sia stato chiamato con "/menu"
    expect(mockNavigate).toHaveBeenCalledWith("/menu");
  });
});

