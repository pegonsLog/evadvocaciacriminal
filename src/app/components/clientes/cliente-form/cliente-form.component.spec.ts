import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ClienteFormComponent } from './cliente-form.component';
import { ClienteService } from '../../../services/cliente.service';
import { ParcelaService } from '../../../services/parcela.service';
import { ModalService } from '../../../services/modal.service';
import { provideNgxMask } from 'ngx-mask';

describe('ClienteFormComponent', () => {
    let component: ClienteFormComponent;
    let fixture: ComponentFixture<ClienteFormComponent>;
    let mockClienteService: jasmine.SpyObj<ClienteService>;
    let mockParcelaService: jasmine.SpyObj<ParcelaService>;
    let mockModalService: jasmine.SpyObj<ModalService>;
    let mockRouter: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        const clienteServiceSpy = jasmine.createSpyObj('ClienteService', ['getClienteById', 'addCliente', 'updateCliente']);
        const parcelaServiceSpy = jasmine.createSpyObj('ParcelaService', ['gerarParcelas']);
        const modalServiceSpy = jasmine.createSpyObj('ModalService', ['showSuccess', 'showError', 'showConfirm']);
        const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [ClienteFormComponent, ReactiveFormsModule],
            providers: [
                { provide: ClienteService, useValue: clienteServiceSpy },
                { provide: ParcelaService, useValue: parcelaServiceSpy },
                { provide: ModalService, useValue: modalServiceSpy },
                { provide: Router, useValue: routerSpy },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: {
                                get: () => null
                            }
                        }
                    }
                },
                provideNgxMask()
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ClienteFormComponent);
        component = fixture.componentInstance;
        mockClienteService = TestBed.inject(ClienteService) as jasmine.SpyObj<ClienteService>;
        mockParcelaService = TestBed.inject(ParcelaService) as jasmine.SpyObj<ParcelaService>;
        mockModalService = TestBed.inject(ModalService) as jasmine.SpyObj<ModalService>;
        mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Cálculo de valor das parcelas', () => {
        it('deve calcular corretamente o valor da parcela descontando a entrada', () => {
            // Configurar valores no formulário
            component.clienteForm.patchValue({
                valorTotal: '1000,00',
                valorEntrada: '200,00',
                numeroParcelas: '4'
            });

            // Executar cálculo
            component.calcularValorParcela();

            // Verificar resultado: (1000 - 200) / 4 = 200
            expect(component.clienteForm.get('valorParcela')?.value).toBe('200,00');
        });

        it('deve calcular corretamente com entrada zero', () => {
            component.clienteForm.patchValue({
                valorTotal: '1200,00',
                valorEntrada: '0,00',
                numeroParcelas: '6'
            });

            component.calcularValorParcela();

            // Verificar resultado: 1200 / 6 = 200
            expect(component.clienteForm.get('valorParcela')?.value).toBe('200,00');
        });

        it('deve calcular corretamente com valores decimais', () => {
            component.clienteForm.patchValue({
                valorTotal: '1000,00',
                valorEntrada: '100,00',
                numeroParcelas: '3'
            });

            component.calcularValorParcela();

            // Verificar resultado: (1000 - 100) / 3 = 300
            expect(component.clienteForm.get('valorParcela')?.value).toBe('300,00');
        });

        it('deve recalcular automaticamente quando valores mudarem', () => {
            spyOn(component, 'calcularValorParcela');

            // Simular mudança no valor total
            component.clienteForm.get('valorTotal')?.setValue('1500,00');
            expect(component.calcularValorParcela).toHaveBeenCalled();

            // Simular mudança na entrada
            component.clienteForm.get('valorEntrada')?.setValue('300,00');
            expect(component.calcularValorParcela).toHaveBeenCalled();

            // Simular mudança no número de parcelas
            component.clienteForm.get('numeroParcelas')?.setValue('5');
            expect(component.calcularValorParcela).toHaveBeenCalled();
        });
    });

    describe('Validações do formulário', () => {
        it('deve validar que entrada não seja maior que o total', () => {
            component.clienteForm.patchValue({
                valorTotal: '500,00',
                valorEntrada: '600,00'
            });

            const entradaControl = component.clienteForm.get('valorEntrada');
            expect(entradaControl?.hasError('entradaMaiorQueTotal')).toBeTruthy();
        });

        it('deve validar que data do primeiro vencimento não seja no passado', () => {
            const ontem = new Date();
            ontem.setDate(ontem.getDate() - 1);
            const dataOntem = ontem.toISOString().split('T')[0];

            component.clienteForm.patchValue({
                dataPrimeiroVencimento: dataOntem
            });

            const dataControl = component.clienteForm.get('dataPrimeiroVencimento');
            expect(dataControl?.hasError('dateInPast')).toBeTruthy();
        });

        it('deve aceitar data do primeiro vencimento igual à data atual', () => {
            const hoje = new Date();
            const dataHoje = hoje.toISOString().split('T')[0];

            component.clienteForm.patchValue({
                dataPrimeiroVencimento: dataHoje
            });

            const dataControl = component.clienteForm.get('dataPrimeiroVencimento');
            expect(dataControl?.hasError('dateInPast')).toBeFalsy();
        });

        it('deve aceitar data do primeiro vencimento no futuro', () => {
            const amanha = new Date();
            amanha.setDate(amanha.getDate() + 1);
            const dataAmanha = amanha.toISOString().split('T')[0];

            component.clienteForm.patchValue({
                dataPrimeiroVencimento: dataAmanha
            });

            const dataControl = component.clienteForm.get('dataPrimeiroVencimento');
            expect(dataControl?.hasError('dateInPast')).toBeFalsy();
        });

        it('deve validar campos obrigatórios', () => {
            const form = component.clienteForm;

            expect(form.get('nome')?.hasError('required')).toBeTruthy();
            expect(form.get('cpf')?.hasError('required')).toBeTruthy();
            expect(form.get('telefone')?.hasError('required')).toBeTruthy();
            expect(form.get('email')?.hasError('required')).toBeTruthy();
            expect(form.get('endereco')?.hasError('required')).toBeTruthy();
            expect(form.get('numeroContrato')?.hasError('required')).toBeTruthy();
            expect(form.get('valorEntrada')?.hasError('required')).toBeTruthy();
            expect(form.get('valorTotal')?.hasError('required')).toBeTruthy();
            expect(form.get('numeroParcelas')?.hasError('required')).toBeTruthy();
            expect(form.get('dataPrimeiroVencimento')?.hasError('required')).toBeTruthy();
        });

        it('deve validar valores mínimos', () => {
            component.clienteForm.patchValue({
                valorEntrada: '-1',
                valorTotal: '0',
                numeroParcelas: '0'
            });

            expect(component.clienteForm.get('valorEntrada')?.hasError('min')).toBeTruthy();
            expect(component.clienteForm.get('valorTotal')?.hasError('min')).toBeTruthy();
            expect(component.clienteForm.get('numeroParcelas')?.hasError('min')).toBeTruthy();
        });
    });

    describe('Formatação de valores', () => {
        it('deve formatar corretamente valores monetários', () => {
            expect(component.formatarMoeda(1000)).toBe('1.000,00');
            expect(component.formatarMoeda(1234.56)).toBe('1.234,56');
            expect(component.formatarMoeda(0)).toBe('0,00');
            expect(component.formatarMoeda(999.99)).toBe('999,99');
        });
    });

    describe('Detecção de mudanças relevantes', () => {
        it('deve detectar mudanças no valor total', () => {
            const clienteAnterior = {
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
                    valorParcela: 200,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-12-15')
                }
            };

            component.clienteForm.patchValue({
                valorTotal: '1500,00', // Mudança
                valorEntrada: '200,00',
                numeroParcelas: '4',
                dataPrimeiroVencimento: '2024-12-15'
            });

            const temMudancas = (component as any).verificarMudancasRelevantes(clienteAnterior);
            expect(temMudancas).toBeTruthy();
        });

        it('deve detectar mudanças na entrada', () => {
            const clienteAnterior = {
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
                    valorParcela: 200,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-12-15')
                }
            };

            component.clienteForm.patchValue({
                valorTotal: '1000,00',
                valorEntrada: '300,00', // Mudança
                numeroParcelas: '4',
                dataPrimeiroVencimento: '2024-12-15'
            });

            const temMudancas = (component as any).verificarMudancasRelevantes(clienteAnterior);
            expect(temMudancas).toBeTruthy();
        });

        it('deve detectar mudanças no número de parcelas', () => {
            const clienteAnterior = {
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
                    valorParcela: 200,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-12-15')
                }
            };

            component.clienteForm.patchValue({
                valorTotal: '1000,00',
                valorEntrada: '200,00',
                numeroParcelas: '6', // Mudança
                dataPrimeiroVencimento: '2024-12-15'
            });

            const temMudancas = (component as any).verificarMudancasRelevantes(clienteAnterior);
            expect(temMudancas).toBeTruthy();
        });

        it('deve detectar mudanças na data do primeiro vencimento', () => {
            const clienteAnterior = {
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
                    valorParcela: 200,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-12-15')
                }
            };

            component.clienteForm.patchValue({
                valorTotal: '1000,00',
                valorEntrada: '200,00',
                numeroParcelas: '4',
                dataPrimeiroVencimento: '2024-12-20' // Mudança
            });

            const temMudancas = (component as any).verificarMudancasRelevantes(clienteAnterior);
            expect(temMudancas).toBeTruthy();
        });

        it('não deve detectar mudanças quando valores são iguais', () => {
            const clienteAnterior = {
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
                    valorParcela: 200,
                    dataCompra: new Date(),
                    dataPrimeiroVencimento: new Date('2024-12-15')
                }
            };

            component.clienteForm.patchValue({
                valorTotal: '1000,00',
                valorEntrada: '200,00',
                numeroParcelas: '4',
                dataPrimeiroVencimento: '2024-12-15'
            });

            const temMudancas = (component as any).verificarMudancasRelevantes(clienteAnterior);
            expect(temMudancas).toBeFalsy();
        });
    });
});
