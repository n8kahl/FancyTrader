import StyleDictionary from 'style-dictionary';
import { register } from '@tokens-studio/sd-transforms';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

await register(StyleDictionary);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, '../apps/frontend/src/styles/');

export default {
  source: ['design/tokens/tokens.json'],
  platforms: {
    css: {
      transforms: ['attribute/cti', 'name/kebab', 'ts/size/px', 'ts/opacity', 'color/hex'],
      buildPath: `${out}/`,
      files: [
        { destination: 'tokens.css', format: 'css/variables', options: { selector: ':root' } },
      ],
    },
    ts: {
      transforms: ['attribute/cti', 'name/pascal', 'ts/size/px', 'ts/opacity', 'color/hex'],
      buildPath: `${out}/`,
      files: [{ destination: 'tokens.ts', format: 'javascript/es6' }],
    },
  },
};
