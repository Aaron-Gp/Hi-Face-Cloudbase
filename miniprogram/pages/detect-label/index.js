import config from '../../config'

const db = wx.cloud.database()
const _ = db.command

Page({
  //获取用户数据，用于报错
  async checkUser(){
    const userData = await db.collection('error_report').get()
    console.log("当前用户的数据对象",userData)
    if(userData.data.length === 0){
      return await db.collection('error_report').add({
        data:{
          "error_messages": []
        }
      })
    }else{
      this.setData({
        userData
      })
    }
  },

  //选择图像并上传
  chooseImg: function () {
    if (this.data.fileID) {
      this.deleteFile()
      console.log('delete cloudImage')
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
        that.setData({
          mark: false,
          fileID: res.fileID,
        })
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

  //图像操作
  detectImg(fileID) {
    console.log('Processing...')
    wx.showToast({
      title: '图像检测中',
      icon: 'loading',
      duration: 1000000
    })
    wx.cloud.callFunction({
      name: 'detect-image',
      data: {
        options: ["safeCheck", "detectLabel"],
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
          originalImg: "../../images/warning.png",
          labels: [],
          minHeight: this.data.lockHeight
        })
      }
      else {
        const labels = res.result.labels
        const originalImg = res.result.imageUrl
        console.log(labels)
        this.setMargin(originalImg)
        this.setData({
          labels,
          originalImg
        })
        wx.hideToast()
      }
    })
    .catch(err => {
      console.log(err)
      this.reportErr(err)
      wx.showToast({
        title: '云函数调用失败，问题已上报',
        icon: 'none'
      })
    })
  },

  //设置minHeight
  setMargin(filePath){
    //获取图像高
    wx.getImageInfo({
      src: filePath,
    })
    .then(res => {
      console.log('imageHeight', res.height)

      //计算图像转换为宽300后的高度
      var minHeight = (230 + res.height * (300 / res.width)) * 2
      // console.log('lockHeight', this.data.lockHeight)
      // console.log('before-minHeight', minHeight)
      var orgheight = this.data.lockHeight.replace(/rpx/, '')

      //是否需要适配长图
      if (minHeight > orgheight) {
        this.setData({
          minHeight: minHeight + 'rpx'
        })
      }
      else {
        this.setData({
          minHeight: this.data.lockHeight
        })
      }
      console.log('min-lock-change?', this.data.minHeight, this.data.lockHeight)

    })
    .catch(err =>{
      console.log(err)
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
      this.reportErr(err)
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

  data: {
    copyright: "Copyright © 2020 Aaron Gao, All rights reserved.",
    desc: "上传图片，会自动显示图片的主要特征标签",
    originalImg:'/images/original@2x.png', //中央图像
    uploadImg: '/images/upload@2x.png', //上传图标
    labels: [],
    userData: [], //用于上报错误
    fileID: '', //用于删除图像
    minHeight: '1104rpx', //默认为iPhone X 样式
    height: '', //默认为正常样式
    bottom: '', //默认为iPhone X样式
    lockHeight: '1104rpx' //默认为iPhone X 样式
  },

  //机型适配
  modelAdaptation(){
    wx.getSystemInfo()
    .then(res => {
      //是否为iPhone X
      if (res.model === 'iPhone X') {
        //底部适配
        this.setData({
          height: '188rpx',
        })
        console.log('iphone X adapt!')
      }
      else {
        //计算该机型所需要的minHeight大小
        const minHeight = (res.windowHeight -138) * 2
        this.setData({
          minHeight: minHeight + 'rpx',
          bottom: '140rpx',
          lockHeight: minHeight + 'rpx',
        })
        console.log('windowHeight', res.windowHeight * 2)
        console.log("lockHeight", minHeight)
      }
      // console.log(res)
    })
    .catch(err => {
      console.log(err)
    })
  },

  onShow(){
    wx.hideHomeButton()
  },

  onLoad(){
    this.checkUser()
    this.modelAdaptation()
  },

  onHide(){
    console.log('Hide')
    if (this.data.fileID) {
      this.deleteFile()
    }
  }
})