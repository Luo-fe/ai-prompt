const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function generateMultiSizeIco() {
  const inputPath = path.join(__dirname, 'icon.png');
  const outputPath = path.join(__dirname, 'icon.ico');

  const inputBuffer = fs.readFileSync(inputPath);

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const resized = await sharp(inputBuffer).resize(size, size).png().toBuffer();
    pngBuffers.push(resized);
    console.log(`  Generated ${size}x${size}`);
  }

  const icoBuffer = await toIco(pngBuffers);
  fs.writeFileSync(outputPath, icoBuffer);

  console.log(`\nMulti-size ICO created: ${outputPath}`);
  console.log(`Size: ${icoBuffer.length} bytes`);
  console.log(`Sizes included: ${sizes.join(', ')}`);

  const verify = fs.readFileSync(outputPath);
  const type = verify.readUInt16LE(2);
  const count = verify.readUInt16LE(4);
  console.log(`\nVerification: Type=${type} (1=ICO), Images=${count}`);
}

generateMultiSizeIco().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
