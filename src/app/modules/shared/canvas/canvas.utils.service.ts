import { Injectable } from "@angular/core";
import { set } from "lodash";
import { BehaviorSubject } from "rxjs";

interface IEditorEvent {
    name:string,
    value:any
}

interface IEditorEventAdd {
    name:string,
    value:any
}

@Injectable({providedIn: 'root'})
export class CanvasUtilsService {

    private  editorEvent:BehaviorSubject<IEditorEvent> = new BehaviorSubject<any>(null)
    public editorEvent$ = this.editorEvent.asObservable();

    private  addElementEvent:BehaviorSubject<IEditorEventAdd> = new BehaviorSubject<any>(null)
    public addElementEvent$ = this.addElementEvent.asObservable();

    constructor() {}

setEditorEvent(event:IEditorEvent){
    this.editorEvent.next(event)
}

setAddElementEvent(event:IEditorEvent){
    this.addElementEvent.next(event)
}
centerElementOnCanvas(canvas: any, element: any) {
        // Get the dimensions of the canvas
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
    
        // Get the dimensions of the element
        const elementWidth = element.width;
        const elementHeight = element.height;
    
        // Calculate the center coordinates of the canvas
        const canvasCenterX = canvasWidth / 2;
        const canvasCenterY = canvasHeight / 2;
    
        // Calculate the position to center the element
        const elementLeft = canvasCenterX - elementWidth / 2;
        const elementTop = canvasCenterY - elementHeight / 2;
    
        return {left : elementLeft , top:elementTop}      
    }

    

}