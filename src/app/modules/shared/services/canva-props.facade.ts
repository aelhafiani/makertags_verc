import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { Select, Store } from "@ngxs/store";
import { CanvaPropsState } from "../domaine/state/canva-props/canva-props.reducers";
import { SetCanvaProps } from "../domaine/state/canva-props/canva-props.actions";
import { ICanvaProps } from "../domaine/entities/canva";


@Injectable({providedIn: 'root'})
export class CanvaPropsFacadeService {
    constructor(private store:Store) {}

    @Select(CanvaPropsState.getCanvaProps) canvaProps$?:Observable<ICanvaProps>

    setCanvaProps(canva:ICanvaProps){
        this.store.dispatch(new SetCanvaProps(canva))
    }

    // getNewArt(){
    //     this.store.dispatch(new GetNewArt())
    // }

    

}