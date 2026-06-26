import { Action, Actions, Selector, State, StateContext } from "@ngxs/store";
import { AddBackPage, AddNewDocArt, AddNewPage, ArtDocStateModel, GetArtDoc, LoadArtDoc, LoadUserArtDoc, RemovePage, ResetStore, SelectOrCreateArtDoc, SetArtByPage, SetArtDoc, SetContentCanvasByPage, SetPagePreview, UpdateUserArtDocFace } from "./art-doc.actions";

import { nanoid } from 'nanoid';
import { inject, Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, from, map, switchMap, tap, throwError } from "rxjs";
import { SupabaseService } from "../../../services/supabase.service";
import { Canvas, FabricObject, util } from "fabric";
import { AuthService } from "../../../services/auth.service";
import { UserArtDocsService } from "../../../services/users_art_docs.service";
import { ArtDocsService } from "../../../services/art-docs.service";
const initialState:ArtDocStateModel  = { item:{
  id:nanoid(),
  name:'name',
  categorie:'general',
  preview_realized_art:'',
  status:'draft',
  width:400,
  height:600,
  title:'title example',
  is_premuim:false,
  is_3d:false,
  exported_times:0,
  reviews:[],
  description:'description example',
  pages:[
      {
          id:nanoid(),
          name:'name',
          side:'front',
          preview:'',
          canvasContent:{},
          backgroundColor:'#fff',
          selectedObj:{}
          
      }
  ] 
}
  

}
@State<ArtDocStateModel>({
    
    name: 'ArtDocState',
    defaults: initialState
  })


  @Injectable()
  export class ArtDocState  {
    constructor(public action$: Actions,private authService:AuthService, private artDocService:ArtDocsService, private userArtDocService:UserArtDocsService ) {

    }

    // firestore = inject(Firestore);

    @Selector()
    static getArtDoc(state: ArtDocStateModel): ArtDocStateModel {
        return state;
    }

    
    @Action(AddNewDocArt)
    addNewDocArt(ctx:StateContext<ArtDocStateModel>,action:AddNewDocArt){
            ctx.patchState({
                item:Object.assign(ctx.getState().item,action.payload.artDoc)
              });
              
   
    }


    @Action(ResetStore)
    resetStore(ctx: StateContext<ArtDocStateModel>) {
      ctx.setState(initialState);  // Reseta o estado ao valor inicial
    }

    
    @Action(LoadArtDoc)
    loadArtDoc(ctx: StateContext<ArtDocStateModel>, action: LoadArtDoc) {
      const id = action.payload.id;

      // Always fetch fresh from DB — no cache, so admin edits are visible immediately
      return from(this.artDocService.getArtDocById(id)).pipe(
        tap((artDoc) => ctx.patchState({ item: artDoc })),
        catchError((error) => {
          console.error('❌ Error loading art doc:', error);
          return throwError(() => error);
        })
      );
    }

    @Action(LoadUserArtDoc)
    loadUserArtDoc(ctx: StateContext<ArtDocStateModel>, action: LoadUserArtDoc) {
      const state = ctx.getState();
      const id = action.payload.id;

      // Always fetch fresh from DB — no cache
      return from(
        this.authService.supabaseService.client.auth.getSession().then(({ data: sessionData }) => {
          const userId = sessionData?.session?.user?.id;
          if (!userId) throw new Error('User not logged in');
          return this.userArtDocService.getUserArtDocById(userId, id);
        })
      ).pipe(
        tap((artDoc) => ctx.patchState({ item: artDoc })),
        catchError((error) => {
          console.error('❌ Error loading user art doc:', error);
          return throwError(() => error);
        })
      );
    }

@Action(SelectOrCreateArtDoc)
async selectOrCreateArtDoc(ctx: StateContext<ArtDocStateModel>, action: SelectOrCreateArtDoc) {
  const session = this.authService.getCurrentUserSession() || await this.authService.signInAsGuest() ;
  // const user = await this.authService.signInAsGuest() ;
  const userId = session?.user?.id;
  const role = session?.user?.app_role || 'guest-user';
  const { id } = action.payload;

  if (!userId) return;

  // ADMIN → charge directement le modèle original
  if (role === 'admin') {
    return ctx.dispatch(new LoadArtDoc({ id }));
  }

  // USER → récupère la copie utilisateur ou la crée
    return from(this.userArtDocService.getOrCreateUserArtDoc(userId, id)).pipe(
    tap((userDoc) => ctx.patchState({ item: userDoc })),
    catchError((err) => {
      console.error('❌ Error loading/creating user doc:', err);
      return throwError(() => err);
    })
  );

}

@Action(UpdateUserArtDocFace)
updateUserArtDocFace(ctx: StateContext<ArtDocStateModel>, action: UpdateUserArtDocFace) {
  const { faceId, updates } = action.payload;

  return from(this.userArtDocService.updateUserArtDocFace(faceId, updates)).pipe(
    tap(() => {
      const state = ctx.getState();
      const updatedPages = state.item?.pages?.map(p =>
        p.id === faceId ? { ...p, ...updates } : p
      );
      ctx.patchState({
        item: { ...state.item, pages: updatedPages }
      });
    }),
    catchError(err => {
      console.error('❌ Error updating user face:', err);
      return throwError(() => err);
    })
  );
}

@Action(SetArtByPage)
setArtByPage(ctx:StateContext<ArtDocStateModel>,action:SetArtByPage){
        let page = ctx.getState().item.pages[action.payload.page_index];
       page = Object.assign(page,action.payload.art) ; 

        ctx.patchState({
          item:ctx.getState().item
     });
   
    }

  @Action(SetPagePreview)
  setPagePreview(ctx: StateContext<ArtDocStateModel>, action: SetPagePreview) {
    const state = ctx.getState();
    const pages = state.item.pages.map((p, i) =>
      i === action.payload.page_index ? { ...p, preview: action.payload.preview } : p
    );
    ctx.patchState({ item: { ...state.item, pages } });
  }
    @Action(SetContentCanvasByPage)
    setContentCanvasByPage(ctx:StateContext<ArtDocStateModel>,action:SetContentCanvasByPage){
        const page = ctx.getState().item.pages[action.payload.pageIndex];
        page.canvasContent = action.payload.content;
  }

    @Action(GetArtDoc)
    getArtDoc(ctx:StateContext<ArtDocStateModel>,action:GetArtDoc){
      return  ctx.patchState({
                item:ctx.getState().item
              });
       
        }
    
    @Action(AddNewPage)
    addNewPage(ctx:StateContext<ArtDocStateModel>,action:AddNewPage){
      const newPage = {
        id:nanoid(),
        name:'name',
        preview:'',
        side:'back',
        width:ctx.getState().item.width,
        height:ctx.getState().item.height,
        canvasContent:{},
        backgroundColor:'#fff',

    }
    ctx.getState().item.pages.push(newPage);
    
  }

  @Action(AddBackPage)
 async  addBackPage(ctx:StateContext<ArtDocStateModel>,action:AddBackPage){
    if(ctx.getState().item.pages.length < 2){
        const canvasContent = action.payload.frontpage.canvasContent;

         const frontContent = action.payload.frontpage.canvasContent;
        
          // Load the Fabric canvas from JSON (Fabric v6 syntax)
          let tempCanvas = new Canvas();
          await tempCanvas.loadFromJSON(frontContent);
          tempCanvas.renderAll();
        
          let preview = '';
                // ✅ Keep only the first object (layer 0)
          const allObjects = tempCanvas.getObjects();
          if (allObjects.length > 1) {
            let  first = allObjects[0];
            first.toObject = (function(toObject: () => any) {
              return function(this: FabricObject) {
                return Object.assign(toObject.call(this), { lockedBackground: true });
              }
            })(first.toObject);
            
            tempCanvas.clear(); // remove everything
            tempCanvas.add(first); // keep only layer 0
             // ✅ Générer un aperçu base64 (preview)
             tempCanvas.backgroundColor = frontContent.backgroundColor || '#fff';
             tempCanvas.renderAll();


            preview = tempCanvas.toDataURL({
                format: 'png',
                quality: 1,
                multiplier: 1, 
              });
          }
        
        // ✅ Export clean JSON for the back page
        const backJson = tempCanvas.toJSON();
        const backPage = {
        id:nanoid(),
        name:'name',
        preview,
        side:'back',
        size:action.payload.frontpage.size,
        width:ctx.getState().item.width,
        height:ctx.getState().item.height,
        canvasContent:backJson,
        backgroundColor:action.payload.frontpage.backgroundColor || '#fff',

    }
      ctx.getState().item.pages.push(backPage);
    }
  }

    @Action(RemovePage)
    removePage(ctx:StateContext<ArtDocStateModel>,action:RemovePage){
      if(ctx.getState().item.pages.length > 1){
        ctx.getState().item.pages.pop();
      }


    
  }

    @Action(SetArtDoc)
    setIArtDoc(ctx:StateContext<ArtDocStateModel>,action:SetArtDoc){
      return  ctx.patchState({
                item:action.payload.artDoc
              });
       
        }
    }
