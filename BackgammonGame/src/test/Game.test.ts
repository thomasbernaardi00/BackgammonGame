import Game from "../logic/models/game";
import Player from "../logic/models/game";

describe("Game Class", () => {
  test("Dovrebbe inizializzare correttamente una nuova partita", () => {
    const game = new Game();

    expect(game._gameOn).toBe(false);
    expect(game._board).toEqual(Game.initialState());
    
    expect(game._whitePlayer.constructor.name).toBe("Player");
    expect(game._whitePlayer._name).toBe("White");
    expect(game._whitePlayer._icon).toBe("⚪ WHITE ⚪");

    expect(game._blackPlayer.constructor.name).toBe("Player");
    expect(game._blackPlayer._name).toBe("Black");
    expect(game._blackPlayer._icon).toBe("⚫ BLACK ⚫");
  });

  test("Dovrebbe creare un nuovo Game con Game.new()", () => {
    const game = Game.new();

    expect(game).toBeInstanceOf(Game);
    expect(game._gameOn).toBe(false);
    expect(game._board).toEqual(Game.initialState());
  });

  test("Dovrebbe clonare un Game correttamente", () => {
    const game = new Game();
    game._gameOn = true;

    const clonedGame = game.clone();

    expect(clonedGame).not.toBe(game); // Deve essere un nuovo oggetto
    expect(clonedGame._gameOn).toBe(true);
    expect(clonedGame._board).toEqual(game._board);
    
    expect(clonedGame._whitePlayer).not.toBe(game._whitePlayer);
    expect(clonedGame._blackPlayer).not.toBe(game._blackPlayer);
    expect(clonedGame._whitePlayer._name).toBe("White");
    expect(clonedGame._blackPlayer._name).toBe("Black");
  });
});