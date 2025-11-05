@echo off
echo Configurando arquivos de ambiente...

if not exist "src\environments\environment.ts" (
    copy "src\environments\environment.template.ts" "src\environments\environment.ts"
    echo Arquivo environment.ts criado
) else (
    echo Arquivo environment.ts ja existe
)

if not exist "src\environments\environment.development.ts" (
    copy "src\environments\environment.development.template.ts" "src\environments\environment.development.ts"
    echo Arquivo environment.development.ts criado
) else (
    echo Arquivo environment.development.ts ja existe
)

if not exist "src\environments\environment.production.ts" (
    copy "src\environments\environment.production.template.ts" "src\environments\environment.production.ts"
    echo Arquivo environment.production.ts criado
) else (
    echo Arquivo environment.production.ts ja existe
)

echo.
echo IMPORTANTE: Edite os arquivos de ambiente criados e substitua os placeholders pelas suas chaves reais do Firebase.
echo Consulte o arquivo CONFIGURACAO_AMBIENTE.md para mais detalhes.
echo.
pause
