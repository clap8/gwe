let fs = require('fs');
let { GfxDrawable } = require('./gfx_drawable');
let { BoundingBox } = require('../bounding/bounding_box');
let { gfxManager } = require('./gfx_manager');
let { textureManager } = require('../texture/texture_manager');

class JSM {
  constructor() {
    this.vertices = [];
    this.normals = [];
    this.textureCoords = [];
  }
}

class GfxJSMDrawable extends GfxDrawable {
  constructor() {
    super();
    this.jsm = new JSM();
    this.texture = textureManager.getTexture('');
    this.boundingBox = new BoundingBox();
  }

  update(ts) {
    this.clearVertices();
    this.clearNormals();
    this.clearTextureCoords();

    for (let i = 0; i < this.jsm.vertices.length; i += 3) {
      let vx = this.jsm.vertices[i + 0];
      let vy = this.jsm.vertices[i + 1];
      let vz = this.jsm.vertices[i + 2];
      this.defineVertice(vx, vy, vz);

      let nx = this.jsm.normals[i + 0];
      let ny = this.jsm.normals[i + 1];
      let nz = this.jsm.normals[i + 2];
      this.defineNormal(nx, ny, nz);      
    }

    for (let i = 0; i < this.jsm.textureCoords.length; i += 2) {
      let tx = this.jsm.textureCoords[i + 0];
      let ty = this.jsm.textureCoords[i + 1];
      this.defineTextureCoord(tx, ty);
    }
  }

  draw() {
    gfxManager.drawDebugBoundingBox(this.getModelMatrix(), this.boundingBox.min, this.boundingBox.max, [1.0, 1.0, 0.0]);
    gfxManager.drawMesh(this.getModelMatrix(), this.vertexCount, this.vertices, this.normals, this.textureCoords, this.texture);
  }

  getTexture() {
    return this.texture;
  }

  setTexture(texture) {
    this.texture = texture;
  }

  getBoundingBox() {
    return this.boundingBox;
  }

  getWorldBoundingBox() {
    return this.boundingBox.transform(this.getModelMatrix());
  }

  loadFromFile(path) {
    let json = JSON.parse(fs.readFileSync(path));
    if (!json.hasOwnProperty('Ident') || json['Ident'] != 'GfxJSMDrawable') {
      throw new Error('GfxJSMDrawable::loadFromFile(): File not valid !');
    }

    this.jsm.vertices = json['Vertices'];
    this.jsm.normals = json['Normals'];
    this.jsm.textureCoords = json['TextureCoords'];
    this.boundingBox = BoundingBox.createFromVertices(this.vertices);
  }
}

module.exports.GfxJSMDrawable = GfxJSMDrawable;