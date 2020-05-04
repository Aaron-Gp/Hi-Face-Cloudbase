import { GENDER_STATUS, EXPRESS_MOOD, HAVE_STATUS} from './config'

Page({

  //选择图像并上传
  chooseImg: function () {
    if (this.data.fileID) {
      // this.deleteFile()
      // console.log('delete cloudImage')
    }
    const that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera']
    })
    .then(res => {
      // console.log('choose-res', res)
      const filePath = res.tempFilePaths[0]
      const cloudPath = `face-cut/${Date.now()}-${Math.floor(Math.random(0, 1) * 1000)}` + filePath.match(/\.[^.]+?$/)[0]
      
      //上传图像
      wx.cloud.uploadFile({
        cloudPath,
        filePath,
      })
      .then(res => {
        wx.showToast({
          icon: 'success',
          title: '上传成功',
        })
        // console.log('upload-res', res)
        // console.log('fileID', this.data.fileID)
        that.detectImg(res.fileID)
      })
      .catch(err => {
        wx.showToast({
          title: '上传失败,请重新上传',
          icon: 'none',
        })
        console.log('upload-err', err)
      })
    })
    .catch(err => {
      wx.showToast({
        title: '未选取图片',
        icon: "none"
      })
      console.log('choose-err', err)
    })
  },

  //机型适配
  modelAdaptation(){
    wx.getSystemInfo()
    .then(res => {
      //获取状态栏高度
      const barHeight = res.statusBarHeight * 2
      console.log('barHeight', barHeight)
      this.setData({
        barHeight: barHeight + 'rpx',
      })

      //是否为iPhone X
      if (res.model === 'iPhone X') {
        //底部适配
        this.setData({
          height: '188rpx',
          bottom: '198rpx'
        })
        console.log('iphone X adapt!')
      }
      // console.log('systemInfo', res)
    })
    .catch(err => {
      console.log(err)
    })
  },

  //图像操作
  detectImg(fileID) {
    console.log(fileID)
    console.log('Processing...')
    wx.showToast({
      title: '图像检测中',
      icon: 'loading',
      duration: 1000000
    })
    wx.cloud.callFunction({
      name: 'detect-image',
      data: {
        options: ["safeCheck","mainColor","detectFace"],
        fileID: fileID,
        checkOpts: ["porn", "terrorist", "politics"],
        threshold: 75
      }
    })
    .then(res => {
      console.log(res)
      const hit = res.result.hit
      if(hit){
        this.deleteFile()
        wx.showToast({
          title: '图片中含有敏感信息',
          icon: "none",
          duration: 2000
        })
        this.setData({
          centerIcon: "../../images/warning.png",
          faceImage: '',
          pageMainColor: '',
          isActive: false,
          showCutList: [],
          infoList: [],
          desc: '请勿上传含有黄色、政治、暴力等因素的图片'
        })
      }
      else {
        const faceInfo = res.result.faceInfo
        const faceImage = res.result.cutImageUrl
        const fileID = res.result.faceID
        const pageMainColor = res.result.mainColor
        let infoList = []
        let showCutList = []
        if (faceInfo.length > 0) {
          infoList = faceInfo.map((item, shapeIndex) => {
            const { X, Y, Height, Width, FaceAttributesInfo = {} } = item
            const { Gender, Age, Expression, Beauty, Glass, Hat, Mask } = FaceAttributesInfo

            return {
              shapeIndex,
              left: X,
              top: Y,
              width: Width,
              height: Height,
              age: Age,
              genderStr: GENDER_STATUS[Gender],
              expressionStr: EXPRESS_MOOD[parseInt(Expression / 10, 10)],
              beauty: Beauty,
              glassStr: HAVE_STATUS[Number(Glass)],
              hatStr: HAVE_STATUS[Number(Hat)],
              maskStr: HAVE_STATUS[Number(Mask)],
            }
          })
  
          showCutList = faceInfo.map((item, shapeIndex) => {
            const { X, Y, Height, Width } = item
  
            let rule = '|imageMogr2/cut/' + Width + 'x' + Height + 'x' + X + 'x' + Y
  
            return {
              shapeIndex,
              cutFileUrl: faceImage + rule,
              x: X,
              y: Y,
              width: Width,
              height: Height,
            }
          })
        }
        this.setData({
          isActive: true,
          faceImage,
          pageMainColor,
          currentInfoIndex: 0,
          showCutList,
          infoList,
          faceInfo,
          fileID,
          desc: '点击红色人脸框，可隐藏人脸魅力值'
        })
        wx.hideToast()
      }
    })
    .catch(err => {
      console.log(err)
      // this.reportErr(err)
      wx.showToast({
        title: '未检测到人脸',
        icon: 'none'
      })
      this.setData({
        showCutList: [],
        infoList: [],
        faceImage:'',
        pageMainColor:'',
        isActive: false,
        fileID: '',
        desc: '上传带人脸的正面照',
        centerIcon: '../../images/image_photo@2x.png',
      })
    })
  },

  //删除云存储中的图像
  deleteFile(){
    const fileID = this.data.fileID
    // console.log('fileID', fileID)
    wx.cloud.deleteFile({
      fileList: [fileID]
    })
    .then(res => {
      this.setData({
        fileID: ''
      })
      console.log('文件删除成功',res.fileList)
    })
    .catch(err => {
      console.error(err)
      // this.reportErr(err)
    })
  },

  //上传调用错误
  reportErr(err){
    const _id= this.data.userData.data[0]._id
    db.collection('error_report').doc(_id).update({
      data: {
        "error_messages": _.push({
          err
        })
      }
    })
  },

  chooseShape(e){
    // console.log(e)
    const shapeIndex = e.currentTarget.dataset.index
    const desc1 = '点击红色人脸框，可隐藏人脸魅力值'
    const desc2 = '点击人脸框，可以显示人脸魅力值'
    this.setData({
      currentShapeIndex: this.data.currentShapeIndex===shapeIndex?-1:shapeIndex,
      desc: this.data.currentShapeIndex===shapeIndex?desc2:desc1
    })
  },

  data: {
    barHeight: '',
    isActive: false,
    centerIcon: '../../images/image_photo@2x.png',
    desc:'上传带人脸的正面照',
    uploadImg: '../../images/upload@2x.png',
    copyright: "Copyright © 2020 Aaron Gao, All rights reserved.",
    height: '120rpx', //默认为正常样式
    bottom: '130rpx', //默认为正常样式,
    faceImage: '',
    pageMainColor: '',
    fileID: '',
    infoList: [],
    showCutList: [],
    currentShapeIndex: 0
  },

  onLoad(){
    this.modelAdaptation()
  }
})
