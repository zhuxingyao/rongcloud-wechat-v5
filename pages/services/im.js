const RongIMLib = require('@rongcloud/imlib-next');

module.exports = (config) => {
  let connectionState = null;
  const watchMessage = (msg) => { console.log('收到消息', msg); };
  const onConnected = () => {
    console.log('onConnected');
    connectionState = RongIMLib.ConnectionStatus.CONNECTED;
  };
  const onDisconnect = () => {
    console.log('onDisconnect');
  };
  const onConnecting = () => {
    console.log('onConnecting');
    connectionState = RongIMLib.ConnectionStatus.CONNECTING;
  };

  RongIMLib.init({ appkey: config.APPKEY, customCMP: config.customCMP, navigators: config.navigators });
  const Events = RongIMLib.Events;
  RongIMLib.addEventListener(Events.MESSAGES, function (event) {
    var messages = event.messages;
    // var hasMore = event.hasMore
    watchMessage(messages);
    console.warn('received messages', event);
  });

  RongIMLib.addEventListener(Events.CONNECTING, onConnecting);
  RongIMLib.addEventListener(Events.CONNECTED, onConnected);
  RongIMLib.addEventListener(Events.DISCONNECT, onDisconnect);
// };
let userId = null;
const connect = async (TOKEN) => {
  return RongIMLib.connect(TOKEN).then(user => {
    userId = user.data.userId;
    console.log('connect success', user.data.userId);
    return true;
  }).catch(error => {
    console.error(error);
  });
};

const disconnect = () => {
  return RongIMLib.disconnect();
};

  return {
    disconnect,
    connect,
    connectionState,
    userId
  };
};