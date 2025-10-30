# Configuração Bootstrap + Montserrat

## ✅ Configurações Aplicadas

### 1. Dependências Instaladas
- `bootstrap` - Framework CSS
- `@ng-bootstrap/ng-bootstrap` - Componentes Bootstrap para Angular
- `@popperjs/core` - Necessário para tooltips e popovers
- `@angular/localize` - Necessário para ng-bootstrap

### 2. Fonte Montserrat
- Importada do Google Fonts no `styles.scss`
- Configurada como fonte padrão em todo o app
- Pesos disponíveis: 300, 400, 500, 600, 700

### 3. Bootstrap SCSS
- Importado no `styles.scss`
- Permite customização de variáveis Bootstrap

## 📦 Instalação

Execute o comando para instalar as novas dependências:

```bash
npm install
```

## 🎨 Como Usar Bootstrap

### Classes Utilitárias
Você pode usar todas as classes do Bootstrap 5 diretamente nos templates:

```html
<div class="container">
  <div class="row">
    <div class="col-md-6">
      <button class="btn btn-primary">Botão</button>
    </div>
  </div>
</div>
```

### Componentes ng-bootstrap
Para usar componentes interativos, importe do `@ng-bootstrap/ng-bootstrap`:

```typescript
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [NgbModule],
  // ...
})
```

Ou importe componentes específicos:

```typescript
import { NgbDropdownModule, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
```

## 🎯 Customização

Para customizar variáveis do Bootstrap, crie um arquivo `src/styles/_variables.scss`:

```scss
// Cores personalizadas
$primary: #1a1a2e;
$secondary: #16213e;
$success: #0f3460;

// Fonte
$font-family-base: 'Montserrat', sans-serif;
```

E importe antes do Bootstrap no `styles.scss`:

```scss
@import 'variables';
@import "bootstrap/scss/bootstrap";
```

## 📚 Documentação

- [Bootstrap 5](https://getbootstrap.com/docs/5.3/)
- [ng-bootstrap](https://ng-bootstrap.github.io/)
- [Google Fonts - Montserrat](https://fonts.google.com/specimen/Montserrat)
