import Player from "./player";

export default class Game {
  private _gameOn: boolean;
  private _board: string[][];  
  private _whitePlayer: Player;
  private _blackPlayer: Player;
  private _isRanked: boolean;

  constructor() {
    this._gameOn = false;
    this._board = Game.initialState();
    this._isRanked = false;
    this._whitePlayer = new Player(
      "White",
      "⚪ WHITE ⚪",
      "WhiteOutBar",
      "WhiteEndBar",
      "White",
      "1px solid black"
    );
    this._blackPlayer = new Player(
      "Black",
      "⚫ BLACK ⚫",
      "BlackOutBar",
      "BlackEndBar",
      "Black",
      "1px solid #e9e2d6"
    );
  }

  // Metodo statico per creare una nuova partita
  public static new(): Game {
    return new Game(); // Assicura che sia un'istanza
  }
  

  // Stato iniziale della scacchiera
  public static initialState = () => [
    ["White", "White", "White", "White", "White"],
    [],
    [],
    [],
    ["Black", "Black", "Black"],
    [],
    ["Black", "Black", "Black", "Black", "Black"],
    [],
    [],
    [],
    [],
    ["White", "White"],
    ["Black", "Black", "Black", "Black", "Black"],
    [],
    [],
    [],
    ["White", "White", "White"],
    [],
    ["White", "White", "White", "White", "White"],
    [],
    [],
    [],
    [],
    ["Black", "Black"],
  ];

  // Metodo per deserializzare l'oggetto Game
  public static fromJson(data: any): Game {
    const game = new Game();

    game._gameOn = data.gameOn;
    game._board = data.board;
    game._isRanked = data.isRanked;
    game._whitePlayer = Player.fromJson(data.whitePlayer);
    game._blackPlayer = Player.fromJson(data.blackPlayer);
    

    return game;
  }

  // serializzare l'oggetto Game
  public toJson() {
    return {
      gameOn: this._gameOn,
      board: this._board,
      whitePlayer: this._whitePlayer.toJson(), 
      blackPlayer: this._blackPlayer.toJson(),
      isRanked: this._isRanked, 
    };
  }

  // Getter e setter 
  public get gameOn(): boolean {
    return this._gameOn;
  }
  public set gameOn(value: boolean) {
    this._gameOn = value;
  }

  public get board(): string[][] {
    return this._board;
  }
  public set board(value: string[][]) {
    this._board = value;
  }

  public get whitePlayer(): Player {
    return this._whitePlayer;
  }
  public set whitePlayer(value: Player) {
    this._whitePlayer = value;
  }

  public get blackPlayer(): Player {
    return this._blackPlayer;
  }
  public set blackPlayer(value: Player) {
    this._blackPlayer = value;
  }

  public get isRanked(): boolean {
    return this._isRanked;
  }
  public set isRanked(value: boolean) {
    this._isRanked = value;
  }

  // Metodo di clonazione
  public clone() {
    const newGame = new Game();
    newGame.gameOn = this._gameOn;
    newGame.board = [...this._board];
    newGame.whitePlayer = this._whitePlayer.clone();
    newGame.blackPlayer = this.blackPlayer.clone();
    newGame.isRanked = this._isRanked;
    return newGame;
  }
}
