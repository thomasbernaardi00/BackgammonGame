import ThisTurn from "../logic/models/this-turn";
import Player from "../logic/models/player";

describe("ThisTurn Class", () => {
  test("Dovrebbe inizializzare correttamente un nuovo turno (senza dadi)", () => {
    const turn = new ThisTurn(Player.new(), Player.new(), [], false);

    expect(turn._rolledDice).toBe(false);
    expect(turn._maxMoves).toBe(0);
    expect(turn._movesMade).toBe(0);
    expect(turn._dices).toEqual([]);
  });

  test("Dovrebbe inizializzare correttamente un nuovo turno con dadi normali", () => {
    const turn = new ThisTurn(Player.new(), Player.new(), [3, 5], true);

    expect(turn._rolledDice).toBe(true);
    expect(turn._maxMoves).toBe(8); // 3 + 5
    expect(turn._movesMade).toBe(0);
    expect(turn._dices).toEqual([3, 5]);
  });

  test("Dovrebbe inizializzare un turno con doppio e raddoppiare i dadi", () => {
    const turn = new ThisTurn(Player.new(), Player.new(), [4, 4], true);

    expect(turn._rolledDice).toBe(true);
    expect(turn._maxMoves).toBe(16); // 4 + 4 + 4 + 4
    expect(turn._movesMade).toBe(0);
    expect(turn._dices).toEqual([4, 4, 4, 4]); // Doppio qunidi viene aggiunto due volte
  });

  test("Dovrebbe creare un nuovo turno con ThisTurn.new()", () => {
    const turn = ThisTurn.new();

    expect(turn).toBeInstanceOf(ThisTurn);
    expect(turn._rolledDice).toBe(false);
    expect(turn._maxMoves).toBe(0);
    expect(turn._movesMade).toBe(0);
    expect(turn._dices).toEqual([]);
  });

  test("Dovrebbe clonare un turno correttamente", () => {
    const originalTurn = new ThisTurn(Player.new(), Player.new(), [2, 6], true);
    originalTurn._movesMade = 3;

    const clonedTurn = originalTurn.clone();

    expect(clonedTurn).not.toBe(originalTurn);
    expect(clonedTurn._rolledDice).toBe(true);
    expect(clonedTurn._maxMoves).toBe(8);
    expect(clonedTurn._movesMade).toBe(3);
    expect(clonedTurn._dices).toEqual([2, 6]);
  });
});