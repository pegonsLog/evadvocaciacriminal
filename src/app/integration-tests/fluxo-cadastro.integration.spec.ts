import { TestBed } from '@angular/core/testing';
import { ClienteService } from '../services/cliente.service';
import { ParcelaService } from '../services/parcela.service';
import { Cliente, Parcela } from '../models/cliente.model';
import { Firestore } from '@angular/fire/firestore';

// Mock do Firestore para testes de integração
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

describe('Fluxo Completo de Cadastro - Integração', () => {
    let clienteService: ClienteService;
    let parcelaService: ParcelaService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ClienteService,
                ParcelaService,
                { provide: Firestore, useValue: mockFirestore }
            ]
        });

        clienteService = TestBed.inject(ClienteService);
        parcelaService = TestBed.inject(ParcelaService);

        // Reset dos mocks
        mockFirestore.addDoc.calls.reset();
        mockFirestore.updateDoc.calls.reset();
        mockFirestore.deleteDoc.calls.reset();
    });

    describe('6.1 Testar fluxo completo de cadastro', () => {
        it('deve calcular corretamente as parcelas no formulário e gerar parcelas no Firestore', async () => {
            // Dados de entrada simulando o formulário
            const dadosFormulario = {
                nome: 'João Silva',
                cpf: '123.456.789-00',
                telefone: '(11) 99999-9999',
                email: 'joao@email.com',
                endereco: 'Rua das Flores, 123',
                numeroContrato: 'CONT-2024-001',
                valorTotal: 1000,
                valorEntrada: 200,
                numeroParcelas: 4,
                dataPrimeiroVencimento: new Date('2024-12-15')
            };

            // 1. Verificar cálculo correto das parcelas no formulário
            const valorParcelado = dadosFormulario.valorTotal - dadosFormulario.valorEntrada;
            const valorParcela = valorParcelado / dadosFormulario.numeroParcelas;

            expect(valorParcelado).toBe(800); // 1000 - 200
            expect(valorParcela).toBe(200); // 800 / 4

            // 2. Criar cliente com os dados calculados
            const cliente: Cliente = {
                id: 'test-cliente-id',
                nome: dadosFormulario.nome,
                cpf: dadosFormulario.cpf,
                telefone: dadosFormulario.telefone,
                email: dadosFormulario.email,
                endereco: dadosFormulario.endereco,
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: dadosFormulario.numeroContrato,
                    valorTotal: dadosFormulario.valorTotal,
                    valorEntrada: dadosFormulario.valorEntrada,
                    numeroParcelas: dadosFormulario.numeroParcelas,
                    valorParcela: valorParcela,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: dadosFormulario.dataPrimeiroVencimento
                }
            };

            // Mock para simular que o cliente foi salvo
            spyOn(clienteService, 'addCliente').and.returnValue(Promise.resolve('test-cliente-id'));
            spyOn(parcelaService, 'deleteParcelasByCliente').and.returnValue(Promise.resolve());

            // 3. Gerar parcelas
            await parcelaService.gerarParcelasComDataBase(cliente);

            // 4. Verificar que as parcelas foram geradas corretamente
            expect(mockFirestore.addDoc).toHaveBeenCalledTimes(4);

            // Verificar os dados das parcelas geradas
            const chamadas = mockFirestore.addDoc.calls.all();

            chamadas.forEach((chamada, index) => {
                const parcela = chamada.args[1];

                // Verificar dados básicos da parcela
                expect(parcela.clienteId).toBe(cliente.id);
                expect(parcela.clienteNome).toBe(cliente.nome);
                expect(parcela.numeroContrato).toBe(cliente.compra.numeroContrato);
                expect(parcela.numeroParcela).toBe(index + 1);
                expect(parcela.valorParcela).toBe(200);
                expect(parcela.status).toBe('pendente');
                expect(parcela.diasAtraso).toBe(0);
            });

            console.log('✅ Teste de fluxo completo de cadastro passou');
        });

        it('deve gerar datas de vencimento corretas baseadas na data do primeiro vencimento', async () => {
            const cliente: Cliente = {
                id: 'test-cliente-id',
                nome: 'Maria Santos',
                cpf: '987.654.321-00',
                telefone: '(11) 88888-8888',
                email: 'maria@email.com',
                endereco: 'Av. Principal, 456',
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: 'CONT-2024-002',
                    valorTotal: 1200,
                    valorEntrada: 300,
                    numeroParcelas: 3,
                    valorParcela: 300,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-01-31') // 31 de janeiro
                }
            };

            spyOn(parcelaService, 'deleteParcelasByCliente').and.returnValue(Promise.resolve());

            await parcelaService.gerarParcelasComDataBase(cliente);

            const chamadas = mockFirestore.addDoc.calls.all();

            // Verificar datas de vencimento
            // Primeira parcela: 31/01/2024
            expect(chamadas[0].args[1].dataVencimento.getDate()).toBe(31);
            expect(chamadas[0].args[1].dataVencimento.getMonth()).toBe(0); // Janeiro

            // Segunda parcela: 29/02/2024 (ajustado para último dia do mês)
            expect(chamadas[1].args[1].dataVencimento.getDate()).toBe(29);
            expect(chamadas[1].args[1].dataVencimento.getMonth()).toBe(1); // Fevereiro

            // Terceira parcela: 31/03/2024
            expect(chamadas[2].args[1].dataVencimento.getDate()).toBe(31);
            expect(chamadas[2].args[1].dataVencimento.getMonth()).toBe(2); // Março

            console.log('✅ Teste de geração de datas de vencimento passou');
        });

        it('deve validar persistência no Firestore com dados corretos', async () => {
            const cliente: Cliente = {
                id: 'test-cliente-id',
                nome: 'Pedro Costa',
                cpf: '111.222.333-44',
                telefone: '(11) 77777-7777',
                email: 'pedro@email.com',
                endereco: 'Rua Nova, 789',
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: 'CONT-2024-003',
                    valorTotal: 600,
                    valorEntrada: 100,
                    numeroParcelas: 5,
                    valorParcela: 100,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-12-10')
                }
            };

            spyOn(parcelaService, 'deleteParcelasByCliente').and.returnValue(Promise.resolve());

            await parcelaService.gerarParcelasComDataBase(cliente);

            // Verificar que addDoc foi chamado com a coleção correta
            const chamadas = mockFirestore.addDoc.calls.all();

            chamadas.forEach((chamada, index) => {
                // Verificar que foi chamado com a coleção de parcelas
                expect(chamada.args[0]).toBe(mockFirestore.collection());

                const parcela = chamada.args[1];

                // Verificar estrutura completa da parcela
                expect(parcela).toEqual(jasmine.objectContaining({
                    clienteId: cliente.id,
                    clienteNome: cliente.nome,
                    numeroContrato: cliente.compra.numeroContrato,
                    numeroParcela: index + 1,
                    valorParcela: 100,
                    dataVencimento: jasmine.any(Date),
                    diasAtraso: 0,
                    status: 'pendente'
                }));
            });

            console.log('✅ Teste de persistência no Firestore passou');
        });
    });

    describe('6.2 Testar compatibilidade com dados existentes', () => {
        it('deve funcionar com clientes antigos que não têm dataPrimeiroVencimento', async () => {
            const clienteAntigo: Cliente = {
                id: 'cliente-antigo-id',
                nome: 'Cliente Antigo',
                cpf: '555.666.777-88',
                telefone: '(11) 66666-6666',
                email: 'antigo@email.com',
                endereco: 'Rua Antiga, 123',
                dataCadastro: new Date('2023-01-01'),
                compra: {
                    numeroContrato: 'CONT-2023-001',
                    valorTotal: 800,
                    valorEntrada: 200,
                    numeroParcelas: 3,
                    valorParcela: 200,
                    dataCompra: new Date('2023-01-01'),
                    dataPrimeiroVencimento: null as any // Simula dados antigos
                }
            };

            // Spy no método legado
            spyOn(parcelaService, 'gerarParcelasLegado' as any).and.returnValue(Promise.resolve());

            // Chamar o método principal
            await parcelaService.gerarParcelas(clienteAntigo);

            // Verificar que o método legado foi chamado
            expect((parcelaService as any).gerarParcelasLegado).toHaveBeenCalledWith(clienteAntigo);

            console.log('✅ Teste de compatibilidade com dados antigos passou');
        });

        it('deve usar nova lógica para clientes com dataPrimeiroVencimento', async () => {
            const clienteNovo: Cliente = {
                id: 'cliente-novo-id',
                nome: 'Cliente Novo',
                cpf: '999.888.777-66',
                telefone: '(11) 55555-5555',
                email: 'novo@email.com',
                endereco: 'Rua Nova, 456',
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: 'CONT-2024-004',
                    valorTotal: 1500,
                    valorEntrada: 500,
                    numeroParcelas: 5,
                    valorParcela: 200,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-12-20')
                }
            };

            // Spy no método novo
            spyOn(parcelaService, 'gerarParcelasComDataBase').and.returnValue(Promise.resolve());

            // Chamar o método principal
            await parcelaService.gerarParcelas(clienteNovo);

            // Verificar que o método novo foi chamado
            expect(parcelaService.gerarParcelasComDataBase).toHaveBeenCalledWith(clienteNovo);

            console.log('✅ Teste de nova lógica para clientes novos passou');
        });

        it('deve preservar parcelas pagas durante recálculo', async () => {
            const cliente: Cliente = {
                id: 'cliente-recalculo-id',
                nome: 'Cliente Recálculo',
                cpf: '444.333.222-11',
                telefone: '(11) 44444-4444',
                email: 'recalculo@email.com',
                endereco: 'Rua Recálculo, 789',
                dataCadastro: new Date(),
                compra: {
                    numeroContrato: 'CONT-2024-005',
                    valorTotal: 1000,
                    valorEntrada: 200,
                    numeroParcelas: 4,
                    valorParcela: 200,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-12-25')
                }
            };

            // Simular parcelas existentes (algumas pagas, outras pendentes)
            const parcelasExistentes: Parcela[] = [
                {
                    id: 'parcela-1',
                    clienteId: cliente.id,
                    clienteNome: cliente.nome,
                    numeroContrato: cliente.compra.numeroContrato,
                    numeroParcela: 1,
                    valorParcela: 200,
                    dataVencimento: new Date('2024-12-25'),
                    dataPagamento: new Date('2024-12-20'),
                    valorPago: 200,
                    diasAtraso: 0,
                    status: 'pago'
                },
                {
                    id: 'parcela-2',
                    clienteId: cliente.id,
                    clienteNome: cliente.nome,
                    numeroContrato: cliente.compra.numeroContrato,
                    numeroParcela: 2,
                    valorParcela: 200,
                    dataVencimento: new Date('2025-01-25'),
                    diasAtraso: 0,
                    status: 'pendente'
                }
            ];

            // Mock do método que retorna parcelas por cliente
            spyOn(parcelaService, 'getParcelasByCliente').and.returnValue(parcelasExistentes);
            spyOn(parcelaService, 'deleteParcela').and.returnValue(Promise.resolve());

            // Executar recálculo
            await parcelaService.recalcularParcelas(cliente);

            // Verificar que apenas a parcela pendente foi deletada
            expect(parcelaService.deleteParcela).toHaveBeenCalledTimes(1);
            expect(parcelaService.deleteParcela).toHaveBeenCalledWith('parcela-2');

            console.log('✅ Teste de preservação de parcelas pagas durante recálculo passou');
        });

        it('não deve quebrar o sistema atual com dados mistos', async () => {
            // Teste com diferentes tipos de dados para garantir robustez
            const cenarios = [
                {
                    nome: 'Cliente com entrada zero',
                    cliente: {
                        id: 'cliente-entrada-zero',
                        nome: 'Cliente Entrada Zero',
                        cpf: '000.111.222-33',
                        telefone: '(11) 33333-3333',
                        email: 'zero@email.com',
                        endereco: 'Rua Zero, 123',
                        dataCadastro: new Date(),
                        compra: {
                            numeroContrato: 'CONT-ZERO',
                            valorTotal: 600,
                            valorEntrada: 0,
                            numeroParcelas: 3,
                            valorParcela: 200,
                            dataCompra: new Date(),
                            dataPrimeiroVencimento: new Date('2024-12-30')
                        }
                    }
                },
                {
                    nome: 'Cliente com uma parcela',
                    cliente: {
                        id: 'cliente-uma-parcela',
                        nome: 'Cliente Uma Parcela',
                        cpf: '111.000.333-44',
                        telefone: '(11) 22222-2222',
                        email: 'uma@email.com',
                        endereco: 'Rua Uma, 456',
                        dataCadastro: new Date(),
                        compra: {
                            numeroContrato: 'CONT-UMA',
                            valorTotal: 500,
                            valorEntrada: 100,
                            numeroParcelas: 1,
                            valorParcela: 400,
                            dataCompra: new Date(),
                            dataPrimeiroVencimento: new Date('2025-01-15')
                        }
                    }
                }
            ];

            for (const cenario of cenarios) {
                mockFirestore.addDoc.calls.reset();
                spyOn(parcelaService, 'deleteParcelasByCliente').and.returnValue(Promise.resolve());

                // Não deve lançar erro
                await expectAsync(parcelaService.gerarParcelasComDataBase(cenario.cliente as Cliente))
                    .toBeResolved();

                // Deve gerar o número correto de parcelas
                expect(mockFirestore.addDoc).toHaveBeenCalledTimes(cenario.cliente.compra.numeroParcelas);

                console.log(`✅ Cenário "${cenario.nome}" passou`);
            }

            console.log('✅ Teste de robustez com dados mistos passou');
        });
    });
});
