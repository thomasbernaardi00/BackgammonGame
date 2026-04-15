import Player from "../logic/models/player";

describe("Player Class", () => {
  test("Dovrebbe creare un nuovo Player con i valori corretti", () => {
    const player = new Player("Alice", "icon.png", "1", "24", "red", "black");

    expect(player._name).toBe("Alice");
    expect(player._icon).toBe("icon.png");
    expect(player._outBarIdx).toBe("1");
    expect(player._endBarIdx).toBe("24");
    expect(player._pieceColor).toBe("red");
    expect(player._pieceBorderColor).toBe("black");
    expect(player._outBar).toEqual([]);
    expect(player._endBar).toEqual([]);
    expect(player._inTheEnd).toBe(false);
  });

  test("Dovrebbe creare un nuovo Player vuoto con Player.new", () => {
    const player = Player.new();

    expect(player._name).toBe("");
    expect(player._icon).toBe("");
    expect(player._outBarIdx).toBe("");
    expect(player._endBarIdx).toBe("");
    expect(player._pieceColor).toBe("");
    expect(player._pieceBorderColor).toBe("");
    expect(player._outBar).toEqual([]);
    expect(player._endBar).toEqual([]);
    expect(player._inTheEnd).toBe(false);
  });

  test("Dovrebbe clonare un Player correttamente", () => {
    const player = new Player("Bob", "icon2.png", "2", "23", "blue", "white");
    player._outBar.push("piece1");
    player._endBar.push("piece2");
    player._inTheEnd = true;

    const clonedPlayer = player.clone();

    expect(clonedPlayer).not.toBe(player); // Deve essere un nuovo oggetto
    expect(clonedPlayer._name).toBe(player._name);
    expect(clonedPlayer._icon).toBe(player._icon);
    expect(clonedPlayer._outBarIdx).toBe(player._outBarIdx);
    expect(clonedPlayer._endBarIdx).toBe(player._endBarIdx);
    expect(clonedPlayer._pieceColor).toBe(player._pieceColor);
    expect(clonedPlayer._pieceBorderColor).toBe(player._pieceBorderColor);
    expect(clonedPlayer._outBar).toEqual(player._outBar);
    expect(clonedPlayer._endBar).toEqual(player._endBar);
    expect(clonedPlayer._inTheEnd).toBe(player._inTheEnd);
  });
});