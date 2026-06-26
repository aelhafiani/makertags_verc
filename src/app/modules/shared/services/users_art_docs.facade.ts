import { Injectable } from "@angular/core";
import { Store } from "@ngxs/store";
import { Observable } from "rxjs";
import { UserArtDocStateModel } from "../domaine/state/user-art-doc/user-art-doc-reducer";
import { CreateUserArtDoc } from "../domaine/state/user-art-doc/user-art-doc-actions";

@Injectable({ providedIn: 'root' })
export class UsersArtDocsFacade {
    userArtDoc$ : Observable<UserArtDocStateModel>;

    constructor(private store:Store) {
        this.userArtDoc$ = this.store.select(state => state.UserArtDocState);
    }


    createUserArtDoc(userId:string, artDoc:any){
        this.store.dispatch(new CreateUserArtDoc({userId, artDoc}))
    }
}