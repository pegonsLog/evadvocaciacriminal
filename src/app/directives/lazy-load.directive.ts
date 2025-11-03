import {
    Directive,
    ElementRef,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnDestroy,
    inject
} from '@angular/core';

@Directive({
    selector: '[appLazyLoad]',
    standalone: true
})
export class LazyLoadDirective implements OnInit, OnDestroy {
    private elementRef = inject(ElementRef);

    @Input() rootMargin: string = '50px';
    @Input() threshold: number = 0.1;
    @Input() loadOnce: boolean = true;

    @Output() inView = new EventEmitter<boolean>();
    @Output() firstView = new EventEmitter<void>();

    private observer?: IntersectionObserver;
    private hasBeenVisible = false;

    ngOnInit(): void {
        this.createObserver();
    }

    ngOnDestroy(): void {
        this.destroyObserver();
    }

    private createObserver(): void {
        if (!('IntersectionObserver' in window)) {
            // Fallback para navegadores que não suportam IntersectionObserver
            this.inView.emit(true);
            this.firstView.emit();
            return;
        }

        const options: IntersectionObserverInit = {
            root: null,
            rootMargin: this.rootMargin,
            threshold: this.threshold
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const isVisible = entry.isIntersecting;

                this.inView.emit(isVisible);

                if (isVisible && !this.hasBeenVisible) {
                    this.hasBeenVisible = true;
                    this.firstView.emit();

                    // Se loadOnce for true, parar de observar após primeira visualização
                    if (this.loadOnce) {
                        this.destroyObserver();
                    }
                }
            });
        }, options);

        this.observer.observe(this.elementRef.nativeElement);
    }

    private destroyObserver(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = undefined;
        }
    }

    /**
     * Força o carregamento mesmo se não estiver visível
     */
    forceLoad(): void {
        if (!this.hasBeenVisible) {
            this.hasBeenVisible = true;
            this.inView.emit(true);
            this.firstView.emit();

            if (this.loadOnce) {
                this.destroyObserver();
            }
        }
    }

    /**
     * Reseta o estado para permitir novo carregamento
     */
    reset(): void {
        this.hasBeenVisible = false;
        this.destroyObserver();
        this.createObserver();
    }
}
