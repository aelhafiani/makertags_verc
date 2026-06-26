import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";


@Injectable({providedIn: 'root'})
export class googleFontApiService {

   
    apiUrl = "https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyBLc1FKmTDYEUgSy1_ZTmoOyC696OxiROQ"
    constructor(private httpCLient:HttpClient) {}


    getFontList(fonts:string[]){
        let params = new HttpParams();
        fonts.forEach(font=>{
            params = params.append('family', font);
        })
        return this.httpCLient.get(this.apiUrl,{params})
    }

    }