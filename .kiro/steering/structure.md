# Project Structure & Organization

## Root Directory Structure

```
evadvociacriminal/
├── src/                    # Source code
├── dist/                   # Build output
├── public/                 # Static hosting files
├── .firebase/              # Firebase deployment cache
├── node_modules/           # Dependencies
├── Arquivos Markdown/      # Documentation files
└── .kiro/                  # Kiro AI assistant configuration
```

## Source Code Organization (`src/`)

```
src/
├── app/
│   ├── components/         # Feature components
│   │   ├── auth/          # Authentication components
│   │   ├── clientes/      # Client management
│   │   ├── controle-pagamentos/  # Payment control dashboard
│   │   ├── home/          # Home/dashboard
│   │   ├── pagamentos/    # Payment processing
│   │   ├── parcelas/      # Installment management
│   │   └── shared/        # Reusable components
│   ├── services/          # Business logic services
│   │   ├── auth.service.ts
│   │   ├── cliente.service.ts
│   │   ├── modal.service.ts
│   │   └── parcela.service.ts
│   ├── models/            # TypeScript interfaces/models
│   │   ├── cliente.model.ts
│   │   └── user.model.ts
│   ├── guards/            # Route protection
│   │   ├── admin.guard.ts
│   │   ├── auth.guard.ts
│   │   └── role.guard.ts
│   ├── app.component.*    # Root component
│   ├── app.config.ts      # App configuration
│   └── app.routes.ts      # Routing configuration
├── assets/                # Static assets
├── environments/          # Environment configurations
├── styles.scss           # Global styles
├── main.ts              # Application bootstrap
└── index.html           # Main HTML template
```

## Architecture Patterns

### Component Organization

- **Feature-based folders**: Components grouped by business domain
- **Standalone components**: Angular 17 standalone architecture
- **Shared components**: Reusable UI elements in `shared/` folder

### Service Layer

- **Business logic**: Centralized in services
- **Firebase integration**: Services handle Firestore operations
- **State management**: RxJS observables for reactive data flow

### Security & Access Control

- **Route guards**: Protect routes based on authentication and roles
- **Firestore rules**: Server-side security rules for data access
- **Role-based access**: Admin vs regular user permissions

## Naming Conventions

- **Components**: kebab-case (e.g., `controle-pagamentos.component.ts`)
- **Services**: camelCase with `.service.ts` suffix
- **Models**: camelCase with `.model.ts` suffix
- **Guards**: camelCase with `.guard.ts` suffix

## Styling Architecture

- **Global styles**: `src/styles.scss` with Bootstrap integration
- **Component styles**: SCSS files alongside components
- **Custom classes**: `.btn-action` for consistent button styling
- **Font**: Montserrat from Google Fonts
