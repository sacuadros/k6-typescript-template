import esbuild from 'esbuild';
import { promises as fsPromises, existsSync } from 'fs';
const { readdir, copyFile, mkdir, rm } = fsPromises;
import { dirname, join, extname, relative } from 'path';
import { fileURLToPath } from 'url';

// Getting __dirname in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcDirectory = join(__dirname, 'src');
const distDirectory = join(__dirname, 'dist');

async function deleteDistDirectory() {
  if (existsSync(distDirectory)) {
    await rm(distDirectory, { recursive: true, force: true });
  }
}

async function copyFiles(
  srcDir,
  destDir,
  excludeExtensions = ['.ts', '.DS_Store'],
) {
  const dirents = await readdir(srcDir, { withFileTypes: true });
  await Promise.all(
    dirents.map(async (dirent) => {
      const srcPath = join(srcDir, dirent.name);
      const destPath = join(destDir, dirent.name);

      if (excludeExtensions.includes(extname(dirent.name))) return;

      if (dirent.isDirectory()) {
        if (!existsSync(destPath)) {
          await mkdir(destPath, { recursive: true });
        }
        await copyFiles(srcPath, destPath, excludeExtensions);
      } else {
        const destDirPath = dirname(destPath);
        if (!existsSync(destDirPath)) {
          await mkdir(destDirPath, { recursive: true });
        }
        await copyFile(srcPath, destPath);
      }
    }),
  );
}

async function compileTsFiles(srcDir, baseOutDir) {
  const dirents = await readdir(srcDir, { withFileTypes: true });
  const compilePromises = dirents.map(async (dirent) => {
    const srcPath = join(srcDir, dirent.name);
    if (dirent.isDirectory()) {
      await compileTsFiles(srcPath, baseOutDir);
    } else if (extname(srcPath) === '.ts') {
      const outDir = join(baseOutDir, relative(srcDirectory, dirname(srcPath)));
      return esbuild.build({
        entryPoints: [srcPath],
        outdir: outDir,
        bundle: true,
        minify: true,
        platform: 'node',
        format: 'esm',
        target: 'es2018',
        external: ['k6', 'k6/*', 'inquirer', 'dotenv'],
      });
    }
  });
  await Promise.all(compilePromises);
}

async function build() {
  await deleteDistDirectory();
  await copyFiles(srcDirectory, distDirectory, ['.ts', '.DS_Store']);
  await compileTsFiles(srcDirectory, distDirectory);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
