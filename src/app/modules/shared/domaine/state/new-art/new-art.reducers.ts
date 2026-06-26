import { Injectable } from "@angular/core";
import { Action, Selector, State, StateContext, Actions ,ofAction} from "@ngxs/store";
import { tap } from "rxjs";

import {  GetNewArt, NewArtStateModel, SetContentCanvas, SetNewArt, SetSelectedObj } from "./new-art.actions";
import { Router } from "@angular/router";



@State<NewArtStateModel>({
    
    name: 'newArtState',
    defaults: {
     item:{
      name:'TestA',
      side:'front',
      canvasContent:{},
      backgroundColor:'#fff',
      selectedObj:{}

     }
    }
  })


@Injectable()
  export class NewArtState  {
    constructor(public action$: Actions,private router:Router) {}


    @Selector()
    static getNewArt(state: NewArtStateModel): NewArtStateModel {
      return state;
    }

    @Action(SetNewArt)
    setNewArt(ctx:StateContext<NewArtStateModel>,action:SetNewArt){
            ctx.patchState({
                item:Object.assign(ctx.getState().item,action.payload.art)
    });
              
   
    }

 

    @Action(GetNewArt)
    getNewArt(ctx:StateContext<NewArtStateModel>,action:GetNewArt){
      return  ctx.patchState({
                item:ctx.getState().item
              });
   
    }

 

  @Action(SetContentCanvas)
  setContentCanvas(ctx:StateContext<NewArtStateModel>,action:SetContentCanvas){
    let artState = Object.assign(ctx.getState().item,{canvasContent:action.payload.content})
    ctx.getState().item = artState
     
    
}


@Action(SetSelectedObj)
setSelectedObj(ctx:StateContext<NewArtStateModel>,action:SetSelectedObj){
  let artState = Object.assign(ctx.getState().item,{selectedObj:action.payload.content})
  ctx.getState().item = artState
   
  
}


  }

