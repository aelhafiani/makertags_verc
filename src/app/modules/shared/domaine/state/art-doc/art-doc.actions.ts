import { ArtDocFace } from "../../../services/users_art_docs.service";
import {  IArtDoc, IArtPage } from "../../entities/art";

export interface ArtDocStateModel {
    item:IArtDoc
}

export class ResetStore {
  static readonly type = '[App] Reset Store';
}

export class AddNewDocArt{
    static readonly type = '[ArtDoc] add';
    constructor(public payload:{artDoc:IArtDoc}){}
  }
export class SetArtByPage{
    static readonly type = '[ArtDoc] set Doc By Page';
    constructor(public payload:{art:IArtPage , page_index:number}){}
  }
export class AddNewPage{
    static readonly type = '[ArtDoc] add new page';
}

export class AddBackPage{
    static readonly type = '[ArtDoc]  add back page';
    constructor(public payload:{frontpage:IArtPage}){}
}

export class RemovePage{
    static readonly type = '[ArtDoc]  remove page';
}
export class SetPagePreview{
    static readonly type = '[ArtDoc] set Page Preview';
    constructor(public payload:{preview:string , page_index:number}){}
  }
export class GetArtDoc{
    static readonly type = '[ArtDoc] get';
  }

  export class SetArtDoc{
    static readonly type = '[ArtDoc] set';
    constructor(public payload:{artDoc:IArtDoc}){}
  }

  export class LoadArtDoc{
    static readonly type = '[ArtDoc] load';
    constructor(public payload:{id:string}){}
  }

  export class LoadUserArtDoc {
    static readonly type = '[ArtDoc] load user copy';
    constructor(public payload: { id: string }) {}
  }

export class SelectOrCreateArtDoc {
  static readonly type = '[ArtDoc] Select or Create';

  constructor(public payload: { 
    id: string;          // id du modèle original
    artDoc?: IArtDoc;    // optionnel : données complètes si on doit le copier
  }) {}
}

export class UpdateUserArtDocFace {
  static readonly type = '[ArtDoc] Update User Face';
  constructor(public payload: { faceId: string; updates: Partial<ArtDocFace> }) {}
}

  export class SetContentCanvasByPage{
    static readonly type = '[ArtDoc] set content canvas by page';
    constructor(public payload:{content:any , pageIndex :number}){}
  }