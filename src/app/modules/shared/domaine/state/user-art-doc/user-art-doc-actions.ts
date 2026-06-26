import { UserArtDoc } from "../../../services/users_art_docs.service";
import { IArtDoc } from "../../entities/art";

export class CreateUserArtDoc{
    static readonly type = '[UserArtDoc] create';
    constructor(public payload:{userId:string, artDoc:UserArtDoc}){}

}

export class UpdateUserArtDocFace{
    static readonly type = '[UserArtDoc] update face';
    constructor(public payload:{userArtDoc:UserArtDoc}){}
}

export class GetUserArtDoc{
    static readonly type = '[UserArtDoc] get';
    constructor(public payload:{id:string}){}
}