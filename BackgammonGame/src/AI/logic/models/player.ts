export default class Player {
  private _outBar: string[];
  private _endBar: string[];
  private _inTheEnd: boolean;

  constructor(
    private readonly _name: string,
    private readonly _icon: string,
    private readonly _outBarIdx: string,
    private readonly _endBarIdx: string,
    private readonly _pieceColor: string,
    private readonly _pieceBorderColor: string
  ) {
    this._outBar = [];
    this._endBar = [];
    this._inTheEnd = false;
  }

  // Metodo statico per creare un nuovo player
  public static new = () => new Player("", "", "", "", "", "");

  // deserializzare un Player da un oggetto JSON
  public static fromJson(data: any): Player {
    const player = new Player(
      data.name,
      data.icon,
      data.outBarIdx,
      data.endBarIdx,
      data.pieceColor,
      data.pieceBorderColor
    );

  
    player.outBar = data.outBar || [];
    player.endBar = data.endBar || [];
    player.inTheEnd = data.inTheEnd || false;

    return player;
  }

  // serializzare un Player in formato JSON
  public toJson(): any {
    return {
      name: this._name,
      icon: this._icon,
      outBarIdx: this._outBarIdx,
      endBarIdx: this._endBarIdx,
      pieceColor: this._pieceColor,
      pieceBorderColor: this._pieceBorderColor,
      outBar: this._outBar,
      endBar: this._endBar,
      inTheEnd: this._inTheEnd
    };
  }

  public get name(): string {
    return this._name;
  }

  public get icon(): string {
    return this._icon;
  }

  public get outBar(): string[] {
    return this._outBar;
  }

  public set outBar(value: string[]) {
    this._outBar = value;
  }

  public get outBarIdx(): string {
    return this._outBarIdx;
  }

  public get endBar(): string[] {
    return this._endBar;
  }

  public set endBar(value: string[]) {
    this._endBar = value;
  }

  public get endBarIdx(): string {
    return this._endBarIdx;
  }

  public get inTheEnd(): boolean {
    return this._inTheEnd;
  }

  public set inTheEnd(value: boolean) {
    this._inTheEnd = value;
  }

  public get pieceColor(): string {
    return this._pieceColor;
  }

  public get pieceBorderColor(): string {
    return this._pieceBorderColor;
  }

  // Metodo per clonare un Player
  public clone(): Player {
    const newPlayer = new Player(
      this._name,
      this._icon,
      this._outBarIdx,
      this._endBarIdx,
      this._pieceColor,
      this._pieceBorderColor
    );

    // Clona anche i campi derivati
    newPlayer.outBar = [...this.outBar];
    newPlayer.endBar = [...this.endBar];
    newPlayer.inTheEnd = this._inTheEnd;

    return newPlayer;
  }
}
