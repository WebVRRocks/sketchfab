const fs = require('fs');
const path = require('path');

const models = require('../index.json').models;

const dir = 'ltr';
const lang = 'en';
const mediaTitle = 'glTF Model for WebVR';
const vrDefaultDisplay = 'HTC Vive';
const vrAvailableDisplays = [
  'HTC Vive',
  'Oculus Rift',
  'Google Daydream',
  'Samsung Gear VR',
  'Google Cardboard'
];

Object.keys(models).forEach(slug => {
  let manifest = models[slug];
  manifest.dir = manifest.dir || dir;
  manifest.lang = manifest.lang || lang;
  manifest.name = (manifest.name || '(Untitled)').trim();
  manifest.short_name = (manifest.short_name || '').trim() || manifest.name;
  manifest.description = `${manifest.name} — ${mediaTitle}`;
  manifest.display = manifest.display || 'fullscreen';
  manifest.theme_color = manifest.theme_color || '#111';
  manifest.background_color = manifest.background_color || '#fff';
  manifest.startUrl = manifest.startUrl || '/${slug}?src=manifest';
  manifest.vr_default_display = manifest.vr_default_display || vrDefaultDisplay;
  manifest.vr_available_displays = manifest.vr_available_displays || vrAvailableDisplays;
  if (!manifest.author) {
    try {
      manifest.author = fs.readFileSync(path.join(__dirname, '..', 'models', slug, 'AUTHOR'), 'utf-8').trim();
    } catch (err) {
    }
  }
  if (!manifest.license) {
    try {
      manifest.license = fs.readFileSync(path.join(__dirname, '..', 'models', slug, 'LICENSE'), 'utf-8').trim();
    } catch (err) {
    }
  }

  const manifestBody = JSON.stringify(manifest, null, 2) + '\n';
  fs.writeFileSync(path.join(__dirname, '..', 'models', slug + '.webmanifest'), manifestBody, 'utf-8');

  const htmlBody = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge, chrome=1">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="canonical" href="https://sketchfab.webvr.rocks/${slug}">
    <link rel="manifest" href="/models/${slug}/manifest.webmanifest">

    <meta property="og:type" content="website">
    <meta property="og:title" content="${manifest.name} — ${mediaTitle}">
    <meta property="og:site_name" content="${manifest.name} — ${mediaTitle}">
    <meta property="og:description" content="${manifest.description}">
    <meta property="og:url" content="https://sketchfab.webvr.rocks/${slug}">
    <meta property="og:image" content="https://sketchfab.webvr.rocks/icon.png">

    <meta name="twitter:card" content="summary">

    <title>${manifest.name} • ${mediaTitle}</title>

    <script src="https://aframe.io/releases/0.7.1/aframe.min.js"></script>
    <script src="/viewer/assets/js/gamepadsplus.js"></script>
    <script src="/viewer/assets/js/main.js"></script>
  </head>
  <body>
    <a-scene>
      <a-assets>
        <!-- License: https://sketchfab.webvr.rocks/models/${slug}/LICENSE -->
        <!-- Author: https://sketchfab.webvr.rocks/models/${slug}/AUTHOR -->
        <a-asset-item id="scene-model" src="/models/${slug}/scene.gltf"></a-asset-item>
      </a-assets>

      <a-gltf-model src="#scene-model"></a-gltf-model>
    </a-scene>
  </body>
</html>
  `.trim() + '\n';
  fs.writeFileSync(path.join(__dirname, '..', 'models', slug + '.html'), htmlBody, 'utf-8');
});
