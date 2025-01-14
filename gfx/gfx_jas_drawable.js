let fs = require('fs');
let { GfxDrawable } = require('./gfx_drawable');
let { BoundingBox } = require('../bounding/bounding_box');
let { Utils } = require('../helpers');
let { gfxManager } = require('./gfx_manager');
let { textureManager } = require('../texture/texture_manager');
let { eventManager } = require('../event/event_manager');

class Frame {
  constructor() {
    this.name = '';
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
  }
}

class Animation {
  constructor() {
    this.name = '';
    this.frames = [];
    this.frameDuration = 0;
  }
}

/**
 * Classe représentant un sprite animé.
 * @extends GfxDrawable
 */
class GfxJASDrawable extends GfxDrawable {
  /**
   * Créer un sprite animé.
   */
  constructor() {
    super();
    this.frames = [];    
    this.animations = [];
    this.offset = [0, 0];
    this.texture = textureManager.getTexture('');
    this.boundingBox = new BoundingBox();
    this.currentAnimationName = '';
    this.currentAnimationFrameIndex = 0;
    this.isLooped = false;
    this.frameProgress = 0;
  }

  /**
   * Fonction de mise à jour.
   * @param {number} ts - Temps passé depuis la dernière mise à jour.
   */
  update(ts) {
    let currentAnimation = this.animations.find(animation => animation.name == this.currentAnimationName);
    if (!currentAnimation) {
      return;
    }

    let currentFrame = this.frames.find(frame => frame.name == currentAnimation.frames[this.currentAnimationFrameIndex]);
    if (!currentFrame) {
      return;
    }

    this.clearVertices();
    this.clearNormals();
    this.clearTextureCoords();

    let minX = 0;
    let minY = 0;
    let maxX = currentFrame.width;
    let maxY = currentFrame.height;
    this.defineVertice(minX, maxY, 0);
    this.defineVertice(minX, minY, 0);
    this.defineVertice(maxX, minY, 0);
    this.defineVertice(maxX, minY, 0);
    this.defineVertice(maxX, maxY, 0);
    this.defineVertice(minX, maxY, 0);

    this.defineNormal(0, 0, 0);
    this.defineNormal(0, 0, 0);
    this.defineNormal(0, 0, 0);
    this.defineNormal(0, 0, 0);
    this.defineNormal(0, 0, 0);
    this.defineNormal(0, 0, 0);

    let ux = (currentFrame.x / this.texture.width);
    let uy = (currentFrame.y / this.texture.height);
    let vx = (currentFrame.x + currentFrame.width) / this.texture.width;
    let vy = (currentFrame.y + currentFrame.height) / this.texture.height;
    this.defineTextureCoord(ux, uy);
    this.defineTextureCoord(ux, vy);
    this.defineTextureCoord(vx, vy);
    this.defineTextureCoord(vx, vy);
    this.defineTextureCoord(vx, uy);
    this.defineTextureCoord(ux, uy);

    if (this.frameProgress >= currentAnimation.frameDuration) {
      if (this.currentAnimationFrameIndex == currentAnimation.frames.length - 1) {
        eventManager.emit(this, 'E_FINISHED');
        this.currentAnimationFrameIndex = this.isLooped ? 0 : currentAnimation.frames.length - 1;
        this.frameProgress = 0;
      }
      else {
        this.currentAnimationFrameIndex = this.currentAnimationFrameIndex + 1;
        this.frameProgress = 0;
      }
    }
    else {
      this.frameProgress += ts;
    }
  }

  /**
   * Fonction de dessin.
   * @param {number} viewIndex - Index de la vue en cours.
   */
  draw(viewIndex) {
    gfxManager.drawDebugBoundingBox(this.getModelMatrix(), this.boundingBox.min, this.boundingBox.max, [1.0, 1.0, 0.0]);
    gfxManager.drawMesh(this.getModelMatrix(), this.vertexCount, this.vertices, this.normals, this.textureCoords, this.texture);
  }

  /**
   * Retourne la matrice de modèle.
   * @return {array} Matrice de modèle.
   */
  getModelMatrix() {
    let matrix = super.getModelMatrix();
    matrix = Utils.MAT4_MULTIPLY(matrix, Utils.MAT4_TRANSLATE(-this.offset[0], -this.offset[1], 0));
    return matrix;
  }

  /**
   * Retourne le décallage du sprite par rapport à l'origine.
   * @return {array} Décallage du sprite (2 entrées).
   */
  getOffset() {
    return this.offset;
  }

  /**
   * Définit le décallage du sprite par rapport à l'origine.
   * @param {number} offsetX - Décallage en x.
   * @param {number} offsetY - Décallage en y.
   */
  setOffset(offsetX, offsetY) {
    this.offset = [offsetX, offsetY];
  }

  /**
   * Retourne la texture source.
   * @return {Texture} La texture source.
   */
  getTexture() {
    return this.texture;
  }

  /**
   * Définit la texture source.
   * @param {Texture} texture - La texture source.
   */
  setTexture(texture) {
    this.texture = texture;
  }

  /**
   * Retourne la boite englobante.
   * @return {BoundingBox} La boite englobante.
   */
  getBoundingBox() {
    return this.boundingBox;
  }

  /**
   * Retourne la boite englobante avec les transformations du modèle.
   * @return {BoundingBox} La boite englobante.
   */
  getWorldBoundingBox() {
    return this.boundingBox.transform(this.getModelMatrix());
  }

  /**
   * Charge un fichier "jas".
   */
  loadFromFile(path) {
    let json = JSON.parse(fs.readFileSync(path));
    if (!json.hasOwnProperty('Ident') || json['Ident'] != 'GfxJASDrawable') {
      throw new Error('GfxJASDrawable::loadFromFile(): File not valid !');
    }

    this.frames = [];
    for (let obj of json['Frames']) {
      let frame = new Frame();
      frame.name = obj['Name'];
      frame.x = obj['X'];
      frame.y = obj['Y'];
      frame.width = obj['Width'];
      frame.height = obj['Height'];
      this.frames.push(frame);
    }

    this.animations = [];
    for (let obj of json['Animations']) {
      let animation = new Animation();
      animation.name = obj['Name'];
      animation.frames = obj['Frames'];
      animation.frameDuration = parseInt(obj['FrameDuration']);
      this.animations.push(animation);
    }

    this.currentAnimationName = '';
    this.currentAnimationIndex = 0;
    this.frameProgress = 0;
  }

  /**
   * Lance une animation.
   * @param {string} animationName - Le nom de l'animation.
   * @param {boolean} isLooped - Si vrai, l'animation est en boucle.
   */
  play(animationName, isLooped) {
    let animation = this.animations.find(animation => animation.name == animationName);
    if (!animation) {
      throw new Error('GfxJASDrawable::play: animation not found.');
    }


    this.boundingBox = new BoundingBox([0, 0], [animation.frames[0].width, animation.frames[0].height]);
    this.currentAnimationName = animationName;
    this.currentAnimationFrameIndex = 0;
    this.isLooped = isLooped;
    this.frameProgress = 0;
  }
}

module.exports.GfxJASDrawable = GfxJASDrawable;