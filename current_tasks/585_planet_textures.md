# Task 585: Add Real Planet Textures to 3D Viewer

## Status: **DONE**

## Description

Human directive phase 33: "惑星のテクスチャは本物を使うとよい"

Replace solid-color spheres with textured planet spheres using NASA/public-domain
texture maps. Use a CDN for texture images to avoid bloating the repository.

## Plan
1. Source textures: Solar System Scope (solarsystemscope.com) provides free-to-use
   planet texture maps, or use NASA Visible Earth textures
2. Use THREE.TextureLoader to apply textures to planet spheres
3. Fall back to solid color if texture fails to load
4. Add earth, mars, jupiter, saturn (with ring texture), uranus textures

## Files
- `ts/src/orbital-3d-viewer.js` — add texture loading to planet creation
