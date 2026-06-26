import { IReview } from "./review"

// export interface IArt {
//     id?:string,
//     name?:string,
//     canvasContent?:any,
//     backgroundColor?:string
//     selectedObj?:any,
//     size?:string
    


// }


export interface IArtDoc {

    id:any,
    original_id?:string,
    name:string,
    categorie:string,
    reviews:IReview[],
    preview_realized_art:any,
    generated_preview_url?:string,
    thumbnails?:string,
    video?:string,
    pages:IArtPage[],
    status:string,
    title:string,
    description:string,
    tags?:string[],
    size?:string,
    width:number,
    height:number,
    is_premuim:boolean,
    is_3d:boolean,
    exported_times:number,
    firestore_id?:string,
    type?:'original' | 'copy'
}

export interface IArtPage {
    id?:string,
    name?:string,
    preview?:string,
    side :string,
    canvasContent?:any,
    backgroundColor?:string
    selectedObj?:any,
    size?:string 
}