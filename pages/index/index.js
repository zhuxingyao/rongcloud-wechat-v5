// index.js
// 获取应用实例
const app = getApp()
// 导入配置文件
const config = require('../../config');
// 引入 SDK 依赖
const RongIMLib = require('@rongcloud/imlib-next');
const RongRTCLib = require('/@rongcloud/plugin-wechat-rtc');

const { RCRTCCode } = RongRTCLib

let rtcClient = null;
let room = null;



Page({
  data: {
    motto: 'Hello World',
    roomId: 'room01',
    appkey: config[0].appkey,
    token: config[0].token,
    rtcClient: null,
    remoteStreams:[]
  },
  // 事件处理函数

  enten(){
    wx.navigateTo({
      url: '../login/login',
    })
  },
  init(){
    wx.showLoading({
      title: '初始化中...',
      mask: true
    });
    RongIMLib.init({
      appkey: this.data.appkey,
    });
    const Events = RongIMLib.Events;
    RongIMLib.addEventListener(Events.MESSAGES, (event) => {
      console.log('received messages', event.messages);
    });
    RongIMLib.addEventListener(Events.CONNECTING, () => {
      console.log('onConnecting');
    });
    RongIMLib.addEventListener(Events.CONNECTED, () => {
      console.log('onConnected');
    });
    RongIMLib.addEventListener(Events.DISCONNECT, () => {
      console.log('onDisconnect');
    });
    // 初始化 RCRTCClient，初始化过程推荐放在建立连接之前
    rtcClient = RongIMLib.installPlugin(RongRTCLib.installer,{
      logLevel:0
    })
    setTimeout(()=>{
      wx.hideLoading();
    },500)
    console.log('init success')
  },
  connect(){
    wx.showLoading({
      title: '连接中...',
      mask: true
    });
    const { data: {token}} = this;
    RongIMLib.connect(token).then((user) => {
      console.log('connect success', user.data.userId);
      wx.hideLoading();
    })
    .catch((error) => {
      console.log(`连接失败: ${error}`);
      wx.hideLoading();
    });
  },
  async joinRoom(){
    wx.showLoading({
      title: '加入房间中...',
      mask: true
    });
    
    const resp = await rtcClient.joinRTCRoom(this.data.roomId)
    const { code, data } = resp;
    if (code !== RCRTCCode.SUCCESS) {
      console.log('join room faild')
      return
    }
    console.log('join success')
    room = data.room
    this.setData({
      remoteStreams: data.streams.map((stream) => {
        return {
          msid: stream.getMsid(),
          stream
        }
      })
    })
    wx.hideLoading();
    console.log('remoteStreams',this.data.remoteStreams)
  },
  registerRoomEventListener(){
    let context = this;
    let { data: { remoteStreams } } = context;
    room.registerRoomEventListener({
      onKickOff(byServer){
        console.log('onKickOff ->',byServer)
      },
      onMessageReceiveonMessageReceive(name,content,senderUserId,messageUId){
        console.log('onMessageReceiveonMessageReceive ->')
      },
      onRoomAttributeChange(name,content){
        console.log('监听房间属性变更通知')
      },
      onAudioMuteChange(stream){
        console.log('发布者禁用/启用音频')
      },
      onVideoMuteChange(stream){
        console.log('发布者禁用/启用视频')
      },
      onStreamPublish(streams){
        console.log('onStreamPublish ->',streams)
        let steamsOnPublish = streams.map((stream) => {
          return {
            msid: stream.getMsid(),
            stream
          }
        })
        remoteStreams = [...remoteStreams,...steamsOnPublish]
        context.setData({
          remoteStreams
        })
        console.log(context.data.remoteStreams)
      },
      onStreamUnpublish(streams){
        console.log('onStreamUnpublish ->',streams)
        remoteStreams = remoteStreams.filter((item) => {
          return streams.every((stream) => {
            return stream.getMsid() !== item.msid
          })
        })
        context.setData({
          remoteStreams 
        })
      },
      onUserJoin(userIds){
        console.log('人员加入 ->',userIds)
      },
      onUserLeave(userIds){
        console.log('人员退出 ->',userIds)
        remoteStreams = remoteStreams.filter((item) => {
          return !userIds.includes(item.getUser)
        })
        context.setData({
          remoteStreams 
        })
      }
    })
    console.log('registerRoomEventListener success')
  },
  async publishStream(){
    wx.showLoading({
      title: '发布资源中...',
      mask: true
    });
    // 发布不传任何参数时，默认会发一个 tag 为 RongCloud 的音视频资源
    const { code } =  await room.publishStream()
    console.log( '发布资源',code )
    wx.hideLoading();
  },
  async unpublishStream(){
    wx.showLoading({
      title: '取消发布资源中...',
      mask: true
    });
    const { code } = await room.unpublishStream()
    console.log( '取消发布',code )
    wx.hideLoading();
  },
  async toggleCamera(e){
    console.log(e.detail.value)
    if(!e.detail.value){
      const { code } = await room.openCamera()
      if( code !== 10000){
        console.log('打开摄像头失败',code)
        return
      }
      console.log('打开摄像头成功')
    }else{
      const { code } = await room.closeCamera()
      if( code !== 10000){
        console.log('关闭摄像头失败',code)
        return
      }
      console.log('关闭摄像头成功')
    }
  },
  async toggleMicphone(e){
    if(!e.detail.value){
      const { code } = await room.openMicphone()
      if( code !== 10000){
        console.log('打开麦克风失败')
        return
      }
      console.log('打开麦克风成功')
    }else{
      const { code } = await room.closeMicphone()
      if( code !== 1000){
        console.log('关闭麦克风失败')
        return
      }
      console.log('关闭麦克风成功')
    }
  },
  async subscribe(e){
    wx.showLoading({
      title: '订阅资源中...',
      mask: true
    });
    const stream = this.getStreamByMsId(e);
    const { code } = await room.subscribe([stream]);
    if(code != 10000){
      console.log('订阅失败')
      return
    }
    console.log('订阅成功')
    wx.hideLoading();
  },
  async unsubscribe(e){
    const stream = this.getStreamByMsId(e);
    console.log(e);
    const { code } = await room.unsubscribe([stream]);
    if(code != 10000){
      console.log('取消订阅失败')
      return
    }
    console.log('取消订阅成功')
  },
  getRemoteStreams(){
    const remoteStreams = room.getRemoteStreams();
    console.log('getRemoteStreams ->',remoteStreams)
  },
  getRemoteUserIds(){
    const userIds = room.getRemoteUserIds();
    console.log('getRemoteUserIds ->',userIds)
  },
  async leaveRoom(){
    wx.showLoading({
      title: '离开房间中...',
      mask: true
    });
    await rtcClient.leaveRoom(room)
    setTimeout(()=>{
      wx.hideLoading();
    },500)
  },
  toggleMute(e){
    const stream = this.getStreamByMsId(e);
    if(e.detail.value){
      stream.mute()
    }else{
      stream.unmute()
    }
  },
  setAudioOutputDevice(e){
    const stream = this.getStreamByMsId(e);
    const outputDevice = e.detail.value ? RongRTCLib.RCAudioOutputDevice.EAR : RongRTCLib.RCAudioOutputDevice.SPEAKER; 
    stream.setAudioOutputDevice(outputDevice);
  },
  getStreamByMsId (e) {
    const msId = e.target.dataset.id;
    let remoteStreams = this.data.remoteStreams;
    const selected = remoteStreams.filter((item) => {
      return item.msid === msId
    })
    return selected[0].stream
  },



  onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
  }
})
