const { readdirSync } = require('fs');

function getPartCount(partName) {
    const partPath = `./layers/${partName}`;
    try {
        return readdirSync(partPath).length;
    } catch {
        return 0;
    }
}

module.exports = {
    collectionName: "Puddle Foxes",
    imageSize: 1024,
    collectionSize: 10,
    layers: {
        bg: { count: getPartCount('bg') },
        body: { count: getPartCount('body') },
        hair: { count: getPartCount('hair') },
        eyes: { count: getPartCount('eyes') },
        nose: { count: getPartCount('nose') },
        mouth: { count: getPartCount('mouth') },
        beard: { count: getPartCount('beard') }
    },
    outputDir: './out'
};