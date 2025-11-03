import {
    Directive,
    ElementRef,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnDestroy,
    HostListener,
    Renderer2,
    inject
} from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

export interface VirtualScrollEvent {
    startIndex: number;
    endIndex: number;
    scrollTop: number;
}

@Directive({
    selector: '[appVirtualScroll]',
    standalone: true
})
export class VirtualScrollDirective implements OnInit, OnDestroy {
    private elementRef = inject(ElementRef);
    private renderer = inject(Renderer2);

    @Input() itemHeight: number = 60;
    @Input() totalItems: number = 0;
    @Input() bufferSize: number = 5;
    @Input() debounceTime: number = 16; // ~60fps

    @Output() scrollChange = new EventEmitter<VirtualScrollEvent>();
    @Output() scrollEnd = new EventEmitter<void>();

    private destroy$ = new Subject<void>();
    private scrollSubject = new Subject<Event>();
    private isScrolling = false;
    private scrollTimeout: any;

    ngOnInit(): void {
        this.setupScrollListener();
        this.setupContainer();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();

        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
    }

    @HostListener('scroll', ['$event'])
    onScroll(event: Event): void {
        this.scrollSubject.next(event);
        this.handleScrollStart();
    }

    private setupScrollListener(): void {
        this.scrollSubject.pipe(
            debounceTime(this.debounceTime),
            takeUntil(this.destroy$)
        ).subscribe((event) => {
            this.handleScroll(event);
        });
    }

    private setupContainer(): void {
        const element = this.elementRef.nativeElement;

        // Configurar estilos necessários para virtual scrolling
        this.renderer.setStyle(element, 'overflow-y', 'auto');
        this.renderer.setStyle(element, 'position', 'relative');

        // Criar container interno para manter altura total
        const totalHeight = this.totalItems * this.itemHeight;
        this.renderer.setStyle(element, 'height', `${totalHeight}px`);
    }

    private handleScroll(event: Event): void {
        const element = event.target as HTMLElement;
        const scrollTop = element.scrollTop;
        const containerHeight = element.clientHeight;

        // Calcular índices visíveis
        const startIndex = Math.floor(scrollTop / this.itemHeight);
        const visibleCount = Math.ceil(containerHeight / this.itemHeight);
        const endIndex = Math.min(startIndex + visibleCount, this.totalItems);

        // Aplicar buffer
        const bufferedStart = Math.max(0, startIndex - this.bufferSize);
        const bufferedEnd = Math.min(this.totalItems, endIndex + this.bufferSize);

        // Emitir evento de mudança
        this.scrollChange.emit({
            startIndex: bufferedStart,
            endIndex: bufferedEnd,
            scrollTop
        });

        this.handleScrollEnd();
    }

    private handleScrollStart(): void {
        if (!this.isScrolling) {
            this.isScrolling = true;
            this.renderer.addClass(this.elementRef.nativeElement, 'scrolling');
        }
    }

    private handleScrollEnd(): void {
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }

        this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;
            this.renderer.removeClass(this.elementRef.nativeElement, 'scrolling');
            this.scrollEnd.emit();
        }, 150);
    }

    /**
     * Métodos públicos para controle programático
     */

    scrollToIndex(index: number): void {
        const scrollTop = index * this.itemHeight;
        this.elementRef.nativeElement.scrollTop = scrollTop;
    }

    scrollToTop(): void {
        this.scrollToIndex(0);
    }

    scrollToBottom(): void {
        this.scrollToIndex(this.totalItems - 1);
    }

    updateTotalItems(count: number): void {
        this.totalItems = count;
        const totalHeight = count * this.itemHeight;
        this.renderer.setStyle(this.elementRef.nativeElement, 'height', `${totalHeight}px`);
    }
}
