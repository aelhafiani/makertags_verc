import { ChangeDetectionStrategy, ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, takeUntil } from 'rxjs';
import { BaseComponentComponent } from '../../../shared/shared/base-component/base-component.component';
import { ArtFacadeService } from '../../../shared/services/new-art.facade';
import { IArtDoc } from '../../../shared/domaine/entities/art';
import { NzIconModule } from 'ng-zorro-antd/icon';


export const selectedPageIndexSubj = new BehaviorSubject<number>(0);
export const selectedPage$ = selectedPageIndexSubj.asObservable();

@Component({
  selector: 'maker-tags-pages-selector',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  templateUrl: './pages-selector.component.html',
  styleUrl: './pages-selector.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagesSelectorComponent extends BaseComponentComponent implements OnInit {

  selected = selectedPage$;
  private newArtFacade = inject(ArtFacadeService);
  private cdr = inject(ChangeDetectorRef);
  artDoc?: IArtDoc;

  get canAddBack(): boolean {
    return (this.artDoc?.pages?.length || 0) < 2;
  }

  ngOnInit(): void {
    this.newArtFacade.artDocState$?.pipe(takeUntil(this.destroy$)).subscribe(artDoc => {
      this.artDoc = artDoc.item;
      this.cdr.markForCheck();
    });


    
  }
 
  selectPage(page: number){
    selectedPageIndexSubj.next(page)
  }

  addNewPage(){
    this.newArtFacade.addBackPage()
  
  }
  addBackPage(){
    this.newArtFacade.addBackPage()
  }
  removePage(){
    this.newArtFacade.removePage()
  }

}
