'use strict';

import Geometry from './geometry';
import Immutable from 'immutable';
import { translatePoint, DOM } from '../util';

/**
 * Square geometry class
 *
 * @param {Object} map - Instance of MapboxGL Map
 * @returns {Square} this
 * @private
 */
export default class Square extends Geometry {

  constructor(map) {
    var data = { geometry: {} };
    data.geometry.coordinates = Immutable.fromJS([[[0, 0],[0, 0], [0, 0], [0, 0], [0, 0]]]);
    super(map, 'Polygon', data);

    this.type = 'square';

    // event handlers
    this.onMouseDown = this._onMouseDown.bind(this);
    this.onMouseMove = this._onMouseMove.bind(this);
    this.completeDraw = this._completeDraw.bind(this);
  }

  startDraw() {
    this._map.fire('draw.start', { featureType: 'square' });
    this._map.getContainer().classList.add('mapboxgl-draw-activated');
    this._map.getContainer().addEventListener('mousedown', this.onMouseDown, true);
  }

  _onMouseDown(e) {
    this._map.getContainer().removeEventListener('mousedown', this.onMouseDown, true);
    this._map.getContainer().addEventListener('mousemove', this.onMouseMove, true);

    var pos = DOM.mousePos(e, this._map.getContainer());
    var c = this._map.unproject([pos.x, pos.y]);
    var i = -1;
    while (++i < 5) {
      this.coordinates = this.coordinates.setIn([0, i], [ c.lng, c.lat ]);
    }
  }

  _onMouseMove(e) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.started) {
      this.started = true;
      this._map.getContainer().addEventListener('mouseup', this.completeDraw, true);
    }

    var pos = DOM.mousePos(e, this._map._container);
    var c = this._map.unproject([pos.x, pos.y]);
    var orig = this.coordinates.getIn([0, 0]);
    this.coordinates = this.coordinates.setIn([0, 1], [ orig[0], c.lat ]);
    this.coordinates = this.coordinates.setIn([0, 2], [ c.lng, c.lat ]);
    this.coordinates = this.coordinates.setIn([0, 3], [ c.lng, orig[1] ]);

    this._map.fire('new.edit');
  }

  _completeDraw() {
    this._map.getContainer().classList.remove('mapboxgl-draw-activated');
    this._map.getContainer().removeEventListener('mousemove', this.onMouseMove, true);
    this._map.getContainer().removeEventListener('mouseup', this.completeDraw, true);

    this._done('square');
  }

  moveVertex(init, curr, idx) {
    if (!this.movingVertex) {
      this.movingVertex = true;
      this.initCoords = this.coordinates.getIn([0, idx]);
    }

    var dx = curr.x - init.x;
    var dy = curr.y - init.y;
    var newPoint = translatePoint(JSON.parse(JSON.stringify(this.initCoords)), dx, dy, this._map);

    this.coordinates = this.coordinates.setIn([0, idx], newPoint);

    var x = newPoint[0];
    var y = newPoint[1];

    switch (idx) {
      case 0:
        this.coordinates = this._setV(1, [ x, this._getV(1)[1] ]);
        this.coordinates = this._setV(3, [ this._getV(3)[0], y ]);
        break;
      case 1:
        this.coordinates = this._setV(0, [ x, this._getV(0)[1] ]);
        this.coordinates = this._setV(2, [ this._getV(2)[0], y ]);
        break;
      case 2:
        this.coordinates = this._setV(1, [ this._getV(1)[0], y ]);
        this.coordinates = this._setV(3, [ x, this._getV(3)[1] ]);
        break;
      case 3:
        this.coordinates = this._setV(0, [ this._getV(0)[0], y ]);
        this.coordinates = this._setV(2, [ x, this._getV(2)[1] ]);
        break;
    }

    // always reset last point to equal the first point
    this.coordinates = this._setV(4, this._getV(0));

    this._map.fire('new.edit');
  }

  /**
   * Given and index and a val, set that vertex in `this.feature`
   *
   * @param {Number} idx - index
   * @param {Array<Number>} val - new coordinates
   * @return {Object} an Immutable Map of a GeoJSON feature
   * @private
   */
  _setV(idx, val) {
    return this.coordinates.setIn([0, idx], val);
  }

  /**
   * Given an index, returns the vertex in the features list of coordinates
   *
   * @param {Number} idx - index of the vertex you want
   * @return {Array<Number>} Immutable List
   * @private
   */
  _getV(idx) {
    return this.coordinates.getIn([0, idx]);
  }

}