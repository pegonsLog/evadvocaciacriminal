# Technology Stack

## Framework & Core Technologies

- **Angular 17**: Using standalone components architecture
- **TypeScript 5.2**: Strict mode enabled with comprehensive compiler options
- **SCSS**: Styling with Bootstrap integration
- **Firebase**: Backend services (Firestore, Authentication, Hosting)

## Key Libraries & Dependencies

- **@angular/fire**: Firebase integration for Angular
- **@ng-bootstrap/ng-bootstrap**: Bootstrap components for Angular
- **bootstrap 5.3**: UI framework with custom SCSS overrides
- **ngx-mask**: Input masking for forms
- **RxJS**: Reactive programming for data streams

## Development Tools

- **Angular CLI**: Project scaffolding and build system
- **Karma + Jasmine**: Testing framework
- **TypeScript**: Strict compilation settings

## Common Commands

### Development

```bash
npm start                    # Start development server (localhost:4200)
ng serve                     # Alternative start command
npm run watch               # Build with watch mode
```

### Building

```bash
npm run build               # Production build
ng build --configuration production  # Explicit production build
```

### Testing

```bash
npm test                    # Run unit tests with Karma
ng test                     # Alternative test command
```

### Firebase Deployment

```bash
firebase deploy             # Deploy to Firebase hosting
firebase serve              # Local Firebase emulation
```

## Build Configuration

- **Output**: `dist/evadvociacriminal/`
- **Environments**: Development and production configurations
- **Bundle Limits**: 1.5MB warning, 6MB error for initial bundle
- **Style Limits**: 12KB per component style file
