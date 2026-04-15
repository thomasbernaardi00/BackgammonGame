export default class ThisMove {
  private _fromBarIdx: number | string;
  private _toBarIdx: number;
  private _canGoTo: number[];

  constructor() {
    this._fromBarIdx = -1;
    this._toBarIdx = -1;
    this._canGoTo = [];
  }

  // Metodo statico per creare un nuovo oggetto ThisMove
  public static new = () => new ThisMove();

  // deserializzare un oggetto ThisMove
  public static fromJson(data: any): ThisMove {
    const thisMove = new ThisMove();
    thisMove.fromBarIdx = data.fromBarIdx || -1;
    thisMove.toBarIdx = data.toBarIdx || -1;
    thisMove.canGoTo = Array.isArray(data.canGoTo) ? data.canGoTo : [];
    return thisMove;
  }

  // serializzare ThisMove in formato JSON
  public toJson(): any {
    return {
      fromBarIdx: this._fromBarIdx,
      toBarIdx: this._toBarIdx,
      canGoTo: this._canGoTo
    };
  }

  // Getter e setter 
  public get fromBarIdx() {
    return this._fromBarIdx;
  }
  public set fromBarIdx(value: number | string) {
    this._fromBarIdx = value;
  }

  public get toBarIdx() {
    return this._toBarIdx;
  }
  public set toBarIdx(value: number) {
    this._toBarIdx = value;
  }

  public get canGoTo() {
    return this._canGoTo;
  }
  public set canGoTo(value: number[]) {
    this._canGoTo = value;
  }

  // Metodo per clonare un oggetto ThisMove
  public clone() {
    const newThisMove = new ThisMove();
    newThisMove.fromBarIdx = this._fromBarIdx;
    newThisMove.toBarIdx = this._toBarIdx;
    newThisMove.canGoTo = [...this._canGoTo];

    return newThisMove;
  }
}
