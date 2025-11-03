import { ParcelaService } from './parcela.service';

describe('ParcelaService - Testes Simples', () => {
    let service: any;

    beforeEach(() => {
        // Mock simples do Firestore
        const mockFirestore = {
            collection: () => ({}),
            doc: () => ({}),
            addDoc: () => Promise.resolve({ id: 'mock-id' }),
            updateDoc: () => Promise.resolve(),
            deleteDoc: () => Promise.resolve(),
            query: () => ({}),
            where: () => ({}),
            getDocs: () => Promise.resolve({ docs: [] }),
            onSnapshot: (collection: any, callback: any) => {
                callback({ docs: [] });
                return () => { }; // unsubscribe function
            }
        };

        // Criar instância do serviço com mock
        service = new ParcelaService();
        (service as any).firestore = mockFirestore;
        (service as any).parcelasCollection = {};
    });

    it('deve ser criado', () => {
        expect(service).toBeTruthy();
    });

    it('deve validar entrada maior que total', () => {
        const cliente = {
            id: 'test',
            compra: {
                valorTotal: 500,
                valorEntrada: 600,
                numeroParcelas: 2,
                dataPrimeiroVencimento: new Date('2024-12-15')
            }
        };

        expect(() => {
            (service as any).validarDadosCliente(cliente);
        }).toThrowError('O valor de entrada não pode ser maior que o valor total do contrato');
    });

    it('deve validar data no passado', () => {
        const ontem = new Date();
        ontem.setDate(ontem.getDate() - 1);

        const cliente = {
            id: 'test',
            compra: {
                valorTotal: 1000,
                valorEntrada: 200,
                numeroParcelas: 4,
                dataPrimeiroVencimento: ontem
            }
        };

        expect(() => {
            (service as any).validarDadosCliente(cliente);
        }).toThrowError('A data do primeiro vencimento não pode ser anterior à data atual');
    });

    it('deve validar número de parcelas inválido', () => {
        const cliente = {
            id: 'test',
            compra: {
                valorTotal: 1000,
                valorEntrada: 200,
                numeroParcelas: 0,
                dataPrimeiroVencimento: new Date('2024-12-15')
            }
        };

        expect(() => {
            (service as any).validarDadosCliente(cliente);
        }).toThrowError('O número de parcelas deve ser maior que zero');
    });

    it('deve validar quando não há valor a parcelar', () => {
        const cliente = {
            id: 'test',
            compra: {
                valorTotal: 500,
                valorEntrada: 500,
                numeroParcelas: 2,
                dataPrimeiroVencimento: new Date('2024-12-15')
            }
        };

        expect(() => {
            (service as any).validarDadosCliente(cliente);
        }).toThrowError('Não há valor a ser parcelado (valor total deve ser maior que a entrada)');
    });
});
