#!/usr/bin/env node

/**
 * Script para testar a configuração PWA após deployment
 * Verifica se todos os arquivos necessários estão presentes
 */

const fs = require('fs');
const path = require('path');

const distPath = 'dist/evadvociacriminal';

// Arquivos obrigatórios para PWA
const requiredFiles = [
    'index.html',
    'ngsw-worker.js',
    'ngsw.json',
    'manifest.webmanifest',
    'manifest.json',
    'safety-worker.js'
];

// Diretórios obrigatórios
const requiredDirs = [
    'assets/icons',
    'assets/splash'
];

// Ícones PWA obrigatórios
const requiredIcons = [
    'assets/icons/LogoEvac72.png',
    'assets/icons/LogoEvac96.png',
    'assets/icons/LogoEvac128.png',
    'assets/icons/LogoEvac144.png',
    'assets/icons/LogoEvac152.png',
    'assets/icons/LogoEvac192.png',
    'assets/icons/LogoEvac384.png',
    'assets/icons/LogoEvac512.png'
];

console.log('🔍 Testando configuração PWA...\n');

let allTestsPassed = true;

// Verificar se o diretório de build existe
if (!fs.existsSync(distPath)) {
    console.error('❌ Diretório de build não encontrado:', distPath);
    process.exit(1);
}

// Verificar arquivos obrigatórios
console.log('📁 Verificando arquivos obrigatórios...');
requiredFiles.forEach(file => {
    const filePath = path.join(distPath, file);
    if (fs.existsSync(filePath)) {
        console.log('✅', file);
    } else {
        console.log('❌', file, '- AUSENTE');
        allTestsPassed = false;
    }
});

// Verificar diretórios
console.log('\n📂 Verificando diretórios...');
requiredDirs.forEach(dir => {
    const dirPath = path.join(distPath, dir);
    if (fs.existsSync(dirPath)) {
        console.log('✅', dir);
    } else {
        console.log('❌', dir, '- AUSENTE');
        allTestsPassed = false;
    }
});

// Verificar ícones PWA
console.log('\n🎨 Verificando ícones PWA...');
requiredIcons.forEach(icon => {
    const iconPath = path.join(distPath, icon);
    if (fs.existsSync(iconPath)) {
        console.log('✅', icon);
    } else {
        console.log('❌', icon, '- AUSENTE');
        allTestsPassed = false;
    }
});

// Verificar conteúdo do manifest
console.log('\n📋 Verificando manifest...');
try {
    const manifestPath = path.join(distPath, 'manifest.webmanifest');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    if (manifest.name && manifest.short_name && manifest.icons && manifest.icons.length > 0) {
        console.log('✅ Manifest válido');
        console.log('   - Nome:', manifest.name);
        console.log('   - Nome curto:', manifest.short_name);
        console.log('   - Ícones:', manifest.icons.length);
    } else {
        console.log('❌ Manifest inválido ou incompleto');
        allTestsPassed = false;
    }
} catch (error) {
    console.log('❌ Erro ao ler manifest:', error.message);
    allTestsPassed = false;
}

// Verificar service worker config
console.log('\n⚙️ Verificando configuração do Service Worker...');
try {
    const ngswPath = path.join(distPath, 'ngsw.json');
    const ngsw = JSON.parse(fs.readFileSync(ngswPath, 'utf8'));
    
    if (ngsw.assetGroups && ngsw.assetGroups.length > 0) {
        console.log('✅ Configuração do Service Worker válida');
        console.log('   - Grupos de assets:', ngsw.assetGroups.length);
        
        // Verificar se os ícones estão no cache
        const assetsGroup = ngsw.assetGroups.find(group => group.name === 'assets');
        if (assetsGroup && assetsGroup.urls) {
            const iconUrls = assetsGroup.urls.filter(url => url.includes('/assets/icons/'));
            console.log('   - Ícones no cache:', iconUrls.length);
        }
    } else {
        console.log('❌ Configuração do Service Worker inválida');
        allTestsPassed = false;
    }
} catch (error) {
    console.log('❌ Erro ao ler configuração do Service Worker:', error.message);
    allTestsPassed = false;
}

// Resultado final
console.log('\n' + '='.repeat(50));
if (allTestsPassed) {
    console.log('🎉 Todos os testes passaram! PWA configurado corretamente.');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Deploy para Firebase: firebase deploy');
    console.log('   2. Testar instalação em dispositivo móvel');
    console.log('   3. Verificar funcionamento offline');
    process.exit(0);
} else {
    console.log('❌ Alguns testes falharam. Verifique a configuração PWA.');
    process.exit(1);
}