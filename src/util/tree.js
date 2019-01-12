'use strict'

const SmartBuffer = require('smart-buffer').SmartBuffer
const gitUtil = require('./util')

exports = module.exports

exports.serialize = (dagNode) => {
  let entries = []
  Object.keys(dagNode).forEach((name) => {
    entries.push([name, dagNode[name]])
  })
  entries.sort((a, b) => a[0] > b[0] ? 1 : -1)
  let buf = new SmartBuffer()
  entries.forEach((entry) => {
    buf.writeStringNT(entry[1].mode + ' ' + entry[0])
    buf.writeBuffer(gitUtil.cidToSha(entry[1].hash['/']))
  })

  let outBuf = new SmartBuffer()
  outBuf.writeString('tree ')
  outBuf.writeString(buf.length.toString())
  outBuf.writeUInt8(0)
  outBuf.writeBuffer(buf.toBuffer())
  return outBuf.toBuffer()
}

exports.deserialize = async (data) => {
  let res = {}
  let buf = SmartBuffer.fromBuffer(data, 'utf8')

  for (; ;) {
    let modeName = buf.readStringNT()
    if (modeName === '') {
      break
    }

    let hash = buf.readBuffer(gitUtil.SHA1_LENGTH)
    let modNameMatched = modeName.match(/^(\d+) (.+)$/)
    if (!modNameMatched) {
      throw new Error('invalid file mode/name')
    }

    if (res[modNameMatched[2]]) {
      throw new Error('duplicate file in tree')
    }

    res[modNameMatched[2]] = {
      mode: modNameMatched[1],
      hash: { '/': gitUtil.shaToCid(hash) }
    }
  }
  return res
}
