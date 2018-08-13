var intersection = function (baseArr, arr) {
  if (!isArray(baseArr) || !isArray(arr)) {
    return []
  }
  var r = []
  arr.forEach(v => {
    if (baseArr.includes(v)) {
      r.push(v)
    }
  })
  return r
}

var difference = function (baseArr, arr) {
  if (!isArray(baseArr) || !isArray(arr)) {
    return []
  }
  var r = []
  arr.forEach(v => {
    if (!baseArr.includes(v)) {
      r.push(v)
    }
  })
  return r
}

var isArray = function (arr) {
  return Object.prototype.toString.call(arr) === '[object Array]'
}

module.exports = {
  intersection,
  difference
}
