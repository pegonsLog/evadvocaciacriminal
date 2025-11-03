import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ModalData {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalSubject = new BehaviorSubject<ModalData | null>(null);
  public modal$ = this.modalSubject.asObservable();

  showSuccess(message: string, title: string = 'Sucesso', onClose?: () => void): void {
    this.modalSubject.next({
      title,
      message,
      type: 'success',
      onClose
    });
  }

  showError(message: string, title: string = 'Erro', onClose?: () => void): void {
    this.modalSubject.next({
      title,
      message,
      type: 'error',
      onClose
    });
  }

  showWarning(message: string, title: string = 'Atenção', onClose?: () => void): void {
    this.modalSubject.next({
      title,
      message,
      type: 'warning',
      onClose
    });
  }

  showInfo(message: string, title: string = 'Informação', onClose?: () => void): void {
    this.modalSubject.next({
      title,
      message,
      type: 'info',
      onClose
    });
  }

  showConfirm(
    message: string,
    title: string = 'Confirmação',
    confirmText: string = 'Confirmar',
    cancelText: string = 'Cancelar'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.modalSubject.next({
        title,
        message,
        type: 'confirm',
        confirmText,
        cancelText,
        onConfirm: () => {
          this.close();
          resolve(true);
        },
        onCancel: () => {
          this.close();
          resolve(false);
        }
      });
    });
  }

  // Método legado para compatibilidade
  showConfirmWithCallback(
    message: string,
    onConfirm: () => void | Promise<void>,
    title: string = 'Confirmação',
    confirmText: string = 'Confirmar',
    cancelText: string = 'Cancelar'
  ): void {
    this.modalSubject.next({
      title,
      message,
      type: 'confirm',
      confirmText,
      cancelText,
      onConfirm,
      onCancel: () => this.close()
    });
  }

  close(): void {
    this.modalSubject.next(null);
  }
}
