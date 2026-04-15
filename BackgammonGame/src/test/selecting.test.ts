// src/test/selecting.test.ts
import { selecting } from "../logic/events/select"; // Assicurati che il path sia corretto
import Game from "../logic/models/game";
import ThisTurn from "../logic/models/this-turn";
import ThisMove from "../logic/models/this-move";
import { toast } from "react-hot-toast";

// MOCK: Simula la funzione toast (e usa anche un mock per toast.error se necessario)
jest.mock("react-hot-toast", () => ({
  toast: jest.fn(),
}));

// Crea un dummy socket con un metodo emit mockato
const createDummySocket = () => {
  return {
    emit: jest.fn(),
  };
};

// Dummy dummy "io" (può essere un oggetto vuoto, visto che nei rami che testiamo non viene usato)
const dummyIo = {} as any;

// Creiamo dei dummy oggetti per game, thisTurn e thisMove
const createDummyGame = (gameOn: boolean, board: string[][] = []) => {
  return {
    _gameOn: gameOn,
    _board: board,
    // eventuali metodi se necessari (ad esempio clone o toJson) possono essere mockati se vengono usati
  } as unknown as Game;
};

const createDummyThisTurn = (rolledDice: boolean, turnPlayerProps = {}, opponentPlayerProps = {}) => {
  return {
    _rolledDice: rolledDice,
    _turnPlayer: {
      _name: "White",
      _outBar: [],
      _inTheEnd: false,
      _outBarIdx: 100, // un indice arbitrario per out bar
      _endBarIdx: 200, // un indice arbitrario per end bar
      _icon: "♔",
      ...turnPlayerProps,
    },
    _opponentPlayer: {
      _name: "Black",
      ...opponentPlayerProps,
    },
    // Per semplicità aggiungiamo _maxMoves = 1
    _maxMoves: 1,
  } as unknown as ThisTurn;
};

const createDummyThisMove = (fromBarIdx = -1, toBarIdx = -1, canGoTo: number[] = []) => {
  return {
    _fromBarIdx: fromBarIdx,
    _toBarIdx: toBarIdx,
    _canGoTo: canGoTo,
  } as unknown as ThisMove;
};

describe("selecting function", () => {
  let socket: any;
  const gameid = "testGameId";

  beforeEach(() => {
    socket = createDummySocket();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should return early with toast if game is not on", () => {
    const game = createDummyGame(false); // game._gameOn false
    const thisTurn = createDummyThisTurn(true);
    const thisMove = createDummyThisMove();

    const [returnedGame, returnedTurn, returnedMove] = selecting(5, game, thisTurn, thisMove, socket, dummyIo, gameid);

    // Verifica che venga emesso un toast con il messaggio "Begin a Game first!"
    expect(socket.emit).toHaveBeenCalledWith("showToast", {
      message: "Begin a Game first!",
      style: expect.any(Object),
    });
    // Verifica che i parametri ritornati siano gli stessi (non modificati)
    expect(returnedGame).toBe(game);
    expect(returnedTurn).toBe(thisTurn);
    expect(returnedMove).toBe(thisMove);
  });

  test("should return early with toast if dice have not been rolled", () => {
    // game on true, ma _rolledDice false
    const game = createDummyGame(true, [
      ["White"], // board[0]
      ["Black"],
    ]);
    const thisTurn = createDummyThisTurn(false); // rolledDice false
    const thisMove = createDummyThisMove();

    const [returnedGame, returnedTurn, returnedMove] = selecting(0, game, thisTurn, thisMove, socket, dummyIo, gameid);

    expect(socket.emit).toHaveBeenCalledWith("showToast", {
      message: "Roll a dice first!",
      style: expect.any(Object),
    });
    expect(returnedGame).toBe(game);
    expect(returnedTurn).toBe(thisTurn);
    expect(returnedMove).toBe(thisMove);
  });

  test("should deselect 'from' when the same index is selected", () => {
    // Per testare il branch di deselection, impostiamo thisMove._fromBarIdx uguale all'indice passato
    const game = createDummyGame(true, [
      ["White", "White"],
    ]);
    const thisTurn = createDummyThisTurn(true);
    // Impostiamo _fromBarIdx a 0 e _toBarIdx a -1, _canGoTo vuoto
    const thisMove = createDummyThisMove(0, -1, []);

    const [returnedGame, returnedTurn, returnedMove] = selecting(0, game, thisTurn, thisMove, socket, dummyIo, gameid);
    // In questo ramo la funzione dovrebbe "deselezionare" il movimento: crea un nuovo ThisMove
    expect(returnedMove._fromBarIdx).toBe(-1);
  });

  test("should return early with toast when selecting an empty main bar", () => {
    // Test per la condizione in cui si seleziona un main bar vuoto.
    const game = createDummyGame(true, [
      [], // board[0] è vuota
      ["White"],
    ]);
    const thisTurn = createDummyThisTurn(true);
    const thisMove = createDummyThisMove();

    const [returnedGame, returnedTurn, returnedMove] = selecting(0, game, thisTurn, thisMove, socket, dummyIo, gameid);
    expect(socket.emit).toHaveBeenCalledWith("showToast", {
      message: "You can't select an empty bar.",
      style: expect.any(Object),
    });
    expect(returnedGame).toBe(game);
    expect(returnedTurn).toBe(thisTurn);
    expect(returnedMove).toBe(thisMove);
  });

  // Altri test potrebbero essere aggiunti per verificare ulteriori branch,
  // come la selezione dei bar dell'avversario, la gestione dei pezzi dall'out bar, ecc.
});
