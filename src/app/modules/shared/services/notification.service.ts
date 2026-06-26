import { Injectable } from "@angular/core";
import { AuthService } from "./auth.service";
// import { Messaging, getToken, onMessage } from '@angular/fire/messaging';


@Injectable({
  providedIn: 'root'
})

export class NotificationPushService {
    constructor(
      // private messaging: Messaging, 
      private authSerivce: AuthService ){

    }

    unsubscribe() {
        // this.authSerivce.unsubscribeFromNotifications("cir9STqZKGNv1IMWwl4ddg:APA91bE-tVXZcZOMD4UZYaAwz94WJxN2m2qvQha81dlmCHrZ884F2f4FSV-S9pBgsabA3ReMlx1xknycRPD9Yk9jwEHNxESft0X5JH9gCb4w02cCAP8prl0").subscribe((res) => {
        //   console.log('Unsubscribed from notifications', res);
        // });
      }
      requestPermission() {
        // getToken(this.messaging, { vapidKey: 'BJH8Xb9ms1LzwnJZs9LWcGAJ6vwbqLoHPH6P-tSBemelPDl68VBwH2fnuze1uqyzAJPC7q-aAH_vR1KEFofRbeY' })
        //   .then((token) => {
        //     if (token) {
              
        //       console.log('Notification permission granted!', token);
        //       // this.authSerivce.saveTokenForAnonymousUser(token);
        //       // Save the token to your backend for sending notifications
        //     } else {
        //       console.log('No registration token available.');
        //     }
        //   })
        //   .catch((err) => {
        //     console.error('Unable to get permission to notify.', err);
        //   });
      }
    
      listenForMessages() {
        // onMessage(this.messaging, (payload) => {
        //   console.log('Message received. ', payload);
        //   // Handle the notification while the app is in the foreground
        // });
      }
    showSuccess(message: string): void {
        console.log(`Success: ${message}`);
    }

    showError(message: string): void {
        console.error(`Error: ${message}`);
    }

    showInfo(message: string): void {
        console.info(`Info: ${message}`);
    }

    showWarning(message: string): void {
        console.warn(`Warning: ${message}`);
    }
}