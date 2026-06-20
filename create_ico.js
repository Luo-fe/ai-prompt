const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function generateMultiSizeIco() {
  const inputPath = 'g:\\ai\\ai-prompt-tool\\萌点图.png';
  const outputIco = path.join(__dirname, 'icon.ico');
  const outputPng = path.join(__dirname, 'icon.png');

  const inputBuffer = fs.readFileSync(inputPath);

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const resized = await sharp(inputBuffer).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();
    pngBuffers.push(resized);
    console.log(`  Generated ${size}x${size}`);
  }

  const icoBuffer = await toIco(pngBuffers);
  fs.writeFileSync(outputIco, icoBuffer);
  console.log(`\nICO created: ${outputIco} (${icoBuffer.length} bytes)`);

  const resized256 = await sharp(inputBuffer).resize(256, 256, { kernel: 'lanczos3' }).png().toBuffer();
  fs.writeFileSync(outputPng, resized256);
  console.log(`PNG created: ${outputPng} (${resized256.length} bytes)`);

  const verify = fs.readFileSync(outputIco);
  const type = verify.readUInt16LE(2);
  const count = verify.readUInt16LE(4);
  console.log(`\nVerification: Type=${type} (1=ICO), Images=${count}`);
}

generateMultiSizeIco().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
