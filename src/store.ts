import { reactive } from 'vue'
export const store = reactive({
  x: 0.5,
  y: 0.125,
  /**
   * setCoords
   * @param x [0,1]
   * @param y [0,1]
   */
  setCoords(x: number, y: number) {
    this.x = x
    this.y = y
  }
})
