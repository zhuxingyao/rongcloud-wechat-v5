const RongRTCLib = require('@rongcloud/plugin-wechat-rtc');
const { ObserverList } = require('../../pages/common.js');
const common = require('../common');
const RongIMLib = require('@rongcloud/imlib-next');

const { RCRTCCode } = RongRTCLib

const memberWatcher = new ObserverList();
const streamWatcher = new ObserverList();

let roomId = null;
let room = null;
let tag = null;
let mediaType = null;
const startRTC = (params) => {
  const { id } = params
  roomId = id;
  tag = params.tag;
  mediaType = parseInt(params.mediaType);
}

const initRTCClient = (config) => {
  const rtcClient = RongIMLib.installPlugin(RongRTCLib.installer, {
    timeout: 30 * 1000,
    logLevel: 0,
    mediaServer: config.mediaServer
  });
  return rtcClient;
}

/**
 * 注册房间事件监听
 */
const registerRoomEventListener = () => {
  room.registerRoomEventListener({
    onKickOff: (byServer, state) => {
      memberWatcher.notify({
        type: 'kickoff'
      });
    },
    onMessageReceive: (name, content, senderUserId, messageUId) => {

    },
    onRoomAttributeChange: (name, content) => {

    },
    onAudioMuteChange: (stream) => {
      const enable = stream.isOwnerMuteAudio()
      common.showToast(`${stream.getMsid()} audio status ${enable}`)
    },
    onVideoMuteChange: (stream) => {
      const enable = stream.isOwnerDisableVideo()
      common.showToast(`${stream.getMsid()} video status ${enable}`)
    },
    onStreamPublish: (streams) => {
      streamWatcher.notify({
        type: 'published',
        streams
      })
    },
    onStreamUnpublish: (streams) => {
      streamWatcher.notify({
        type: 'unpublished',
        streams
      })
    },
    onUserJoin: (userIds) => {
      memberWatcher.notify({
        type: 'joined',
        userIds
      });
    },
    onUserLeave: (userIds) => {
      memberWatcher.notify({
        type: 'left',
        userIds
      });
    }
  })
};

/**
 * 注册上下行数据监听
 */
const registerReportListener = () => {
  room.registerReportListener((data) => {
    console.log('上下行数据: ', JSON.stringify(data));
  });
}

/**
 * 注册本端麦克风采集的音量监听
 */
const onLocalAudioLevelChange = () => {
  room.onLocalAudioLevelChange((volume) => {
    console.log('本端麦克风采集的音量: ', volume);
  });
}

/**
 * 注册远端音频的音量监听
 */
const onRemoteAudioLevelChange = () => {
  room.onRemoteAudioLevelChange((id, volume) => {
    console.log('远端音频的音量: ', id, volume);
  });
}

/**
 * 开启视频预览
 */
const startPreview = () => {
  room.startPreview();
}

/**
 * 关闭视频预览
 */
const stopPreview = () => {
  room.stopPreview();
}

/**
 * 开启摄像头
 */
const openCamera = async () => {
  const { code } = await room.openCamera();
  if (code === RCRTCCode.SUCCESS) {
    common.showToast('openCamera Successfully');
  } else {
    common.showToast('openCamera fail');
  }
  return { code };
}

/**
 * 关闭摄像头
 */
const closeCamera = async () => {
  const { code } = await room.closeCamera();
  if (code === RCRTCCode.SUCCESS) {
    common.showToast('closeCamera Successfully');
  } else {
    common.showToast('closeCamera fail');
  }
  return { code };
}

/**
 * 开启麦克风
 */
const openMicphone = async () => {
  const { code } = await room.openMicphone();
  if (code === RCRTCCode.SUCCESS) {
    common.showToast('openMicphone Successfully');
  } else {
    common.showToast('openMicphone fail');
  }
  return { code };
}

/**
 * 关闭麦克风
 */
const closeMicphone = async () => {
  const { code } = await room.closeMicphone();
  if (code === RCRTCCode.SUCCESS) {
    common.showToast('closeMicphone Successfully');
  } else {
    common.showToast('closeMicphone fail');
  }
  return { code };
}

/**
 * 发布资源
 */
const publish = async (mediaType) => {
  const { code } =  await room.publishStream(tag, mediaType)
  if (code !== RCRTCCode.SUCCESS) {
    common.showToast(`publish failed ${code}`)
  } else {
    common.showToast('publish Successfully')
  }

  return { code };
}

/**
 * 取消发布
 */
const unpublish = async () => {
  const { code } = await room.unpublishStream(tag, mediaType)
  if (code !== RCRTCCode.SUCCESS) {
    common.showToast(`unpublish failed ${code}`)
  } else {
    common.showToast('unpublish Successfully')
  }

  return { code };
}

/**
 * 订阅资源
 * @param {*} streams 
 */
const subscribe = async (streams) => {
  const { code } = await room.subscribe(streams)
  if (code === RCRTCCode.SUCCESS) {
    common.showToast('subscribe Successfully')
  } else {
    common.showToast(`subscribe failed ${code}`)
  }

  return { code }
}

/**
 * 取消订阅
 * @param {*} streams 
 */
const unsubscribe = async (streams) => {
  const { code } = await room.unsubscribe(streams)
  if (code === RCRTCCode.SUCCESS) {
    common.showToast('unsubscribe Successfully')
  } else {
    common.showToast(`unsubscribe failed ${code}`)
  }

  return { code }
}

/**
 * 打印房间内存数据
 */
const consoleRoomStore = () => {
  console.log('摄像头是否打开: ', room.isCameraOpen());
  console.log('麦克风是否打开: ', room.isMicphoneOpen());
  console.log('房间是否被销毁: ', room.isDestroyed());
  console.log('房间号: ', room.getRoomId());
  console.log('当前用户: ', room.getCrtUserId());
  console.log('房间内远端用户: ', room.getRemoteUserIds());
  console.log('房间内远端资源: ', room.getRemoteStreams());
}

module.exports = (config) => {
  const rtcClient = initRTCClient(config)

  const memberWatch = (watcher) => {
    var force = true;
    memberWatcher.add(watcher, force);
  };

  const streamWatch = (watcher) => {
    var force = true;
    streamWatcher.add(watcher, force);
  };
  
  const joinRTCRoom = async () => {
    const resp = await rtcClient.joinRTCRoom(roomId)
    const { code } = resp;
    if (code !== RCRTCCode.SUCCESS) {
      common.showToast(`${code}`)
      return { code };
    }
    room = resp.data.room;
    registerRoomEventListener();
    registerReportListener();
    onLocalAudioLevelChange();
    onRemoteAudioLevelChange();
    return resp;
  };

  const leaveRoom = async () => {
    return rtcClient.leaveRoom(room);
  };

  return {
    startRTC,
    joinRTCRoom,
    leaveRoom,
    startPreview,
    stopPreview,
    openCamera,
    closeCamera,
    openMicphone,
    closeMicphone,
    memberWatch,
    streamWatch,
    consoleRoomStore,
    publish,
    unpublish,
    subscribe,
    unsubscribe
  };
};