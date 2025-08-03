const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const prismaClientDir = path.join(projectRoot, 'node_modules', '@prisma', 'client');
const prismaDir = path.join(projectRoot, 'node_modules', '.prisma');

function rmdirRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        rmdirRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

console.log('Cleaning Prisma directories...');
rmdirRecursive(prismaClientDir);
rmdirRecursive(prismaDir);
console.log('Prisma directories cleaned.');

console.log('Running prisma generate...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('Prisma client generated successfully.');
} catch (error) {
  console.error('Failed to generate Prisma client:', error);
  process.exit(1);
}
