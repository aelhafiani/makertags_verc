import { IArtPage } from "../../entities/art";


  
  export interface NewArtStateModel {
    item:IArtPage
  }



  export class AddNewArt{
    static readonly type = '[Art] add';
    constructor(public payload:{art:IArtPage}){}
  }
  export class GetNewArt{
    static readonly type = '[Art] get';
  }

  export class SetNewArt{
    static readonly type = '[Art] set';
    constructor(public payload:{art:IArtPage}){}
  }



  export class SetContentCanvas{
    static readonly type = '[Art] set content canvas';
    constructor(public payload:{content:any}){}
  }
  export class SetSelectedObj{
    static readonly type = '[Art] set selected obj';
    constructor(public payload:{content:any}){}
  }
  export class GetContentCanvas{
    static readonly type = '[Art] get content canvas';
    
  }

