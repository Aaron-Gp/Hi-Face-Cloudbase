const extCi = require("@cloudbase/extension-ci")
const tcb = require('tcb-admin-node')
const axios = require('axios')
const detectFace = require('./post').detectFace
const analyzeFace = require('./post').analyzeFace

tcb.init({
  env: 'cloudservices-636o8'
})
tcb.registerExtension(extCi)

const getImageUrl = async (fileID) => {
  const { fileList } = await tcb.getTempFileURL({
    fileList: [fileID]
  })
  return fileList[0].tempFileURL
}

const safeCheck = async(fileID, checkOpts, threshold) => {
  try {
    let cloudPath = fileID.substring(fileID.indexOf('/',8))
    let opts = {type: checkOpts}
    const res = await tcb.invokeExtension('CloudInfinite',{
      action:'DetectType',
      cloudPath: cloudPath, 
      operations: opts
    })
    let recog = res.data.RecognitionResult
    for (let info in recog){
      let score = recog[info].Score
      // console.log(info, flag, score)
      if(score > threshold){
        return true
      }
    }
    return false
  }
  catch(err) {
    console.log('err', err)
    return err
  }
}

const detectLabel = async(fileID) => {
  try {
    let cloudPath = fileID.substring(fileID.indexOf('/',8))
    const res = await tcb.invokeExtension('CloudInfinite',{
      action:'DetectLabel',
      cloudPath: cloudPath, 
    })
    const labels = res.data.RecognitionResult.Labels
    return labels
  }
  catch(err) {
    console.log('err', err)
    return err
  }
}

const getImageAve = async(fileID) => {
  try {
    const url = await getImageUrl(fileID)
    const res = await axios.get(url+'?imageAve')
    const mainColor = res.data.RGB.replace('0x','#')
    return mainColor
  }
  catch(err) {
    console.log('err', err)
    return err
  }

}

const getBuffer = async(fileID, width, height) => {
  try{
    let url = await getImageUrl(fileID)
    let rule = `imageMogr2/thumbnail/!${width}x${height}r|imageMogr2/scrop/${width}x${height}/`
    let cutImageUrl = url + '?' + rule
    // console.log(cutImageUrl)
    let {
      fileContent,
      base64File
    } = await axios.get(cutImageUrl, {
      responseType: 'arraybuffer'
    })
    .then(res => {
      let buffer = Buffer.from(res.data, 'binary')
      return {
        fileContent: buffer,
        base64File: buffer.toString('base64')
      }
    })
    let cloudPath = fileID.substring(fileID.lastIndexOf('/'))
    let pathHeader = 'face-cut'
    let faceID = await tcb.uploadFile({
      cloudPath: pathHeader + cloudPath,
      fileContent: fileContent
    })
    .then(res =>{
      // console.log(res)
      return res.fileID
    })
    return {
      cutImageUrl, base64File, faceID
    }
  }catch(err){
    console.log(err)
    return err
  }
}


exports.main = async (event) => {

  const {options} = event
  console.log('options', options)
  let result = new Object()
  if (options.indexOf('safeCheck')+1) {
    const {fileID, checkOpts, threshold} = event
    const hit = await safeCheck(fileID, checkOpts, threshold)
    // console.log(hit)
    result.hit = hit
    if (!hit) {

      const imageUrl = await getImageUrl(fileID)
      result.imageUrl = imageUrl
      if (options.indexOf('detectLabel')+1) {
        // const {fileID} = event
        const labels = await detectLabel(fileID)
        // console.log(labels)
        result.labels = labels
      }
      if (options.indexOf('mainColor')+1) {
        // const {fileID} = event
        const mainColor = await getImageAve(fileID)
        // console.log(mainColor)
        result.mainColor = mainColor
      }
      if (options.indexOf('detectFace')+1) {
        const {fileID, width=600, height=600} = event
        const {cutImageUrl, base64File, faceID} = await getBuffer(fileID, width, height)
        // console.log(cutImageUrl)
        result.cutImageUrl = cutImageUrl
        result.faceID = faceID
        // console.log(base64File)
        // console.log(faceID)
        const faceInfo = await detectFace(base64File)
        .then(res => {
          return res.data.FaceInfos
        })
        .catch(err => {
          result.err = err
        })
        // console.log(faceInfo)
        result.faceInfo = faceInfo
      }
      if (options.indexOf('analyzeFace')+1) {
        const {fileID, width=600, height=600} = event
        const {cutImageUrl, base64File, faceID} = await getBuffer(fileID, width, height)
        // console.log(cutImageUrl)
        result.cutImageUrl = cutImageUrl
        result.faceID = faceID
        // console.log(base64File)
        // console.log(faceID)
        const faceFeature = await analyzeFace(base64File)
        .then(res => {
          console.log(res)
          return res.data
        })
        .catch(err => {
          console.log(err)
          result.err = err
        })
        result.faceFeature = faceFeature
      }
    }
  }
  console.log(result)
  return result
}