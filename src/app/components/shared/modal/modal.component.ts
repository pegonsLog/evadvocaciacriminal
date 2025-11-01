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
      case 'success': return 'bi-check-circle-fill text-success';
      case 'error': return 'bi-x-circle-fill text-danger';
      case 'warning': return 'bi-exclamation-triangle-fill text-warning';
      case 'info': return 'bi-info-circle-fill text-info';
      case 'confirm': return 'bi-question-circle-fill text-primary';
      default: return 'bi-info-circle-fill text-info';
    }
  }

  getHeaderClass(): string {
    switch (this.modalData?.type) {
      case 'success': return 'bg-success text-white';
      case 'error': return 'bg-danger text-white';
      case 'warning': return 'bg-warning text-dark';
      case 'info': return 'bg-info text-white';
      case 'confirm': return 'bg-primary text-white';
      default: return 'bg-info text-white';
    }
  }
}