import { getMouthInfo, getMaskShapeList } from './face-utils'

const { windowWidth, pixelRatio } = wx.getSystemInfoSync()
console.log(windowWidth)
const CANVAS_SIZE = 300
const PageDpr = windowWidth / 375

const DPR_CANVAS_SIZE = CANVAS_SIZE * PageDpr
const SAVE_IMAGE_WIDTH = DPR_CANVAS_SIZE * pixelRatio
const DEFAULT_MASK_SIZE = 100 * PageDpr
const MASK_SIZE = 100
 
const resetState = () => {
  return {
    maskWidth: DEFAULT_MASK_SIZE,
    currentMaskId: 1,
    timeNow: Date.now(),

    maskCenterX: DPR_CANVAS_SIZE / 2,
    maskCenterY: DPR_CANVAS_SIZE / 2,
    resizeCenterX: DPR_CANVAS_SIZE / 2 + DEFAULT_MASK_SIZE / 2 - 2,
    resizeCenterY: DPR_CANVAS_SIZE / 2 + DEFAULT_MASK_SIZE / 2 - 2,
    rotate: 0,
    reserve: 1
  }
}

const setTmpThis = (el, elState) => {
  const {
    maskWidth,
    maskCenterX,
    maskCenterY,
    resizeCenterX,
    resizeCenterY,
    rotate
  } = elState

  el.mask_width = maskWidth
  el.mask_center_x = maskCenterX;
  el.mask_center_y = maskCenterY;
  el.resize_center_x = resizeCenterX;
  el.resize_center_y = resizeCenterY;

  el.rotate = rotate;

  el.touch_target = '';
  el.touch_shape_index = -1;

}

const materialList = [
  {
    name: 'mask',
    imgList: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    type: 'multi'
  }
]

Page({

  data: {
    DPR_CANVAS_SIZE,
    pixelRatio: wx.getSystemInfoSync().pixelRatio,
    shapeList: [
      resetState()
    ],
    currentShapeIndex: 0,
    originImage: '',
    cutImage: '',
    posterSrc: '',
    isShowPoster: false,
    currentTabIndex: 0,
    isShowMask: false,
    materialList,
    copyright: "Copyright © 2020 Aaron Gao, All rights reserved."
  },
  
  onLoad: function (options) {
    this.cropper = this.selectComponent('#image-cropper');
  },

  chooseImage: function (e) {
    // console.log(e)
    let way = e.target.dataset.way || 'album'
    console.log('way', way)
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: [way]
    })
    .then(res => {
      this.setData({
        originImage: res.tempFilePaths[0]
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

  cropperLoad() {},

  cropperImageLoad() {
    this.cropper.imgReset()
  },
  cropperTapCut(event) {
    let imageInfo = event.detail
    let cutImage = imageInfo.url
    this.setData({
      cutImage: cutImage,
      originImage: ''
    })

    this.uploadFiles(cutImage)
  },

  cutSubmit() {
    this.cropper.getImg((detail) => {
      this.cropperTapCut({
        detail: detail
      })
    });
  },

  cutCancel() {
    this.setData({
      originImage: ''
    })
  },

  getUserInfo(e) {
    if (e.detail.userInfo) {
      wx.showToast({
        icon: 'none',
        title: '获取头像...'
      })
      console.log(e)
      wx.getImageInfo({
        src: e.detail.userInfo.avatarUrl
      })
      .then(res => {
        console.log('imageInfo', res)
        if (res.path) {
          this.cropperTapCut({
            detail: {
              url: res.path
            }
          })
        }
      })
      .catch (error => {
        console.log('avatarUrl download error:', error);
        wx.showToast({
          icon: 'none',
          title: '获取失败，请使用相册'
        })
      })
    }
  },

  uploadFiles(cutImage){
    console.log('cutImage :', cutImage);
    wx.showLoading({
      title: '识别中...'
    })
    this.setData({
      isShowMask: false,
    })
    const filePath = cutImage
    const cloudPath = `face-cut/${Date.now()}-${Math.floor(Math.random(0, 1) * 1000)}` + filePath.match(/\.[^.]+?$/)[0]
    //上传图像
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
    })
    .then(res => {
      console.log('upload-res', res)
      // console.log('fileID', this.data.fileID)
      this.analyzeFace(res.fileID)
    })
    .catch(err => {
      wx.showToast({
        title: '上传失败,请重新上传',
        icon: 'none',
      })
      console.log('upload-err', err)
    })
  },

  analyzeFace  (fileID) {
    wx.cloud.callFunction({
      name: 'detect-image',
      data: {
        options: ["safeCheck","analyzeFace"],
        fileID: fileID,
        checkOpts: ["porn", "terrorist", "politics"],
        threshold: 75
      }
    })
    .then(res => {
      console.log(res)
      const hit = res.result.hit
      if(hit){
        // this.deleteFile()
        wx.showToast({
          title: '图片中含有敏感信息',
          image: "../../images/warning.png",
          duration: 2000
        })
        this.setData({
          cutImage: '',
        })
        return
      }
      else {
        const mouthList = getMouthInfo(res.result.faceFeature)
        console.log(mouthList)
        const shapeList = getMaskShapeList(mouthList, DPR_CANVAS_SIZE, MASK_SIZE)
        console.log(shapeList)
        setTmpThis(this, shapeList[0])

        this.setData({
          currentShapeIndex: 0,
          shapeList,
          isShowMask: true,
        })
        wx.hideLoading()
      }
    })
    .catch(err => {
      wx.showToast({
        title: '未检测到人脸',
        icon: 'none'
      })
      console.log('callfunc error', err)
      // 获取失败，走默认渲染
      let shapeList = [
        resetState()
      ]

      this.setData({
        shapeList,
        isShowMask: true,
      })
      setTmpThis(this, shapeList[0])
    })
  },
 
  removeImage() {
    this.cutImageCanvas = ''
    this.setData({
      shapeList: [
        resetState()
      ],
      cutImage: ''
    })
  },
  async generateImage() {
    wx.showLoading({
      title: '图片生成中'
    })

    this.setData({
      posterSrc: '',
    })

    try {
      await this.drawCanvas()
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '图片生成失败，请重试'
      })
      console.log('error :', error)
    }
  },
  async drawCanvas() {
    const {
      shapeList,
      cutImage
    } = this.data
    console.log('creatcanvas')
    const pc = wx.createCanvasContext('canvasMask')
    console.log('clearrect')
    pc.clearRect(0, 0, SAVE_IMAGE_WIDTH, SAVE_IMAGE_WIDTH);
    let tmpCutImage
    if(this.cutImageCanvas){
      tmpCutImage = this.cutImageCanvas
    }
    else{
      await wx.getImageInfo({
        src: cutImage,
      })
      .then(res => {
        console.log(res)
        tmpCutImage = res.path
      })
    }
    console.log(tmpCutImage)
    pc.drawImage(tmpCutImage, 0, 0, SAVE_IMAGE_WIDTH, SAVE_IMAGE_WIDTH)
    console.log('drawimage')
    // 形状
    shapeList.forEach(shape => {
      pc.save()
      const {
        maskWidth,
        rotate,
        maskCenterX,
        maskCenterY,
        currentMaskId,
        reserve,
      } = shape
      const maskSize = maskWidth * pixelRatio

      pc.translate(maskCenterX * pixelRatio, maskCenterY * pixelRatio);
      pc.rotate((rotate * Math.PI) / 180)

      pc.drawImage(
        `../../images/mask-${currentMaskId}${reserve < 0 ? '-reverse' : ''}.png`,
        -maskSize / 2,
        -maskSize / 2,
        maskSize,
        maskSize
      )
      pc.restore()
    })

    pc.draw(true, () => {
      wx.canvasToTempFilePath({
        canvasId: 'canvasMask',
        x: 0,
        y: 0,
        height: DPR_CANVAS_SIZE * 3,
        width: DPR_CANVAS_SIZE * 3,
        fileType: 'jpg',
        quality: 0.9,
        success: res => {
          wx.hideLoading()
          this.setData({
            posterSrc: res.tempFilePath,
            isShowPoster: true
          })
        },
        fail: () => {
          wx.hideLoading()
          wx.showToast({
            title: '图片生成失败，请重试'
          })
        }
      })
    })

  },

  chooseMask(event) {
    console.log(this.data.isShowMask)
    let maskId = event.target.dataset.maskId || 1
    console.log('maskId,  :', maskId);

    let { shapeList, currentShapeIndex } = this.data

    if (shapeList.length > 0 && currentShapeIndex >= 0) {
      console.log('shapelist...')
      shapeList[currentShapeIndex] = {
        ...shapeList[currentShapeIndex],
        currentMaskId: maskId
      }
    } else {
      console.log('resetState')
      currentShapeIndex = shapeList.length
      shapeList.push({
        ...resetState(),
        currentMaskId: maskId
      })
    }
    this.setData({
      shapeList,
      currentShapeIndex
    })
  },


  removeShape(e) {
    const { shapeIndex = 0 } = e.target.dataset
    const { shapeList } = this.data
    shapeList.splice(shapeIndex, 1);
    this.setData({
      shapeList,
      currentShapeIndex: -1
    })
  },

  reverseShape(e) {
    const { shapeIndex = 0 } = e.target.dataset
    const { shapeList } = this.data
    shapeList[shapeIndex] = {
      ...shapeList[shapeIndex],
      reserve: 0 - shapeList[shapeIndex].reserve
    }

    this.setData({
      shapeList
    })
  },

  resizeShape(e){

  },
  checkedShape(e) {
    this.setData({
      currentShapeIndex: -1
    })
  },

  touchStart(e) {
    const { type = '', shapeIndex = 0 } = e.target.dataset

    this.touch_target = type;
    this.touch_shape_index = shapeIndex;
    if (this.touch_target == 'mask' && shapeIndex !== this.data.currentShapeIndex) {
      this.setData({
        currentShapeIndex: shapeIndex
      })
    }

    if (this.touch_target != '') {
      this.start_x = e.touches[0].clientX;
      this.start_y = e.touches[0].clientY;
    }
  },
  touchEnd(e) {
    if (this.touch_target !== '' || this.touch_target !== 'cancel') {
      if (this.data.shapeList[this.touch_shape_index]) {
        setTmpThis(this, this.data.shapeList[this.touch_shape_index])
      }
    }
  },
  touchMove(e) {
    let { shapeList } = this.data
    const {
      maskCenterX,
      maskCenterY,
      resizeCenterX,
      resizeCenterY,
    } = shapeList[this.touch_shape_index]

    var current_x = e.touches[0].clientX;
    var current_y = e.touches[0].clientY;
    var moved_x = current_x - this.start_x;
    var moved_y = current_y - this.start_y;
    if (this.touch_target == 'mask') {
      shapeList[this.touch_shape_index] = {
        ...shapeList[this.touch_shape_index],
        maskCenterX: maskCenterX + moved_x,
        maskCenterY: maskCenterY + moved_y,
        resizeCenterX: resizeCenterX + moved_x,
        resizeCenterY: resizeCenterY + moved_y
      }
      this.setData({
        shapeList
      })
    }
    if (this.touch_target == 'resize') {
      let oneState = {
        resizeCenterX: resizeCenterX + moved_x,
        resizeCenterY: resizeCenterY + moved_y,
      }

      let diff_x_before = this.resize_center_x - this.mask_center_x;
      let diff_y_before = this.resize_center_y - this.mask_center_y;
      let diff_x_after = resizeCenterX - this.mask_center_x;
      let diff_y_after = resizeCenterY - this.mask_center_y;
      let distance_before = Math.sqrt(
        diff_x_before * diff_x_before + diff_y_before * diff_y_before
      );

      let distance_after = Math.sqrt(
        diff_x_after * diff_x_after + diff_y_after * diff_y_after
      );

      let angle_before = (Math.atan2(diff_y_before, diff_x_before) / Math.PI) * 180;
      let angle_after = (Math.atan2(diff_y_after, diff_x_after) / Math.PI) * 180;

      let twoState = {
        maskWidth: (distance_after / distance_before) * this.mask_width,
        rotate: angle_after - angle_before + this.rotate
      }

      shapeList[this.touch_shape_index] = {
        ...shapeList[this.touch_shape_index],
        ...oneState,
        ...twoState
      }

      this.setData({
        shapeList
      })

    }
    this.start_x = current_x;
    this.start_y = current_y;
  },

  previewPoster() {
    const { posterSrc } = this.data
    if (posterSrc !== '') wx.previewImage({ urls: [posterSrc] })
  },

  onHidePoster() {
    this.setData({
      isShowPoster: false
    })
  },

  savePoster() {
    const { posterSrc } = this.data

    if (posterSrc) {
      this.saveImageToPhotosAlbum(posterSrc)
    }
  },

  saveImageToPhotosAlbum(tempFilePath) {
    wx.saveImageToPhotosAlbum({
      filePath: tempFilePath,
      success: res2 => {
        wx.showToast({
          title: '图片保存成功'
        })
        console.log('保存成功 :', res2);
      },
      fail(e) {
        wx.showToast({
          title: '图片未保存成功'
        })
        console.log('图片未保存成功:' + e);
      }
    })
  },
})