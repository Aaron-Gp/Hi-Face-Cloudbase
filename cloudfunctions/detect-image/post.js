const tencentcloud = require('tencentcloud-sdk-nodejs')
const config = require('./config')

let secretId = config.SecretId
let secretKey = config.SecretKey

const IaIClient = tencentcloud.iai.v20180301.Client;
const models = tencentcloud.iai.v20180301.Models;

const Credential = tencentcloud.common.Credential;
const ClientProfile = tencentcloud.common.ClientProfile;
const HttpProfile = tencentcloud.common.HttpProfile;

let cred = new Credential(secretId, secretKey);

let httpProfile = new HttpProfile();
httpProfile.endpoint = "iai.tencentcloudapi.com";

let clientProfile = new ClientProfile();
clientProfile.httpProfile = httpProfile;

let client = new IaIClient(cred, "ap-beijing", clientProfile);


const detectFace = async (Image) => {
  let faceReq = new models.DetectFaceRequest()

  let query_string = JSON.stringify(
    {
      Image,
      MaxFaceNum: 4,
      NeedFaceAttributes: 1
    }
  )

  faceReq.from_json_string(query_string);
  // console.log(faceReq)

  return new Promise((resolve, reject) => {
    client.DetectFace(faceReq, function (error, response) {
      if (error) {
        console.log('err', error);
        return error
      }
      // console.log('DetectFace response :', response)
      resolve({
        data: response
      })
    })
  });
}

const analyzeFace = (Image) => {
  let faceReq = new models.DetectFaceRequest()

  let query_string = JSON.stringify({
      Image
  })
  // 传入json参数
  faceReq.from_json_string(query_string);

  return new Promise((resolve, reject) => {
    // TC3-HMAC-SHA256
    // 通过client对象调用想要访问的接口，需要传入请求对象以及响应回调函数
    client.AnalyzeFace(faceReq, function (error, response) {
      // 请求异常返回，打印异常信息
      if (error) {
        console.log('err',error)
        return error
      }
      console.log('AnalyzeFace response :', response)
      resolve({
        data: response
      })
    })
  });
}

module.exports = {
  detectFace,
  analyzeFace
}