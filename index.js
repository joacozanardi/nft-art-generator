const { readFileSync, writeFileSync, readdirSync, rmSync, existsSync, mkdirSync } = require('fs');
const sharp = require('sharp');
const config = require('./config');

const SVG_WIDTH = 256
const SVG_HEIGHT = 256

const template = `
    <svg width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        ${Object.keys(config.layers).map(layer => `<!-- ${layer} -->`).join('\n')}
    </svg>
`;

function randInt(max) {
    return Math.floor(Math.random() * (max + 1));
}

function createImage(index) {
    let finalSvg = template;

    const attributes = Object.entries(config.layers).map(([part, { count }]) => {
        const partIndex = randInt(count - 1);
        finalSvg = finalSvg.replace(
            `<!-- ${part} -->`,
            getLayer(`${part}/${part}${partIndex}`)
        );
        return {
            trait_type: part,
            value: partIndex
        };
    });

    const name = `${config.collectionName} #${index}`;
    console.log(name);

    const meta = {
        name,
        description: `A drawing of ${name.split('-').join(' ')}`,
        image: `${index}.png`,
        attributes
    };

    writeFileSync(`${config.outputDir}/${index}.json`, JSON.stringify(meta, null, 2));
    writeFileSync(`${config.outputDir}/${index}.svg`, finalSvg);
    svgToPng(index);
}

function getLayer(name) {
    const [category, fileName] = name.split('/');
    const filePath = `./layers/${category}/${fileName}.svg`;
    try {
        const svg = readFileSync(filePath, 'utf-8');
        const re = /<svg[^>]*>([\s\S]*?)<\/svg>/i;
        const layer = svg.match(re)[0];
        return layer;
    } catch (error) {
        console.error(`Error reading layer file: ${filePath}`, error);
        return '';
    }
}

async function svgToPng(name) {
    const src = `${config.outputDir}/${name}.svg`;
    const dest = `${config.outputDir}/${name}.png`;

    const img = await sharp(src, {
        density: 300
    });

    const resized = await img
        .resize(config.imageSize, config.imageSize, {
            fit: 'contain',
            kernel: 'lanczos3'
        })
        .png({
            compressionLevel: 9,
            adaptiveFiltering: true,
            quality: 100
        });

    await resized.toFile(dest);
}

if (!existsSync(config.outputDir)) {
    mkdirSync(config.outputDir);
}

readdirSync(config.outputDir).forEach(f => rmSync(`${config.outputDir}/${f}`));

for (let collectionSize = 0; collectionSize < config.collectionSize; collectionSize++) {
    createImage(collectionSize);
}