const db = wx.cloud.database()
const _ = db.command

Page({
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

  chooseImg: function () {
    if (this.data.fileID) {
      this.deleteFile()
    }
    const that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera']
    })
    .then(res => {
      // console.log(res)
      // console.log(res.tempFilePaths)
      const filePath = res.tempFilePaths[0]
      const cloudPath = `face-cut/${Date.now()}-${Math.floor(Math.random(0, 1) * 1000)}` + filePath.match(/\.[^.]+?$/)[0]
      wx.cloud.uploadFile({
        cloudPath,
        filePath,
      })
      .then(res => {
        wx.showToast({
          icon: 'success',
          title: '上传成功',
        })
        // console.log('上传成功后获得的res：', res)
        that.setData({
          mark: false,
          fileID: res.fileID,
        })
        console.log(this.data.fileID)
        that.detectImg(cloudPath)
      })
      .catch(err => {
          wx.showToast({
            title: '上传失败,请重新上传',
            icon: 'none',
        })
        console.log(err)
      })
    })
    .catch(err => {
      wx.showToast({
        title: '未选取图片',
        icon: "none"
      })
      console.log(err)
      this.reportErr(err)
    })
  },

  detectImg(cloudPath) {
    console.log('detectImg...')
    wx.showToast({
      title: '图像检测中',
      icon: 'loading',
      duration: 1000000
    })
    console.log('loading...')
    wx.cloud.callFunction({
      name: 'detectImg',
      data: {
        cloudPath: cloudPath
      }
    })
    .then(res => {
      // console.log(res)
      const recog = res.result.data.RecognitionResult
      console.log(recog)
      for (const info in recog){
        let flag = recog[info].HitFlag
        let score = recog[info].Score
        // console.log(info,' :  ',flag,'  ',score)
        if(flag == 1 || score >= 75){
          this.setData({
            mark: true
          })
        }
        console.log(this.data.originalImg)
      }
      if(this.data.mark == false)
      {
        // console.log('安全')
        this.detectLabel(cloudPath)
      }else{
        wx.showToast({
          title: '图片中含有敏感信息',
          icon: "none",
          duration: 2000
        })
        this.setData({
          originalImg: "../../images/warning.png"
        })
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

  detectLabel(cloudPath){
    console.log("detect label...")
    wx.cloud.callFunction({
      name: "label",
      data: {
        cloudPath: cloudPath
      }
    })
    .then(res => {
      console.log(res)
      const labels = res.result.data.RecognitionResult.Labels
      console.log(labels)
      this.setData({
        labels,
        originalImg: `https://636c-cloudservices-636o8-1301351686.tcb.qcloud.la/${cloudPath}`
      })
      console.log(this.data.labels)
      wx.hideToast()
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

  deleteFile(){
    const fileID = this.data.fileID
    console.log(fileID)
    wx.cloud.deleteFile({
      fileList: [fileID]
    })
    .then(res => {
      console.log('文件删除成功',res.fileList)
    })
    .catch(err => {
      console.error(err)
      this.reportErr(err)
    })
  },

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
    // openid: '',
    mark: false,
    originalImg:'/images/original.png',
    uploadImg: '/images/upload.png',
    labels: [],
    userData: [],
    fileID: '',
  },

  onShow(){
    wx.hideHomeButton()
  },

  onLoad(){
    // this.checkUser()
  },

  onHide(){
    if (this.data.fileID) {
      this.deleteFile()
    }
  }
})