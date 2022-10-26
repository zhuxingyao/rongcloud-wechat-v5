const app = getApp()
const common = require('../common');
const utils = require('../../utils/util.js');
let IM = null, RTC = null;
const RongRTCLib = require('@rongcloud/plugin-wechat-rtc');
const { RCRTCCode, RCMediaType } = RongRTCLib;

wx.setKeepScreenOn({
  keepScreenOn: true
})

let errorHandler = (error) => {
  error = error || { msg: '失败了', code: 50000 }
  console.log(error)
  if ([50000, 50051, 50052, -1307].includes(error.code)) {
    setTimeout(() => {
      wx.navigateBack({
        delta: 2
      })
    }, 2000);
  }
  wx.hideLoading();
  common.showToast(error.msg || '')
};

Page({
  data: {
    roomId: '',
    userId: '',
    pusher: null,
    remoteStreams: [],
    timer: 0,
    interval: 0,
    isJoined: false
  },
  
  onUnload: async function(){
    await this.leaveRoom();
    IM.disconnect();
  },
  onLoad: function (options) {
    const context = this;
    const { globalData: { $services } } = app;
    IM = $services.IM;
    RTC = $services.RTC;

    const { token, userId, groupId, roomId, tag, mediaType } = options;
    const decodeToken =  decodeURIComponent(token);
    wx.setNavigationBarTitle({
      title: `${roomId} - ${userId}`
    })
    this.setData({
      roomId: roomId,
      userId: userId,
      tag,
      mediaType
    });

    wx.showLoading({
      title: '连接中...',
      // mask: true
    });
    var timer = setTimeout(() => {
      wx.navigateBack({
        delta: 2
      });
      wx.hideLoading();
    }, 10000);

    IM.connect(decodeToken).then(() => {
      clearTimeout(timer);
      wx.hideLoading();
      common.showToast(`连接成功`)
    });

    RTC.startRTC({
      id: roomId,
      tag,
      mediaType
    });

    RTC.memberWatch(({ type, userIds }) => {
      if (utils.isEqual(type, 'joined')) {
        common.showToast(`${userIds.join(',')} joined`);
      }
      if (utils.isEqual(type, 'left')) {
        common.showToast(`${userIds.join(',')} left`);
        let { data: { remoteStreams } } = context;
        console.log(remoteStreams, userIds)
        remoteStreams = remoteStreams.filter((item) => {
          return !userIds.includes(item.stream.getUserId());
        });
        context.setData({
          remoteStreams
        })
      }
      if (utils.isEqual(type, 'kickoff')) {
        common.showToast('kickoff');
        this.setData({
          remoteStreams: [],
          pusher: null,
          isJoined: false
        });
      }
    });

    RTC.streamWatch(({ type, streams }) => {
      let remoteStreams = context.data.remoteStreams;
      if (utils.isEqual(type, 'published')) {
        this.registerStreamEvent(streams);
        const newStreams = streams.map((stream) => {
          return {
            msid: stream.getMsid(),
            stream
          }
        });
        remoteStreams.push(...newStreams);
      } else if (utils.isEqual(type, 'unpublished')) {
        remoteStreams = remoteStreams.filter((item) => {
          return streams.every((stream) => {
            return stream.getMsid() !== item.msid
          });
        })
      }
      context.setData({
        remoteStreams
      });

      const msIds = remoteStreams.map((item) => item.msid);
      console.log(`stream watch msIds: ${msIds.join(',')}`);
    });
  },
  registerStreamEvent (streams) {
    streams.forEach((stream) => {
      const msId = stream.getMsid()
      stream.registerStreamEventListener({
        onVideoPublish() {
          console.log(`${msId} onVideoPublish`);
          common.showToast(`${msId} onVideoPublish`);
        },
        onAudioPublish() {
          console.log(`${msId} onAudioPublish`);
          common.showToast(`${msId} onAudioPublish`);
        },
        onVideoUnpublish() {
          console.log(`${msId} onVideoUnpublish`);
          common.showToast(`${msId} onVideoUnpublish`);
        },
        onAudioUnppublish() {
          console.log(`${msId} onAudioUnppublish`);
          common.showToast(`${msId} onAudioUnppublish`);
        }
      })
    });
  },
  joinRTCRoom: async function () {
    wx.showLoading({
      title: '加入中...',
      mask: true
    });
    var timer = setTimeout(() => {
      wx.hideLoading();
    }, 10000);

    const resp = await RTC.joinRTCRoom();
    if (resp.code !== RCRTCCode.SUCCESS) {
      return
    }
    const { streams, userIds } = resp.data;
    wx.hideLoading();
    clearTimeout(timer);
    common.showToast('Join Successfully')

    this.registerStreamEvent(streams);

    this.setData({
      pusher: [{tag: 'RongCloudRTC'}],
      isJoined: true,
      remoteStreams: streams.map((stream) => {
        return {
          msid: stream.getMsid(),
          stream
        }
      })
    })
  },
  leaveRoom: async function () {
    await RTC.leaveRoom();
    common.showToast('Leave Successfully');
    this.setData({
      remoteStreams: [],
      pusher: null,
      isJoined: false
    });
  },
  async publishAudio () {
    const { code } = await RTC.publish(RCMediaType.AUDIO_ONLY)
    if (code === RCRTCCode.SUCCESS) {
      this.setData({
        pusher: [{tag: 'RongCloudRTC'}]
      })
    }
  },
  async publishVideo () {
    const { code } = await RTC.publish(RCMediaType.AUDIO_VIDEO)
    if (code === RCRTCCode.SUCCESS) {
      this.setData({
        pusher: [{tag: 'RongCloudRTC'}]
      })
    }
  },
  async unpublish () {
    const { code } = await RTC.unpublish()
    if (code === RCRTCCode.SUCCESS) {
      this.setData({ pusher: null })
    }
  },
  getStreamByMsId (e) {
    const msId = e.target.dataset.id;
    let remoteStreams = this.data.remoteStreams;
    selected = remoteStreams.filter((item) => {
      return item.msid === msId
    })
    return selected[0].stream
  },
  async subscribe (e, subTiny) {
    wx.showLoading({
      title: '订阅中...',
      mask: true
    });
    var timer = setTimeout(() => {
      wx.hideLoading();
    }, 300);
    const stream = this.getStreamByMsId(e);
    await RTC.subscribe([{
      stream,
      subTiny: subTiny === undefined ? true : subTiny
    }]);

    wx.hideLoading();
    clearTimeout(timer)
  },
  async switchSub (e) {
    let subTiny = true;
    if (e.detail.value) {
      subTiny = false;
    }
    this.subscribe(e, subTiny);
  },
  async unsubscribe (e) {
    wx.showLoading({
      title: '取消订阅中...',
      mask: true
    });
    var timer = setTimeout(() => {
      wx.hideLoading();
    }, 300);
    const stream = this.getStreamByMsId(e);
    await RTC.unsubscribe([stream]);
    wx.hideLoading();
    clearTimeout(timer)
  },
  toggleMicphone: function (e) {
    const close = e.detail.value
    if (close) {
      RTC.closeMicphone();
    } else {
      RTC.openMicphone();
    }
  },
  toggleCamera: function (e) {
    const close = e.detail.value
    if (close) {
      RTC.closeCamera();
    } else {
      RTC.openCamera();
    }
  },
  statechange(e) {
    const code = e.detail.code;
    console.log('live-pusher code:', code);
    if (code === -1307) {
      const livepusher = wx.createLivePusherContext();
      if (livepusher) {
        console.warn('尝试重启推流...');
        console.warn('停止当前推流...');
        livepusher.stop({
          fail(res) {
            console.error('停止推流失败...', res);
          },
          success() {
            console.warn('重新开始推流...');
            livepusher.start({
              fail(res) {
                console.error('推流失败', res);
              },
              success() {
                console.warn('推流已恢复');
              }
            });
          }
        });
      }
    }
  },
  startPreview () {
    RTC.startPreview()
  },
  stopPreview () {
    RTC.stopPreview()
  },
  consoleRoomStore () {
    RTC.consoleRoomStore()
  },
  toggleMute (e) {
    const isMute = e.detail.value
    const stream = this.getStreamByMsId(e);
    if (isMute) {
      stream.mute();
    } else {
      stream.unmute();
    }
  },
  setAudioOutputDevice (e) {
    const outputDevice = e.detail.value ? RongRTCLib.RCAudioOutputDevice.EAR : RongRTCLib.RCAudioOutputDevice.SPEAKER; 
    const stream = this.getStreamByMsId(e);
    stream.setAudioOutputDevice(outputDevice);
  },
  /**
   * 测试队列优先级
   */
  testQueuePriority () {
    const remoteStreams = this.data.remoteStreams;
    if (remoteStreams.length < 3) {
      common.showToast('请保证房间内至少有 3 个资源');
      return
    }

    remoteStreams.forEach((item) => {
      RTC.subscribe([item.stream]);
    });
    
    this.leaveRoom();
  },
  repeatCallExchange () {
    const remoteStreams = this.data.remoteStreams;
    if (remoteStreams.length < 5) {
      common.showToast('请保证房间内至少有 5 个资源');
      return
    }

    remoteStreams.forEach((item) => {
      if (stream.isSubscribed()) {
        RTC.unsubscribe([item.stream]);
      } else {
        RTC.subscribe([item.stream]);
      }
    });
  }
});