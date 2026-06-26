import { Injectable, inject } from "@angular/core";
// import { Firestore, collection, getDocs , addDoc, doc, query, setDoc, DocumentReference, getDoc,deleteDoc, where, limit, serverTimestamp, orderBy, QueryConstraint, updateDoc, increment, limitToLast } from "@angular/fire/firestore";
import { Observable, catchError, from, map, of, switchMap, tap, throwError } from "rxjs";
// import { getDownloadURL, ref, Storage, uploadBytes } from '@angular/fire/storage';

import { nanoid } from 'nanoid';
import { IArtDoc } from "../domaine/entities/art";
import { IQuestion } from "../domaine/entities/question";
import { startsWith } from "lodash";
import { SiteConfigService } from "./site-config.service";
// import { AngularFireAuth } from "@angular/fire/compat/auth";

@Injectable({providedIn: 'root'})
export class FirebaseStorageService {
    // firestore = inject(Firestore);
    siteConfigService = inject(SiteConfigService);

    getImagesByCategotiries(){
    // const querySnapshot =  from(this.fbWrraper.run(getDocs(collection(this.firestore, "assets_images"))))
    // return querySnapshot

   }

   deletAsset(id:string){
    // const referenceCollection = collection(this.firestore, "assets_images")
    // const docRef = doc(referenceCollection, id);
    // return from(this.fbWrraper.run(getDoc(docRef))).pipe(
    //   switchMap((docSnap) => {
    //     if (docSnap?.exists()) {
    //       deleteDoc(docRef)
    //       return from(of(true));
    //     } else {
    //       this.nzMessageService.error('Document does not exist');
    //       return from(of(false));
    //     }
    //   }),
    //   catchError((error) => {
    //     console.error("Error in removeArtDoc:", error);
    //     return from(of(false));
    //   })
    // );
   }
 async saveUserArt(artDocId: string, customData: any, previewUrl: string) {
    // const user = await this.afAuth.currentUser 
    // if (!user) throw new Error('User not authenticated');

    // const userArtsRef = collection(this.firestore, `users/${user.uid}/saved_arts`);
    // return this.fbWrraper.run( addDoc(userArtsRef, {
    //   artDocId,
    //   pages: customData,
    //   preview_url: previewUrl,
    //   created_at: serverTimestamp()
    // }))
  }
   getAssetsForUsers(){
    // const querySnapshot =  from(this.fbWrraper.run(getDocs(collection(this.firestore, "assets_for_all"))))
    // return querySnapshot
   }
   getFilteredArts(filters?: any) {
//     const referenceCollection = collection(this.firestore, 'art_docs');
  
//     const constraints = [where('status', '==', 'published'), orderBy("created_at", "desc")];
  
//     if (filters?.category) {
//       constraints.push(where('categorie', '==', filters.category));
//     }
//     if (filters?.size) {
//       constraints.push(where('size', '==', filters.size));
//     }
//     if (filters?.popular) {
//       constraints.push(where('popular', '==', filters.popular));
//     }
  

//     const artQuery = query(referenceCollection, ...constraints);
//   return from(this.fbWrraper.run(getDocs(artQuery))).pipe(
//   map(snapshot => {
//     if (!snapshot) return []; // Handle null defensively
//     return snapshot.docs.map(doc => ({
//       id: doc.id,
//       ...doc.data()
//     }));
//   }),
//   catchError(error => {
//     console.error('Error in getFilteredArts:', error);
//     this.nzMessageService?.error?.('Failed to load artworks');
//     return of([]); // Fallback to empty array
//   })
// );
  }
  
getFilteredArtsForDashboard(filters: any = {}){
//   const referenceCollection = collection(this.firestore, 'art_docs');

//   const constraints: QueryConstraint[] = [];

//   const filterMappings: { [key: string]: any } = {
//     categorie: filters.category,
//     status: filters.status !== 'all' ? filters.status : null,
//     size: filters.size,
//     popular: filters.popular
//   };

//   for (const [field, value] of Object.entries(filterMappings)) {
//     if (value !== null && value !== undefined) {
//       constraints.push(where(field, '==', value));
//     }
//   }

//   // Add ordering
//   constraints.push(orderBy('created_at', 'desc'));

//   const artQuery = query(referenceCollection, ...constraints);

// return from(this.fbWrraper.run(getDocs(artQuery))).pipe(
//   map(snapshot => {
//     if (!snapshot) return [];
//     return snapshot.docs.map(doc => ({
//       id: doc.id,
//       ...doc.data()
//     }));
//   }),
//   catchError(error => {
//     console.error('Error in getFilteredArtsForDashboard:', error);
//     this.nzMessageService?.error?.('Failed to load artworks');
//     return of([]);
//   })
// );
}

  getRelatedArtsByTags(tags: string[]) {

//     const artCollection = collection(this.firestore, 'art_docs');
//     const artQuery = query(artCollection, where('tags', 'array-contains-any', tags));

//   return from(this.fbWrraper.run(getDocs(artQuery))).pipe(
//   map((snapshot) => {
//     if (!snapshot) return [];
//     return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
//   })
// );
  }

  getArtByCategory(category: string) {
//     const artCollection = collection(this.firestore, 'art_docs');
//     const artQuery = query(artCollection, 
//       where('categorie', '==', category),
//       where('status', '==', 'published'),
//       orderBy("created_at", "desc"),
//        limit(4)
//     );
// return from(this.fbWrraper.run(getDocs(artQuery))).pipe(
//   map(snapshot => {
//     if (!snapshot) return [];
//     return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//   })
// );
  }
   getImagesByType(type:any){
    // const querySnapshot = from(
    //     getDocs(query(collection(this.firestore, "assets_images"), where("type", "==", type))) );
    // return querySnapshot;
}

  addImages(image: any){
    // const referenceCollection = collection(this.firestore, "assets_images");
    // const docRef = doc(referenceCollection, image.id); // Create a reference with image.id as the document ID
    // return from(setDoc(docRef, image)); // Use setDoc to set the document with the specified ID
  }

  
   addAssetsForUsers(docData:any){
    // const referenceCollection = collection(this.firestore, "assets_for_all")
    // return from(addDoc(referenceCollection, docData));

   }
   
   addQuestion(question: IQuestion){
  //  const referenceCollection = collection(this.firestore, "questions");
  //   const docRef = doc(referenceCollection, question.id);
  //   return from(setDoc(docRef, question)); 
   }

    getQuestions(){
      // return from(getDocs(collection(this.firestore, "questions"))).pipe(
      //   map(snapshot => {
      //     if (!snapshot.empty) {
      //       return snapshot.docs.map(doc => ({
      //         id: doc.id,
      //         ...doc.data()
      //       }));
      //     } else {
      //       // No documents found
      //       return [];
      //     }
      //   }),
      //   catchError(error => {
      //     console.error("Error fetching questions:", error);
      //     return of([]); // Return empty array on error
      //   })
      // );
    }
    getQuestionsWithAnswers() {
      // const questionsCollection = collection(this.firestore, "questions");
      // const questionsQuery = query(questionsCollection, where("answer", "!=", ""));
      // return from(getDocs(questionsQuery)).pipe(
      // map((snapshot) =>
      //   snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      // )
      // );
    }
    deleteQuestion(id: string) {
    //   const referenceCollection = collection(this.firestore, "questions");
    //   const docRef = doc(referenceCollection, id);
    //   return from(deleteDoc(docRef));
    }

    updateQuestion(question: IQuestion) {
      // const referenceCollection = collection(this.firestore, "questions");
      // const docRef = doc(referenceCollection, question.id);
      // return from(setDoc(docRef, question));
    }

    getQuestionById(id: string) {
      // const referenceCollection = collection(this.firestore, "questions");
      // const docRef = doc(referenceCollection, id);
      // return from(getDoc(docRef));
    }

    answerToQuestion(id: string, answer: string) {
      // const referenceCollection = collection(this.firestore, "questions");
      // const docRef = doc(referenceCollection, id);
      // return from(updateDoc(docRef, { answer: answer }));
    }

   async uploadFile(file:any,path:string,id?:any):Promise<any>{
    if(id){
      path = path+'/'+id
    }else{
      path = path+'/'+nanoid();;
    }
    // const storageRef = ref(this.storage, path);
    //    return uploadBytes(storageRef, file)
   }
   addArtDoc(artDoc: IArtDoc)  {

    // const referenceCollection = collection(this.firestore, "art_docs");
    // const docRef = doc(referenceCollection, artDoc.id);

    // return from(getDoc(docRef)).pipe(

    //   switchMap((docSnap) => {
    //     if (docSnap.exists()) {
    //       this.nzMessageService.error('Document already exists');
    //       return throwError(new Error('Document already exists'));
    //     } else {
    //       const artDocPublished = Object.assign({}, artDoc, { status: "draft" });
    //       return from(setDoc(docRef, artDocPublished));
    //     }
    //   }),
    //   catchError((error) => {
    //     console.error("Error in addArtDoc:", error);
    //     return throwError(error);
    //   })
    // );
  }

  addArtDocAndPages(artDoc: IArtDoc){
    // const referenceCollection = collection(this.firestore, "art_docs");
    // const docRef = doc(referenceCollection, artDoc.id);
  
    // return from(getDoc(docRef)).pipe(
    //   switchMap((docSnap) => {
    //     if (docSnap.exists()) {
    //       this.nzMessageService.error('Document already exists');
    //       return throwError(new Error('Document already exists'));
    //     } else {
    //       // Exclude pages from the main document
    //       const { pages, ...mainDocData } = artDoc; // Destructure to extract pages
  
    //       // Set the main document without the pages field
    //       const artDocPublished = { ...mainDocData, status: "draft" };
    //       return from(setDoc(docRef, artDocPublished)).pipe(
    //         // After the main document is set, add pages to the sub-collection
    //         switchMap(() => {
    //           const pagesRef = collection(docRef, "pages");
    //           const pagePromises = pages.map((page: any) => {
    //             const pageDocRef = doc(pagesRef); // Create a new document reference
    //             return setDoc(pageDocRef, page); // Set each page document
    //           });
  
    //           // Wait for all page documents to be added
    //           return from(Promise.all(pagePromises)).pipe(map(() => {}));
    //         })
    //       );
    //     }
    //   }),
    //   catchError((error) => {
    //     console.error("Error in addArtDoc:", error);
    //     return throwError(error);
    //   })
    // );
  }
  updateArtDocPages(docArt: IArtDoc) {
    // const referenceCollection = collection(this.firestore, "art_docs");
    // const pagesCollection = collection(doc(referenceCollection, docArt.id), "pages");
  
    // // Step 1: Fetch existing pages
    // return from(getDocs(pagesCollection)).pipe(
    //   switchMap((querySnapshot) => {
    //     const deletePromises = querySnapshot.docs.map((docSnap) => {
    //       return deleteDoc(doc(pagesCollection, docSnap.id));
    //     });
  
    //     // Step 2: Delete existing pages
    //     return from(Promise.all(deletePromises));
    //   }),
    //   switchMap(() => {
    //     // Step 3: Add new pages
    //     const setPromises = docArt.pages.map((page) => {
    //       const pageRef = doc(pagesCollection, page.id); // Reference for each new page
    //       return setDoc(pageRef, page); // Add new page data
    //     });
  
    //     return from(Promise.all(setPromises));
    //   }),
    //   catchError((error) => {
    //     console.error("Error updating art document pages:", error);
    //     return throwError(() => error);
    //   })
    // );
  }

  updateArtDocPagesWithStorage(docArt: IArtDoc) {
    // const referenceCollection = collection(this.firestore, "art_docs");
    // const pagesCollection = collection(doc(referenceCollection, docArt.id), "pages");
  
    // // Step 1: Fetch existing pages
    // return from(getDocs(pagesCollection)).pipe(
    //   switchMap((querySnapshot) => {
    //     const deletePromises = querySnapshot.docs.map((docSnap) => {
    //       return deleteDoc(doc(pagesCollection, docSnap.id));
    //     });
  
    //     // Step 2: Delete existing pages
    //     return from(Promise.all(deletePromises));
    //   }),
    //   switchMap(() => {
    //     // Step 3: Add new pages with storage
    //     const setPromises = docArt.pages.map(async (page) => {
    //       const pageRef = doc(pagesCollection, page.id); // Reference for each new page
    //       const canvasContent = page.canvasContent;
    //       const filePath = `art_docs/${docArt.id}/pages/${page.id}/canvasContent.json`;
          
    //       // Upload canvas content to storage
    //       const fileRef = ref(this.storage, filePath);
    //       await uploadBytes(fileRef, new Blob([JSON.stringify(canvasContent)], { type: 'application/json' }));
    //       const downloadURL = await getDownloadURL(fileRef);
          
    //       // Update page with the URL of the uploaded file
    //       const updatedPage = { ...page, canvasContent: downloadURL  };
    
    //       return setDoc(pageRef, updatedPage); // Add new page data
    //     });
  
    //     return from(Promise.all(setPromises));
    //   }),
    //   catchError((error) => {
    //     console.error("Error updating art document pages with storage:", error);
    //     return throwError(() => error);
    //   })
    // );
  }
  
  async  getArtContent(art: any): Promise<any> {
    if (typeof art === 'string' && startsWith(art, 'http')) {
      try {
        const response = await fetch(art);
        if (!response.ok) throw new Error('Failed to fetch art content');
        return await response.json();
      } catch (error) {
        console.error('Error fetching art content:', error);
        throw error;
      }
    }else{
      return art
    }
  
  }

  updateArtDoc(docArt:IArtDoc) {

    // const referenceCollection = collection(this.firestore, "art_docs");
    // const docRef = doc(referenceCollection, docArt.id);

    // return from(this.fbWrraper.run(getDoc(docRef))).pipe(
    //   switchMap((docSnap) => {
    //     if (docSnap?.exists()) {
    //       // if (docArt.status === 'published') {
    //       //   this.siteConfigService.generateSitemap()

    //       // }
    //       return from(setDoc(docRef, docArt));
    //     } else {
    //       this.nzMessageService.error('Document does not exist');
    //       return throwError(new Error('Document does not exist'));
    //     }
    //   }),
    //   catchError((error) => {
    //     console.error("Error in updateArtDoc:", error);
    //     return throwError(error);
    //   })
    // );

  }

  updateArtDocReviews(docArt: IArtDoc){
    // const referenceCollection = collection(this.firestore, "art_docs");
    // const docRef = doc(referenceCollection, docArt.id);
  
    // return from(this.fbWrraper.run(getDoc(docRef))).pipe(
    //   switchMap((docSnap) => {
    //     if (docSnap?.exists()) {
    //       // Update only the 'status' field
    //       return from(updateDoc(docRef, { reviews: docArt.reviews }));
    //     } else {
    //       this.nzMessageService.error('Document does not exist');
    //       return throwError(new Error('Document does not exist'));
    //     }
    //   }),
    //   catchError((error) => {
    //     console.error("Error in updateArtDoc:", error);
    //     return throwError(error);
    //   })
    // );
  }
  incrementExportedTimes(id: string) {
    // const referenceCollection = collection(this.firestore, 'art_docs');
    // const docRef = doc(referenceCollection, id);

    // return from(this.fbWrraper.run(getDoc(docRef))).pipe(
    //   switchMap((docSnap) => {
    //     if (docSnap?.exists()) {
    //       return from(updateDoc(docRef, { exported_times: increment(1) }));
    //     } else {
    //       this.nzMessageService.error('Document does not exist');
    //       return throwError(new Error('Document does not exist'));
    //     }
    //   }),
    //   catchError((error) => {
    //     console.error('Error in incrementExportedTimes:', error);
    //     return throwError(error);
    //   })
    // );
  }
  getDocByiD(id:string){
    // const referenceCollection = collection(this.firestore, "art_docs")
    // const docRef = doc(referenceCollection, id);
    // return from(this.fbWrraper.run(getDoc(docRef)))
  }
  getAllArts(){
    // const artsQuery = query(
    //   collection(this.firestore, "art_docs"),
    //   orderBy("created_at", "desc")// or "asc" for ascending order
    // );
    // return from(this.fbWrraper.run(getDocs(artsQuery)));
  }
  getAllArtsByLimit(limit:number){
    // const artsQuery = query(
    //   collection(this.firestore, "art_docs"),
    //   where("status", "==", "published"),
    //   orderBy("created_at", "asc"),
    //   // limit(limit)
    //   limitToLast(limit)
    // );
    
    // return from(this.fbWrraper.run(getDocs(artsQuery)));
  }
  removeArtDoc(id:string){
    // const referenceCollection = collection(this.firestore, "art_docs")
    // const docRef = doc(referenceCollection, id);
    // return from(this.fbWrraper.run(getDoc(docRef))).pipe(
    //   switchMap((docSnap) => {
    //     if (docSnap?.exists()) {
    //       deleteDoc(docRef)
    //       return from(of(true));
    //     } else {
    //       this.nzMessageService.error('Document does not exist');
    //       return from(of(false));
    //     }
    //   }),
    //   catchError((error) => {
    //     console.error("Error in removeArtDoc:", error);
    //     return from(of(false));
    //   })
    // );
  }
   getArtworskByCategory(category:string){
    // const referenceCollection = collection(this.firestore, "art_docs")
    // const docRef = doc(referenceCollection, category);
    // return from(this.fbWrraper.run(getDoc(docRef))).pipe(
    //   map((docSnap) => {
    //     if (docSnap?.exists()) {
    //       return docSnap.data();
    //     } else {
    //       this.nzMessageService.error('Document does not exist');
    //       return null;
    //     }
    //   }),
    //   catchError((error) => {
    //     console.error("Error in getArtworkByid:", error);
    //     return of(null);
    //   })
    // );
  }
getArtworkByid(id: string){
  // if (!id) {
  //   this.nzMessageService.error('No ID provided');
  //   return of(null);
  // }

  // const referenceCollection = collection(this.firestore, 'art_docs');
  // const docRef = doc(referenceCollection, id);

  // return from(this.fbWrraper.run(getDoc(docRef))).pipe(
  //   map((docSnap) => {
  //     if (docSnap?.exists()) {
  //       return { id: docSnap.id, ...docSnap.data() };
  //     } else {
  //       this.nzMessageService.error('Document does not exist');
  //       return null;
  //     }
  //   }),
  //   catchError((error) => {
  //     console.error('Error in getArtworkByid:', error);
  //     this.nzMessageService.error('Error fetching artwork');
  //     return of(null);
  //   })
  // );
}

//    addArtDoc(art:IArtDoc):Observable<any>{
//     const referenceCollection = collection(this.firestore, "art_docs")
//     const docRef = doc(referenceCollection, 'W0FkKEBbN2ZC0GG9wBa6');
//     // console.log('docRef', docRef.id)
//     // getDoc(docRef).then((doc) => {
//     //     console.log('Document data:', doc.data());
//     // })

//     return from(getDoc(docRef)).pipe(
//         tap((docSnap) => {
//             console.log('docSnap', docSnap);
//             console.log("Checking if document snapshot exists.");
//         })
//     );
//     DocumentReference
//     return of({} as any)
//     // return from(addDoc(referenceCollection, art));

//    }


    

}