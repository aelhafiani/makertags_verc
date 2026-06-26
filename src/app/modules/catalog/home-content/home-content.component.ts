import { Component, HostListener, Inject, inject, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../shared/services/auth.service';
import { MetaService } from '../../shared/services/meta.service';
import { ArtDocsService } from '../../shared/services/art-docs.service';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { CategoriesService } from '../../shared/services/categories.service';
import { ArtFacadeService } from '../../shared/services/new-art.facade';
import { TranslateContentPipe } from '../../shared/pipes/translate-content.pipe';

@Component({
  selector: 'maker-tags-home-content',
  standalone: true,
  imports: [CommonModule, RouterModule, NzSkeletonModule, TranslocoModule, TranslateContentPipe],
  templateUrl: './home-content.component.html',
  styleUrl: './home-content.component.scss',
})
export class HomeContentComponent {
  private transloco = inject(TranslocoService);
  activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  deferredPrompt: any;
  canInstall = false;
  loading = signal(false);
   categories = signal<any[]>([]);
  constructor(
    private artDocsService: ArtDocsService,
    private ArtFacadeService: ArtFacadeService,
    private authService:AuthService, private router:Router,@Inject(PLATFORM_ID) private platformId: any, private categoriesService:  CategoriesService){
      setTimeout(() => {
      this.loading.set(false);
    }, 2000);
  }
    
  defaultTouch = { x: 0, y: 0, time: 0 };
  metaService = inject(MetaService);
 
  artsList:any[] = []
  indicators:boolean = true
  controls:boolean = true
  selectedIndex = 0
  slidesStore = [

    {
      id: '1',
      title: 'Slide 1',
      imge:'model1.jpg'
    },
    {
      id: '2',
      title: 'Slide 2',
      imge:'model2.jpg'
    },
    {
      id: '3',
      title: 'Slide 3',
      imge:'model3.jpg'
    },
    {
      id: '4',
      title: 'Slide 1',
      imge:'model4.jpg'
    },
    {
      id: '5',
      title: 'Slide 2',
      imge:'model5.jpg'
    },
    {
      id: '6',
      title: 'Slide 3',
      imge:'model6.jpg'
    },
    {
      id: '7',
      title: 'Slide 1',
      imge:'model7.jpg'
    },
    {
      id: '8',
      title: 'Slide 2',
      imge:'model8.jpg'
    },
    {
      id: '9',
      title: 'Slide 3',
      imge:'model9.jpg'
    }
  ]
  get isAuthentified(){
    return this.authService.isLoggedIn;
  } 
 
  selectImage(index:number){

    this.selectedIndex = index
  }
   showInstallPrompt() {
  // this.pwaService.triggerInstallPrompt();
}
 async ngOnInit() {
    // const artDocs = await this.artDocsService.getArtDocs();
    // console.log('Art Docs:', artDocs);
     try {
      const data = await this.categoriesService.getVisibleCategories();
      this.categories.set(data ?? []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      this.loading.set(false);
    }
  
    this.getArtsList()
    this.metaService.updateMeta(
         'Gift Tags Maker | Printable & Customizable Designs',
        'Create personalized gift tags with our easy-to-use gift tags maker. Browse printable templates and customize designs for any occasion to add a unique touch to your gifts.',
        'assets/logo.png',
         'gift tags, printable gift tags, customizable gift tags, gift tag maker, personalized gift tags, DIY gift tags'
    );
if (isPlatformBrowser(this.platformId)){
    // window.addEventListener('beforeinstallprompt', (event: any) => {
    //   event.preventDefault(); // Stop the browser from showing the default prompt
    //   this.deferredPrompt = event; // Save the event for later use
    //   this.canInstall = true; // Show the install button
    // });

    // window.addEventListener('appinstalled', () => {
    //   console.log('PWA installed successfully');
    //   this.canInstall = false; // Hide the install button
    // });
  }
  }
  installApp() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt(); // Show the prompt
      this.deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        this.deferredPrompt = null; // Reset the deferred prompt
        this.canInstall = false;
      });
    }
  }
  
  goTodetail(art:any){
    const title = encodeURIComponent(art.title.replace(/\s+/g, '-'));
    if(art.firestore_id){
     this.router.navigate(['/tags', title, art.firestore_id]);
    }else{
      this.router.navigate(['/tags', title, art.id]);
    }
  
  }
  onPrevClick(){
    if(this.selectedIndex === 0){
      this.selectedIndex = this.slidesStore.length - 1
    }else{
      this.selectedIndex--
    }
  }
  onNextClick(){
    if(this.selectedIndex === this.slidesStore.length -1 ){
      this.selectedIndex = 0
    }else{
      this.selectedIndex++
    }
  }
  getArtsList(){
    this.artsList = []
    this.artDocsService.getArtByCategoryLimit('wedding',8).subscribe({
      next: (snapshot: any[]) => {
        snapshot.forEach((doc: any) => {
          this.artsList.push(doc); // no need for .data() with Supabase
        });
      },
      error: (err) => {
        console.error('Error fetching arts:', err);
      },
      complete: () => {
      }
    });
  } 

  
  @HostListener('touchstart', ['$event'])
  //@HostListener('touchmove', ['$event'])
  @HostListener('touchend', ['$event'])
  @HostListener('touchcancel', ['$event'])
  handleTouch(event:any) {
      let touch = event.touches[0] || event.changedTouches[0];
  
      // check the events
      if (event.type === 'touchstart') {
          this.defaultTouch.x = touch.pageX;
          this.defaultTouch.y = touch.pageY;
          this.defaultTouch.time = event.timeStamp;
      } else if (event.type === 'touchend') {
          let deltaX = touch.pageX - this.defaultTouch.x;
          let deltaY = touch.pageY - this.defaultTouch.y;
          let deltaTime = event.timeStamp - this.defaultTouch.time;
  
          // simulte a swipe -> less than 500 ms and more than 60 px
          if (deltaTime < 500) {
              // touch movement lasted less than 500 ms
              if (Math.abs(deltaX) > 60) {
                  // delta x is at least 60 pixels
                  if (deltaX > 0) {
                      this.doSwipeRight(event);
                  } else {
                      this.doSwipeLeft(event);
                  }
              }
          }
      }
  }
  
  doSwipeLeft(event:any) {
     this.onNextClick()
  }
  
  doSwipeRight(event:any) {
     this.onPrevClick()
  }

// async goToCreator(artId: string) {
//   // 1️⃣ Assure la session guest
//   const isAuth = await this.authService.isLoggedInAsync();
//   if (!isAuth) {
//     await this.authService.checkOrCreateUserAndStoreSession();
//   }


//   // 2️⃣ Navigation après que l'utilisateur est prêt
//   this.router.navigate(['/creator', artId]);
// }
}
