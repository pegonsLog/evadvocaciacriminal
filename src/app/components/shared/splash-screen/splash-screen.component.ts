import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="splash-screen" [class.hidden]="isHidden">
      <div class="splash-logo">
        EV
      </div>
      <h1 class="splash-title">EV Advocacia</h1>
      <p class="splash-subtitle">Sistema de Gestão</p>
      <div class="splash-loading">
        <div class="splash-dot"></div>
        <div class="splash-dot"></div>
        <div class="splash-dot"></div>
      </div>
    </div>
  `,
  styleUrls: ['./splash-screen.component.scss']
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  isHidden = false;
  private hideTimeout?: number;

  ngOnInit() {
    // Auto-hide after 2 seconds
    this.hideTimeout = window.setTimeout(() => {
      this.hide();
    }, 2000);
  }

  ngOnDestroy() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }

  hide() {
    this.isHidden = true;
  }

  show() {
    this.isHidden = false;
  }
}