import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const zip = new AdmZip();
const distDir = path.join(process.cwd(), 'dist');

console.log('Iniciando empacotamento do ZIP para o Netlify...');

if (!fs.existsSync(distDir)) {
  console.error('Erro: A pasta dist/ não existe. Execute o build primeiro.');
  process.exit(1);
}

// Ler itens do diretório dist/ para adicionar seletivamente (evitando arquivos do servidor e o próprio zip anterior)
const items = fs.readdirSync(distDir);
for (const item of items) {
  const itemPath = path.join(distDir, item);
  
  // Ignorar arquivos do servidor Node e o próprio zip antigo para manter o pacote leve e puramente estático (Netlify)
  if (
    item === 'server.cjs' || 
    item === 'server.cjs.map' || 
    item === 'calculadora_supermercado_netlify.zip'
  ) {
    continue;
  }
  
  const stat = fs.statSync(itemPath);
  if (stat.isDirectory()) {
    console.log(`Adicionando pasta: ${item}/`);
    zip.addLocalFolder(itemPath, item);
  } else {
    console.log(`Adicionando arquivo: ${item}`);
    zip.addLocalFile(itemPath, '');
  }
}

const publicZipPath = path.join(process.cwd(), 'public', 'calculadora_supermercado_netlify.zip');
const distZipPath = path.join(distDir, 'calculadora_supermercado_netlify.zip');

// Garantir que a pasta public existe
if (!fs.existsSync(path.dirname(publicZipPath))) {
  fs.mkdirSync(path.dirname(publicZipPath), { recursive: true });
}

// Escrever o arquivo ZIP
zip.writeZip(publicZipPath);
zip.writeZip(distZipPath);

console.log(`Sucesso! ZIP para o Netlify gerado com sucesso em:`);
console.log(`- ${publicZipPath}`);
console.log(`- ${distZipPath}`);
