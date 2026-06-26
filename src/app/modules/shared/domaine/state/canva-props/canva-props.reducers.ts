import { Action, Selector, State, StateContext } from "@ngxs/store";
import { CanvaPropsStateModel, GetCanvaProps, SetCanvaProps } from "./canva-props.actions";
import { Injectable } from "@angular/core";



@State<CanvaPropsStateModel>({
    
    name: 'CanvaPropsState',
    defaults: {
    width:300,
    height:400
    }
})

@Injectable()
export class CanvaPropsState  {

  @Selector()
  static getCanvaProps(state: CanvaPropsStateModel): CanvaPropsStateModel {
    return state;
  }
    
    @Action(SetCanvaProps)
    setCanvaProps(ctx:StateContext<CanvaPropsStateModel>,action:SetCanvaProps){
            ctx.patchState({
                width:action.payload.width,
                height:action.payload.height
              });              
    }

  }