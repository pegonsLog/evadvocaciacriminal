import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, map, take, distinctUntilChanged } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AnimacaoMetricasService {

    /**
     * Anima a contagem de um valor numérico
     * @param valorInicial Valor inicial da animação
     * @param valorFinal Valor final da animação
     * @param duracao Duração da animação em milissegundos
     * @param easing Função de easing para a animação
     */
    animarContagem(
        valorInicial: number,
        valorFinal: number,
        duracao: number = 1000,
        easing: (t: number) => number = this.easeOutQuart
    ): Observable<number> {
        const frames = Math.ceil(duracao / 16); // ~60fps
        const incremento = (valorFinal - valorInicial) / frames;

        return interval(16).pipe(
            take(frames + 1),
            map(frame => {
                const progresso = frame / frames;
                const progressoEased = easing(Math.min(progresso, 1));
                return valorInicial + (valorFinal - valorInicial) * progressoEased;
            }),
            distinctUntilChanged()
        );
    }

    /**
     * Anima múltiplos valores simultaneamente
     * @param valores Array de objetos com valorInicial e valorFinal
     * @param duracao Duração da animação em milissegundos
     */
    animarMultiplosValores(
        valores: { valorInicial: number; valorFinal: number }[],
        duracao: number = 1000
    ): Observable<number[]> {
        const frames = Math.ceil(duracao / 16);

        return interval(16).pipe(
            take(frames + 1),
            map(frame => {
                const progresso = Math.min(frame / frames, 1);
                const progressoEased = this.easeOutQuart(progresso);

                return valores.map(valor =>
                    valor.valorInicial + (valor.valorFinal - valor.valorInicial) * progressoEased
                );
            })
        );
    }

    /**
     * Cria uma animação de entrada escalonada para múltiplos elementos
     * @param numeroElementos Número de elementos a serem animados
     * @param delayBase Delay base entre cada elemento em milissegundos
     */
    criarAnimacaoEscalonada(numeroElementos: number, delayBase: number = 100): Observable<number> {
        const subject = new BehaviorSubject<number>(-1);

        for (let i = 0; i < numeroElementos; i++) {
            setTimeout(() => {
                subject.next(i);
            }, i * delayBase);
        }

        setTimeout(() => {
            subject.complete();
        }, numeroElementos * delayBase + 100);

        return subject.asObservable();
    }

    /**
     * Anima a transição entre dois estados de dados
     * @param estadoAnterior Estado anterior dos dados
     * @param estadoNovo Novo estado dos dados
     * @param duracao Duração da transição
     */
    animarTransicaoEstado<T extends Record<string, number>>(
        estadoAnterior: T | null,
        estadoNovo: T,
        duracao: number = 800
    ): Observable<T> {
        if (!estadoAnterior) {
            // Se não há estado anterior, anima do zero
            const estadoZero = Object.keys(estadoNovo).reduce((acc, key) => {
                acc[key as keyof T] = 0 as T[keyof T];
                return acc;
            }, {} as T);

            return this.animarTransicaoEstado(estadoZero, estadoNovo, duracao);
        }

        const frames = Math.ceil(duracao / 16);

        return interval(16).pipe(
            take(frames + 1),
            map(frame => {
                const progresso = Math.min(frame / frames, 1);
                const progressoEased = this.easeOutCubic(progresso);

                const estadoInterpolado = {} as T;

                Object.keys(estadoNovo).forEach(key => {
                    const valorAnterior = estadoAnterior[key as keyof T] as number;
                    const valorNovo = estadoNovo[key as keyof T] as number;

                    estadoInterpolado[key as keyof T] = (
                        valorAnterior + (valorNovo - valorAnterior) * progressoEased
                    ) as T[keyof T];
                });

                return estadoInterpolado;
            })
        );
    }

    /**
     * Cria um efeito de pulsação para destacar mudanças
     * @param elemento Referência ao elemento DOM
     * @param cor Cor da pulsação
     * @param duracao Duração da pulsação
     */
    criarEfeitoPulsacao(elemento: HTMLElement, cor: string = '#007bff', duracao: number = 600): void {
        elemento.style.transition = `box-shadow ${duracao}ms ease-out`;
        elemento.style.boxShadow = `0 0 20px ${cor}`;

        setTimeout(() => {
            elemento.style.boxShadow = '';
        }, duracao);
    }

    /**
     * Anima o crescimento de uma barra de progresso
     * @param valorFinal Valor final da barra (0-100)
     * @param duracao Duração da animação
     */
    animarBarraProgresso(valorFinal: number, duracao: number = 1200): Observable<number> {
        return this.animarContagem(0, Math.min(valorFinal, 100), duracao, this.easeOutCubic);
    }

    // Funções de easing
    private easeOutQuart(t: number): number {
        return 1 - Math.pow(1 - t, 4);
    }

    private easeOutCubic(t: number): number {
        return 1 - Math.pow(1 - t, 3);
    }

    private easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    private easeOutElastic(t: number): number {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }

    /**
     * Cria uma animação de entrada com bounce
     * @param duracao Duração da animação
     */
    criarAnimacaoBounce(duracao: number = 600): Observable<number> {
        const frames = Math.ceil(duracao / 16);

        return interval(16).pipe(
            take(frames + 1),
            map(frame => {
                const progresso = Math.min(frame / frames, 1);
                return this.easeOutBounce(progresso);
            })
        );
    }

    private easeOutBounce(t: number): number {
        const n1 = 7.5625;
        const d1 = 2.75;

        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }

    /**
     * Gerencia o estado de animação de um componente
     */
    criarGerenciadorEstado() {
        return {
            animandoSubject: new BehaviorSubject<boolean>(false),
            animando$: new BehaviorSubject<boolean>(false).asObservable(),

            iniciarAnimacao: function () {
                this.animandoSubject.next(true);
            },

            finalizarAnimacao: function () {
                this.animandoSubject.next(false);
            },

            estaAnimando: function (): boolean {
                return this.animandoSubject.value;
            }
        };
    }
}
