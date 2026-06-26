import { Component, Inject, inject, Input, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductGalleryComponent } from './product-gallery/product-gallery.component';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { Observable, of } from 'rxjs';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { FormsModule } from '@angular/forms';
import { NzModalModule, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzMessageService } from 'ng-zorro-antd/message';
import { replace } from 'lodash';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SanitizeHtmlPipe } from '../../shared/pipes/htmlSanitizer/htmlSanitizer.pipe';
import { SimpleGalleryComponent } from '../../shared/ui-components/simple-gallery/simple-gallery.component';
import { MetaService } from '../../shared/services/meta.service';
import { AuthService } from '../../shared/services/auth.service';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';
import { IArtDoc } from '../../shared/domaine/entities/art';
import { IReview } from '../../shared/domaine/entities/review';
import { AddReviewComponent } from '../../shared/ui-components/modals/add-review/add-review.component';
import { ArtDocsService } from '../../shared/services/art-docs.service';
import { PaymentService, PlanId } from '../../shared/services/payment.service';
import { SupabaseService } from '../../shared/services/supabase.service';
import { PremiumGateComponent } from '../premium-gate/premium-gate.component';
import { TranslateContentPipe } from '../../shared/pipes/translate-content.pipe';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';


@Component({
  selector: 'maker-tags-art-detail',
  standalone: true,
  imports: [CommonModule, SanitizeHtmlPipe, NzModalModule, SimpleGalleryComponent, NzCardModule, NzImageModule, NzModalModule, FormsModule, NzRateModule, NzIconModule, RouterModule, ProductGalleryComponent, NzPopoverModule, NzIconModule, NzButtonModule, PremiumGateComponent, TranslateContentPipe, TranslocoModule],
  templateUrl: './art-detail.component.html',
  styleUrl: './art-detail.component.css',

})
export class ArtDetailComponent implements OnInit {
  private transloco = inject(TranslocoService);
  activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  isReviewsVisible = false;
  images = [
    'https://via.placeholder.com/100?text=Image+1',
    'https://via.placeholder.com/100?text=Image+2',
    'https://via.placeholder.com/100?text=Image+3',
  ];
  metaService = inject(MetaService);
  router = inject(Router);
  modal = inject(NzModalService)
  authService = inject(AuthService);
  private modalRef?: NzModalRef;
  nzMessageService = inject(NzMessageService);
  artDocService = inject(ArtDocsService);
  paymentService = inject(PaymentService);
  supabaseService = inject(SupabaseService);
  constructor(@Inject(PLATFORM_ID) private platformId: any,private sanitizer: DomSanitizer,private route: ActivatedRoute) {
    const artwork = this.route.snapshot.data['artwork'];
    this.artwork = artwork;

    // Set meta tags
    if(artwork){
     const cleanDescription = this.cleanMetaDescription(artwork.description);
     this.metaService.updateMeta(
      artwork.title,
      cleanDescription,
      artwork.preview_realized_art,
      artwork.tags?.join(',')
    );

    const result = this.extractFirebasePath(artwork.preview_realized_art);
    this.mediafirepath = result ?? '';

    // let imagesGallerythumbnails = JSON.parse(artwork.thumbnails ?? '[]');
    let previewImage = artwork.preview_realized_art ? [{ url: artwork.preview_realized_art, uid: 'main' }] : [];
    let previewVideo = artwork.video ? [this.getYoutubeVideoDetails(artwork.video)] : [];

    this.imagesGallery = [...previewImage,...previewVideo];

    this.relatedArts$ = this.artDocsService.getArtByCategoryLimit(artwork.categorie , 2);
    }
   
    // Handle other logic
    if (artwork?.reviews) {
      this.rateAssum = this.getRate(artwork.reviews);
    } 
  }
  relatedArts$: Observable<any[]> = of([]);
  visibleShare = false;
  rateAssum: number = 0
  currentLink: string = '';
  artDocsService: ArtDocsService = inject(ArtDocsService);
  mediafirepath: string = '';

  @Input() title?: string;
  @Input()  id?:string

  get reviewDate(): Date {
    return this.artwork.created_at.toDate();
  }
  is_desktop: boolean = true;
  imagesGallery: any;
  artwork: any = {
    pages: [{}]
  } as IArtDoc;
  isExpanded = false;
  hasAccess = false;

  get shortDescription(){
   return  this.artwork.description?.slice(0, 100);
  }
  get fullDescription(): SafeHtml | null {
    if (!this.artwork?.description) return null;

    return this.sanitizer.bypassSecurityTrustHtml(this.artwork.description);
  }

  changeSahre(event:any){

  }

  toggleDescription() {
    this.isExpanded = !this.isExpanded;
  }

  async buyDirect(plan: PlanId): Promise<void> {
    const session = this.authService.getCurrentUserSession();
    // Authenticated → go straight to Stripe
    if (session?.user?.id) {
      try {
        await this.paymentService.checkout(plan, plan === 'single' ? this.artwork?.id : undefined);
      } catch (e) {
        console.error(e);
      }
      return;
    }
    // Not authenticated → open modal with sign-in OR guest checkout
    this.openPremiumGate(plan);
  }

  goPremium(): void {
    this.openPremiumGate();
  }

  openPremiumGate(initialPlan?: PlanId): void {
    this.modal.create({
      nzTitle: undefined,
      nzContent: PremiumGateComponent,
      nzData: {
        artDocId: this.artwork?.id,
        artTitle: this.artwork?.title ?? 'this design',
        initialPlan: initialPlan ?? 'single',
      },
      nzFooter: null,
      nzWidth: 480,
      nzBodyStyle: { padding: '24px' },
      nzMaskClosable: true,
      nzKeyboard: true,
    });
  }

  async openEditor(): Promise<void> {
    const artDocId = this.artwork?.id;
    if (!artDocId) return;
    this.router.navigate(['/creator', artDocId]);
  }
  extractFirebasePath(firebaseUrl: string): string | null {
    try {
      const url = new URL(firebaseUrl);
  
      // Match the part after '/o/' in the pathname
      const match = url.pathname.match(/\/o\/(.+)/);
      if (!match) {
        return null; // Return null if the structure is unexpected
      }
  
      // Append query parameters to the extracted path
      const queryParams = url.search ? url.search : "";
  
      return match[1] + queryParams; // Concatenate the path and query
    } catch (error) {
      console.error("Invalid URL provided:", error);
      return null; // Return null for invalid URLs
    }
  }
   cleanMetaDescription(html: string): string {
    // Step 1: Remove HTML tags
    let cleanText = replace(html, /<[^>]*>/g, '');
  
    // Step 2: Replace HTML entities (e.g., &nbsp; or non-breaking spaces)
    cleanText = replace(cleanText, /&nbsp;|\u00a0/gi, ' ');
  
    // Step 3: Trim extra spaces
    cleanText = replace(cleanText, /\s{2,}/g, ' ').trim();
  
    // Step 4: Limit to 155-160 characters
    return cleanText.substring(0, 160);
  }
  async ngOnInit(): Promise<void> {
    if(this.id){
       this.artDocService.getArtworkByid(this.id)
    }

    if (isPlatformBrowser(this.platformId)) {
        if (window.innerWidth < 768) {
          this.is_desktop = false;
        }
        this.currentLink = window.location.href;
      }

    // Check if user has access to premium design
    if (this.artwork?.is_premuim) {
      try {
        this.hasAccess = await this.paymentService.hasAccess(this.artwork.id, true);
      } catch (err) {
        console.error('[art-detail] Error checking access:', err);
      }
    }

    this.resumePendingCheckout().catch(console.error);
  }

  private async resumePendingCheckout(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    console.log('[checkout] localStorage keys:', Object.keys(localStorage));
    console.log('[checkout] pendingCheckout:', localStorage.getItem('pendingCheckout'));
    const raw = localStorage.getItem('pendingCheckout');
    if (!raw) return;
    const { plan } = JSON.parse(raw);
    const artDocId = plan === 'single' ? this.artwork?.id : undefined;
    console.log('[checkout] plan:', plan, '| artDocId:', artDocId);
    await this.authService.storeUserSession();
    const session = this.authService.getCurrentUserSession();
    console.log('[checkout] session userId:', session?.user?.id);
    if (!session?.user?.id) { console.warn('[checkout] no session, aborting'); return; }
    localStorage.removeItem('pendingCheckout');
    console.log('[checkout] launching checkout...');
    this.paymentService.checkout(plan, artDocId).catch(e => console.error('[checkout] error:', e));
  }
  getRate(rate:IReview[]):number{
    if(!rate.length)
    return 0
  
    const eachRatesArray  = rate.reduce((res : number[] = [], item) => {
        res.push(item.rate);
        return res;
    }, []);
    let sum = eachRatesArray.reduce((acc, cur) => acc + cur, 0);
    return sum/eachRatesArray.length

  }

  shareOnPinterest() {
    const pinterestUrl = `https://www.pinterest.com/pin/create/button/?url=${this.currentLink}&media=${this.artwork.preview_realized_art}&description=${this.artwork.description}`;
    if (isPlatformBrowser(this.platformId)) {
      window.open(pinterestUrl, '_blank');
    }
  }
  goTodetail(art:any){
    const title = encodeURIComponent(
      art.title
        .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and dashes
        .replace(/\s+/g, '-') // Replace spaces with dashes
        .toLowerCase() // Optionally convert to lowercase
    );
    if (isPlatformBrowser(this.platformId)) {
      const id = art.firestore_id ? art.firestore_id : art.id;
      window.location.href = `/tags/${title}/${id}`;

    }
  }
  // Generic share (if supported by the browser)
  shareNative() {
    if (navigator.share) {
      navigator.share({
        title: 'Check this out!',
        text: 'Here is something interesting I found.',
        url: this.currentLink,
      }).catch((err) => console.error('Error sharing:', err));
    } else {
      alert('Native sharing is not supported on this browser.');
    }
  }

  // Close the popup
  closeSharePopup() {
    this.visibleShare = false;
    console.log('Share popup closed.');
  }
  getYoutubeVideoDetails(videoUrl: string) {
    const videoIdMatch = videoUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  
    if (videoIdMatch && videoIdMatch[1]) {
      const videoId = videoIdMatch[1];
      
      // Use the embed URL format for YouTube videos
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      
      // Use the thumbnail URL to display the video thumbnail
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  
      return {
        urlvideo: embedUrl, // Correct embed URL
        url: thumbnailUrl,  // Thumbnail URL
        uid: 'video'        // Mark as a video type
      };
    } else {
      throw new Error('Invalid YouTube URL');
    }
  }
  
   createReview(){
    if(this.isReviewsVisible){
  const currentUser =  this.authService.getCurrentUser();
  
     if(currentUser){
      this.modalRef = this.modal.create({
        nzContent: AddReviewComponent,
        nzFooter: null,
        nzClosable: false,
        nzData: { artDOc: this.artwork },
  
      });
     }else{
      this.nzMessageService.error('Please login to leave a review');
      return;
     }
    }

       
  }
}

