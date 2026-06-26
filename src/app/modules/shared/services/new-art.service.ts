import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of } from "rxjs";
import { IArtPage } from "../domaine/entities/art";


@Injectable({providedIn: 'root'})
export class ArtService {



    getAll(){
        return of([])
    }
    addNewArt():Observable<IArtPage>{
        return of({} as IArtPage)
    }
    }