import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SplashScreenService {
  private isVisibleSubject = new BehaviorSubject<boolean>(true);
  public isVisible$: Observable<boolean> = this.isVisibleSubject.asObservable();

  constructor() {
    // Check if we're in a PWA context
    this.initializeSplashScreen();
  }

  private initializeSplashScreen() {
    // Show splash screen on app startup
    if (this.isPWA()) {
      this.show();
      
      // Auto-hide after app is loaded
      setTimeout(() => {
        this.hide();
      }, 2500);
    } else {
      // Hide immediately if not in PWA mode
      this.hide();
    }
  }

  show(): void {
    this.isVisibleSubject.next(true);
    document.body.classList.remove('loaded');
  }

  hide(): void {
    this.isVisibleSubject.next(false);
    document.body.classList.add('loaded');
  }

  private isPWA(): boolean {
    // Check if running as PWA
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone ||
           document.referrer.includes('android-app://');
  }

  // Method to show splash screen during app updates
  showForUpdate(): void {
    this.show();
    setTimeout(() => {
      this.hide();
    }, 1500);
  }

  // Method to show splash screen during data loading
  showForLoading(): void {
    this.show();
  }

  // Method to hide splash screen after loading is complete
  hideAfterLoading(): void {
    setTimeout(() => {
      this.hide();
    }, 500);
  }
}