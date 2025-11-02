import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ModalService, ModalData } from '../../../services/modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent implements OnInit, OnDestroy {
  modalData: ModalData | null = null;
  private subscription?: Subscription;

  constructor(private modalService: ModalService) {}

  ngOnInit(): void {
    this.subscription = this.modalService.modal$.subscribe(data => {
      this.modalData = data;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async onConfirm(): Promise<void> {
    if (this.modalData?.onConfirm) {
      await this.modalData.onConfirm();
    }
    this.close();
  }

  onCancel(): void {
    if (this.modalData?.onCancel) {
      this.modalData.onCancel();
    } else {
      this.close();
    }
  }

  close(): void {
    if (this.modalData?.onClose) {
      this.modalData.onClose();
    }
    this.modalService.close();
  }

  getIconClass(): string {
    switch (this.modalData?.type) {
      case 'success': return 'bi-check-circle-fill';
      case 'error': return 'bi-x-circle-fill';
      case 'warning': return 'bi-exclamation-triangle-fill';
      case 'info': return 'bi-info-circle-fill';
      case 'confirm': return 'bi-question-circle-fill';
      default: return 'bi-info-circle-fill';
    }
  }

  getIconContainerClass(): string {
    switch (this.modalData?.type) {
      case 'success': return 'icon-success';
      case 'error': return 'icon-error';
      case 'warning': return 'icon-warning';
      case 'info': return 'icon-info';
      case 'confirm': return 'icon-confirm';
      default: return 'icon-info';
    }
  }

  getModalClass(): string {
    switch (this.modalData?.type) {
      case 'success': return 'modal-success';
      case 'error': return 'modal-error';
      case 'warning': return 'modal-warning';
      case 'info': return 'modal-info';
      case 'confirm': return 'modal-confirm';
      default: return 'modal-info';
    }
  }
}