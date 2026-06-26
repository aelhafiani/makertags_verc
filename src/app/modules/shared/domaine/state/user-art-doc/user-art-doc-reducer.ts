import { Action, Actions, Selector, State, StateContext } from "@ngxs/store";
import { UserArtDoc } from "../../../services/users_art_docs.service";
import { Injectable } from "@angular/core";
import { CreateUserArtDoc } from "./user-art-doc-actions";


export interface UserArtDocStateModel {
    item:UserArtDoc 
}

const initialState:UserArtDocStateModel  = { item:{
    id:'',
    user_id:'',
    art_doc_id:'',
    created_at:'',
    art_docs:undefined,
}
}
@State<UserArtDocStateModel>({
    
    name: 'UserArtDocState',
    defaults: initialState
  })
@Injectable()
export class UserArtDocState  {
    constructor(public action$: Actions) {

    }


    @Selector()
    static getUserArtDoc(state: UserArtDocStateModel): UserArtDocStateModel {
        return state
    }

    @Action(CreateUserArtDoc)
    createUserArtDoc(ctx: StateContext<UserArtDocStateModel>, action: CreateUserArtDoc) {
        const state = ctx.getState();
        ctx.setState({
            ...state,
            item: action.payload.artDoc
        });

    }
}