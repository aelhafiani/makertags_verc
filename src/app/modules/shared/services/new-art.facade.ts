import { Injectable } from "@angular/core";
import { from, Observable, of, switchMap } from "rxjs";
import { IArtDoc, IArtPage } from "../domaine/entities/art";
import { InitState, Select, Store } from "@ngxs/store";
import { NewArtState } from "../domaine/state/new-art/new-art.reducers";
import { GetNewArt, NewArtStateModel, SetContentCanvas, SetNewArt, SetSelectedObj } from "../domaine/state/new-art/new-art.actions";
import { AddBackPage, AddNewPage, ArtDocStateModel, LoadArtDoc, RemovePage, ResetStore, SelectOrCreateArtDoc, SetArtByPage, SetArtDoc, SetContentCanvasByPage, SetPagePreview, UpdateUserArtDocFace } from "../domaine/state/art-doc/art-doc.actions";
import { ArtDocState } from "../domaine/state/art-doc/art-doc.reducer";
import { ArtDocFace } from "./users_art_docs.service";


@Injectable({providedIn: 'root'})
export class ArtFacadeService {
     artDocState$: Observable<ArtDocStateModel>;
     newArtState$?:Observable<NewArtStateModel>
    constructor(private store:Store) {
         this.artDocState$ = this.store.select(ArtDocState.getArtDoc);
         this.newArtState$ = this.store.select(NewArtState.getNewArt);
    }



    setNewArt(art:IArtPage){
        this.store.dispatch(new SetNewArt({art:art}))
    }


    initArtDoc(){
        this.store.dispatch(new ResetStore())
    }
    addNewPage(){
        this.store.dispatch(new AddNewPage())
    }
    addBackPage(){
        const frontPage = this.store.selectSnapshot(ArtDocState.getArtDoc).item.pages[0]

        this.store.dispatch(new AddBackPage({frontpage:frontPage}))
    }
    removePage(){
        this.store.dispatch(new RemovePage())
    }
    setArtByPage(art:IArtPage , index:number){
        this.store.dispatch(new SetArtByPage({art , page_index:index}))
    }
    setArtDoc(art:IArtDoc){
        this.store.dispatch(new SetArtDoc({artDoc:art}))
    }
    setPagePreview(priview:string , index:number){
        this.store.dispatch(new SetPagePreview({preview:priview , page_index:index}))
    }
    
    setSelectedPage(){
        this.store.dispatch(new SetSelectedObj({content:null}))
    }

    setContentCanvas(content:any){
        this.store.dispatch(new SetContentCanvas({content:content}))
    }

    setContentCanvasByPage(content:any , index:number){
        this.store.dispatch(new SetContentCanvasByPage({content:content , pageIndex:index}))
    
    }
    loadArtDoc(artId:string){
        this.store.dispatch(new LoadArtDoc({id:artId}))
    }
    
    selectOrCreateArtDoc(id: string): Observable<void> {
        return this.store.dispatch(new SelectOrCreateArtDoc({ id }));
      }
    
       get currentArtDoc(): IArtDoc | null {
        return this.store.selectSnapshot(ArtDocState.getArtDoc).item || null;
      }
    updateUserArtDocFace(faceId: string, updates: Partial<ArtDocFace>): Observable<void> {
          return this.store.dispatch(new UpdateUserArtDocFace({ faceId, updates }));
        }
    seSelectedObj(content:any){
        this.store.dispatch(new SetSelectedObj({content:content}))
    }

    getNewArt(){
        this.store.dispatch(new GetNewArt())
    }

    resetArtStore(){
        this.store.dispatch(new ResetStore());

    }



}