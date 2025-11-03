import { ClienteFormComponent } from './cliente-form.component';
import { FormBuilder } from '@angular/forms';

describe('ClienteFormComponent - Testes Simples', () => {
    let component: ClienteFormComponent;
    let formBuilder: FormBuilder;

    beforeEach(() => {
        formBuilder = new FormBuilder();

        // Criar instância do componente com mocks mínimos
        component = new ClienteFormComponent(
            formBuilder,
            {} as any, // ClienteService mock
            {} as any, // ParcelaService mock
            {} as any, // Router mock
            { snapshot: { paramMap: { get: () => null } } } as any, // ActivatedRoute mock
            {} as any  // ModalService mock
        );

        // Inicializar formulário
        component.ngOnInit();
    });

    it('deve ser criado', () => {
        expect(component).toBeTruthy();
    });

    it('deve calcular valor da parcela corretamente', () => {
        // Configurar valores no formulário
        component.clienteForm.patchValue({
            valorTotal: 1000,
            valorEntrada: 200,
            numeroParcelas: 4
        });

        // Executar cálculo
        component.calcularValorParcela();

        // Verificar resultado: (1000 - 200) / 4 = 200
        expect(component.clienteForm.get('valorParcela')?.value).toBe('200,00');
    });

    it('deve calcular com entrada zero', () => {
        component.clienteForm.patchValue({
            valorTotal: 1200,
            valorEntrada: 0,
            numeroParcelas: 6
        });

        component.calcularValorParcela();

        // Verificar resultado: 1200 / 6 = 200
        expect(component.clienteForm.get('valorParcela')?.value).toBe('200,00');
    });

    it('deve formatar moeda corretamente', () => {
        expect(component.formatarMoeda(1000)).toBe('1.000,00');
        expect(component.formatarMoeda(1234.56)).toBe('1.234,56');
        expect(component.formatarMoeda(0)).toBe('0,00');
    });

    it('deve validar entrada maior que total', () => {
        component.clienteForm.patchValue({
            valorTotal: 500,
            valorEntrada: 600
        });

        const entradaControl = component.clienteForm.get('valorEntrada');
        const errors = component.entradaMenorQueTotal(entradaControl!);

        expect(errors).toEqual({ entradaMaiorQueTotal: true });
    });

    it('deve validar data no passado', () => {
        const ontem = new Date();
        ontem.setDate(ontem.getDate() - 1);

        const mockControl = {
            value: ontem.toISOString().split('T')[0]
        } as any;

        const errors = component.dateNotInPastValidator(mockControl);
        expect(errors).toEqual({ dateInPast: true });
    });

    it('deve aceitar data atual ou futura', () => {
        const hoje = new Date();
        const mockControl = {
            value: hoje.toISOString().split('T')[0]
        } as any;

        const errors = component.dateNotInPastValidator(mockControl);
        expect(errors).toBeNull();
    });
});
