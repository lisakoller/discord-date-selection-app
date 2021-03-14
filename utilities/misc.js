module.exports = {
  /**
   * get a random integer
   * @param {number} min lowest number that can be returned
   * @param {number} max highest number that can be returned
   * @returns random integer between min and max
   */
  getRandomInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
  },
}
