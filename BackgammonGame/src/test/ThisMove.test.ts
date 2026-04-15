import ThisMove from "../logic/models/this-move";

describe("ThisMove Class", () => {
  test("Dovrebbe inizializzare correttamente un nuovo movimento", () => {
    const move = new ThisMove();

    expect(move._fromBarIdx).toBe(-1);
    expect(move._toBarIdx).toBe(-1);
    expect(move._canGoTo).toEqual([]);
  });

  test("Dovrebbe creare un nuovo ThisMove con ThisMove.new()", () => {
    const move = ThisMove.new();

    expect(move).toBeInstanceOf(ThisMove);
    expect(move._fromBarIdx).toBe(-1);
    expect(move._toBarIdx).toBe(-1);
    expect(move._canGoTo).toEqual([]);
  });

  test("Dovrebbe clonare un ThisMove correttamente", () => {
    const move = new ThisMove();
    move._fromBarIdx = 3;
    move._toBarIdx = 12;
    move._canGoTo = [5, 8, 13];

    const clonedMove = move.clone();

    expect(clonedMove).not.toBe(move); // Deve essere un nuovo oggetto
    expect(clonedMove._fromBarIdx).toBe(3);
    expect(clonedMove._toBarIdx).toBe(12);
    expect(clonedMove._canGoTo).toEqual([5, 8, 13]);

    // Assicura che l'array sia copiato, non referenziato
    clonedMove._canGoTo.push(20);
    expect(move._canGoTo).not.toContain(20);
  });
});