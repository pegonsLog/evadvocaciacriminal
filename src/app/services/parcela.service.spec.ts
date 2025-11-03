import { TestBed } from '@angular/core/testing';
import { ParcelaService } from './parcela.service';
import { Firestore } from '@angular/fire/firestore';
import { Cliente } from '../models/cliente.model';

// Mock do Firestore
const mockFirestore = {
    collection: jasmine.createSpy('collection').and.returnValue({}),
    doc: jasmine.createSpy('doc').and.returnValue({}),
    addDoc: jasmine.createSpy('addDoc').and.returnValue(Promise.resolve({ id: 'mock-id' })),
    updateDoc: jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve()),
    deleteDoc: jasmine.createSpy('deleteDoc').and.returnValue(Promise.resolve()),
    query: jasmine.createSpy('query').and.returnValue({}),
    where: jasmine.createSpy('where').and.returnValue({}),
    getDocs: jasmine.createSpy('getDocs').and.returnValue(Promise.resolve({ docs: [] })),
    onSnapshot: jasmine.createSpy('onSnapshot').and.callFake((collection: any, callback: any) => {
        callback({ docs: [] });
        return () => { }; // unsubscribe function
    })
};

describe('ParcelaService', () => {
    let service: ParcelaService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ParcelaService,
                { provide: Firestore, useValue: mockFirestore }
            ]
        });
        service = TestBed.inject(ParcelaService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Cálculo de valor parcelado', () => {
        it('deve calcular corretamente o valor parcelado descontando a entrada', async () => {
            const cliente: Cliente = {
                id: 'test-id',
                nome: 'Cliente Teste',
                cpf: '123.456.789-00',
                telefone: '(11) 99999-9999',
                email: 'teste@email.com',
                endereco: 'Rua Teste, 123',
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: 'CONT-001',
                    valorTotal: 1000,
                    valorEntrada: 200,
                    numeroParcelas: 4,
                    valorParcela: 200, // Será recalculado
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-02-15')
                }
            };

            spyOn(service, 'deleteParcelasByCliente').and.returnValue(Promise.resolve());

            await service.gerarParcelasComDataBase(cliente);

            // Verificar se addDoc foi chamado 4 vezes (4 parcelas)
            expect(mockFirestore.addDoc).toHaveBeenCalledTimes(4);

            // Verificar se o valor da parcela foi calculado corretamente
            // (1000 - 200) / 4 = 200
            const chamadas = mockFirestore.addDoc.calls.all();
            chamadas.forEach(chamada => {
                const parcela = chamada.args[1];
                expect(parcela.valorParcela).toBe(200);
            });
        });

        it('deve calcular corretamente com entrada zero', async () => {
            const cliente: Cliente = {
                id: 'test-id',
                nome: 'Cliente Teste',
                cpf: '123.456.789-00',
                telefone: '(11) 99999-9999',
                email: 'teste@email.com',
                endereco: 'Rua Teste, 123',
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: 'CONT-002',
                    valorTotal: 1200,
                    valorEntrada: 0,
                    numeroParcelas: 6,
                    valorParcela: 200, // Será recalculado
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-03-10')
                }
            };

            spyOn(service, 'deleteParcelasByCliente').and.returnValue(Promise.resolve());
            mockFirestore.addDoc.calls.reset();

            await service.gerarParcelasComDataBase(cliente);

            // Verificar se o valor da parcela foi calculado corretamente
            // 1200 / 6 = 200
            const chamadas = mockFirestore.addDoc.calls.all();
            chamadas.forEach(chamada => {
                const parcela = chamada.args[1];
                expect(parcela.valorParcela).toBe(200);
            });
        });
    });

    describe('Geração de datas com meses de diferentes tamanhos', () => {
        it('deve ajustar corretamente para o último dia do mês quando o dia não existe', async () => {
            const cliente: Cliente = {
                id: 'test-id',
                nome: 'Cliente Teste',
                cpf: '123.456.789-00',
                telefone: '(11) 99999-9999',
                email: 'teste@email.com',
                endereco: 'Rua Teste, 123',
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: 'CONT-003',
                    valorTotal: 900,
                    valorEntrada: 100,
                    numeroParcelas: 3,
                    valorParcela: 266.67,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-01-31') // 31 de janeiro
                }
            };

            spyOn(service, 'deleteParcelasByCliente').and.returnValue(Promise.resolve());
            mockFirestore.addDoc.calls.reset();

            await service.gerarParcelasComDataBase(cliente);

            const chamadas = mockFirestore.addDoc.calls.all();

            // Primeira parcela: 31/01/2024
            expect(chamadas[0].args[1].dataVencimento.getDate()).toBe(31);
            expect(chamadas[0].args[1].dataVencimento.getMonth()).toBe(0); // Janeiro

            // Segunda parcela: 29/02/2024 (2024 é ano bissexto)
            expect(chamadas[1].args[1].dataVencimento.getDate()).toBe(29);
            expect(chamadas[1].args[1].dataVencimento.getMonth()).toBe(1); // Fevereiro

            // Terceira parcela: 31/03/2024
            expect(chamadas[2].args[1].dataVencimento.getDate()).toBe(31);
            expect(chamadas[2].args[1].dataVencimento.getMonth()).toBe(2); // Março
        });

        it('deve manter o mesmo dia quando possível', async () => {
            const cliente: Cliente = {
                id: 'test-id',
                nome: 'Cliente Teste',
                cpf: '123.456.789-00',
                telefone: '(11) 99999-9999',
                email: 'teste@email.com',
                endereco: 'Rua Teste, 123',
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: 'CONT-004',
                    valorTotal: 600,
                    valorEntrada: 0,
                    numeroParcelas: 3,
                    valorParcela: 200,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-01-15') // 15 de janeiro
                }
            };

            spyOn(service, 'deleteParcelasByCliente').and.returnValue(Promise.resolve());
            mockFirestore.addDoc.calls.reset();

            await service.gerarParcelasComDataBase(cliente);

            const chamadas = mockFirestore.addDoc.calls.all();

            // Todas as parcelas devem ter dia 15
            chamadas.forEach((chamada, index) => {
                expect(chamada.args[1].dataVencimento.getDate()).toBe(15);
                expect(chamada.args[1].dataVencimento.getMonth()).toBe(index); // Jan, Fev, Mar
            });
        });
    });

    describe('Validações de entrada e data', () => {
        it('deve lançar erro quando entrada é maior que o total', async () => {
            const cliente: Cliente = {
                id: 'test-id',
                nome: 'Cliente Teste',
                cpf: '123.456.789-00',
                telefone: '(11) 99999-9999',
                email: 'teste@email.com',
                endereco: 'Rua Teste, 123',
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: 'CONT-005',
                    valorTotal: 500,
                    valorEntrada: 600, // Maior que o total
                    numeroParcelas: 2,
                    valorParcela: 250,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-12-15')
                }
            };

            await expectAsync(service.gerarParcelasComDataBase(cliente))
                .toBeRejectedWithError('O valor de entrada não pode ser maior que o valor total do contrato');
        });

        it('deve lançar erro quando data do primeiro vencimento é anterior à data atual', async () => {
            const ontem = new Date();
            ontem.setDate(ontem.getDate() - 1);

            const cliente: Cliente = {
                id: 'test-id',
                nome: 'Cliente Teste',
                cpf: '123.456.789-00',
                telefone: '(11) 99999-9999',
                email: 'teste@email.com',
                endereco: 'Rua Teste, 123',
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: 'CONT-006',
                    valorTotal: 800,
                    valorEntrada: 200,
                    numeroParcelas: 3,
                    valorParcela: 200,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: ontem // Data no passado
                }
            };

            await expectAsync(service.gerarParcelasComDataBase(cliente))
                .toBeRejectedWithError('A data do primeiro vencimento não pode ser anterior à data atual');
        });

        it('deve lançar erro quando número de parcelas é zero ou negativo', async () => {
            const cliente: Cliente = {
                id: 'test-id',
                nome: 'Cliente Teste',
                cpf: '123.456.789-00',
                telefone: '(11) 99999-9999',
                email: 'teste@email.com',
                endereco: 'Rua Teste, 123',
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: 'CONT-007',
                    valorTotal: 1000,
                    valorEntrada: 200,
                    numeroParcelas: 0, // Inválido
                    valorParcela: 0,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-12-15')
                }
            };

            await expectAsync(service.gerarParcelasComDataBase(cliente))
                .toBeRejectedWithError('O número de parcelas deve ser maior que zero');
        });

        it('deve lançar erro quando não há valor a ser parcelado', async () => {
            const cliente: Cliente = {
                id: 'test-id',
                nome: 'Cliente Teste',
                cpf: '123.456.789-00',
                telefone: '(11) 99999-9999',
                email: 'teste@email.com',
                endereco: 'Rua Teste, 123',
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: 'CONT-008',
                    valorTotal: 500,
                    valorEntrada: 500, // Igual ao total
                    numeroParcelas: 2,
                    valorParcela: 0,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-12-15')
                }
            };

            await expectAsync(service.gerarParcelasComDataBase(cliente))
                .toBeRejectedWithError('Não há valor a ser parcelado (valor total deve ser maior que a entrada)');
        });
    });

    describe('Compatibilidade com dados existentes', () => {
        it('deve usar método legado quando dataPrimeiroVencimento não estiver presente', async () => {
            const clienteLegado: Cliente = {
                id: 'test-id',
                nome: 'Cliente Legado',
                cpf: '123.456.789-00',
                telefone: '(11) 99999-9999',
                email: 'teste@email.com',
                endereco: 'Rua Teste, 123',
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: 'CONT-LEGADO',
                    valorTotal: 1000,
                    valorEntrada: 200,
                    numeroParcelas: 4,
                    valorParcela: 250,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: null as any // Simula dados antigos
                }
            };

            spyOn(service, 'gerarParcelasLegado' as any).and.returnValue(Promise.resolve());

            await service.gerarParcelas(clienteLegado);

            expect((service as any).gerarParcelasLegado).toHaveBeenCalledWith(clienteLegado);
        });

        it('deve usar novo método quando dataPrimeiroVencimento estiver presente', async () => {
            const clienteNovo: Cliente = {
                id: 'test-id',
                nome: 'Cliente Novo',
                cpf: '123.456.789-00',
                telefone: '(11) 99999-9999',
                email: 'teste@email.com',
                endereco: 'Rua Teste, 123',
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: 'CONT-NOVO',
                    valorTotal: 1000,
                    valorEntrada: 200,
                    numeroParcelas: 4,
                    valorParcela: 200,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-12-15')
                }
            };

            spyOn(service, 'gerarParcelasComDataBase').and.returnValue(Promise.resolve());

            await service.gerarParcelas(clienteNovo);

            expect(service.gerarParcelasComDataBase).toHaveBeenCalledWith(clienteNovo);
        });
    });
});
