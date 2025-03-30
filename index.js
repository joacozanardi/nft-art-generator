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

// Array to store all metadata entries for CSV generation
const allMetadata = [];

function randInt(max) {
    return Math.floor(Math.random() * (max + 1));
}

function createImage(index) {
    let finalSvg = template;

    // Create an object to store attributes for CSV format
    const attributeValues = {};

    const attributes = Object.entries(config.layers).map(([part, { count }]) => {
        const partIndex = randInt(count - 1);
        finalSvg = finalSvg.replace(
            `<!-- ${part} -->`,
            getLayer(`${part}/${part}${partIndex}`)
        );

        attributeValues[part] = partIndex;

        return {
            trait_type: part,
            value: partIndex
        };
    });

    const name = `${config.collectionName} #${index}`;
    console.log(name);

    allMetadata.push({
        tokenID: index,
        name,
        description: `A drawing of ${name.split('-').join(' ')}`,
        file_name: `${index}.png`,
        attributes: attributeValues
    });

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

// Function to escape CSV values that contain commas, quotes, or newlines
function escapeCSV(value) {
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

// Function to generate CSV from collected metadata
function generateCSV() {
    // Get all attribute keys
    const attributeKeys = new Set();
    allMetadata.forEach(item => {
        Object.keys(item.attributes).forEach(key => {
            attributeKeys.add(key);
        });
    });

    // Create CSV header
    let csvContent = 'tokenID,name,description,file_name';
    attributeKeys.forEach(key => {
        csvContent += `,attributes[${key}]`;
    });
    csvContent += '\n';

    // Add data rows
    allMetadata.forEach(item => {
        csvContent += `${item.tokenID},${escapeCSV(item.name)},${escapeCSV(item.description)},${item.file_name}`;

        attributeKeys.forEach(key => {
            const value = item.attributes[key] !== undefined ? item.attributes[key] : '';
            csvContent += `,${escapeCSV(value)}`;
        });

        csvContent += '\n';
    });

    writeFileSync(`${config.outputDir}/metadata.csv`, csvContent);
    console.log(`CSV metadata written to ${config.outputDir}/metadata.csv`);
}


if (!existsSync(config.outputDir)) {
    mkdirSync(config.outputDir);
}

readdirSync(config.outputDir).forEach(f => rmSync(`${config.outputDir}/${f}`));

for (let collectionSize = 1; collectionSize <= config.collectionSize; collectionSize++) {
    createImage(collectionSize);
}

generateCSV();