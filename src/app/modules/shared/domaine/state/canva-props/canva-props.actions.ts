
  
  export interface CanvaPropsStateModel {
    width:number,
    height:number
  }

  export class GetCanvaProps{
    static readonly type = '[canvaProps] get';
  }

  export class SetCanvaProps{
    static readonly type = '[canvaProps] set';
    constructor(public payload:CanvaPropsStateModel){}
  }