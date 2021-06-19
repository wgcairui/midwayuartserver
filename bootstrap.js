const WebFramework = require('@midwayjs/koa').Framework;
const SocketFramework = require('@midwayjs/socketio').Framework
const WsFramework = require('@midwayjs/ws').Framework

const web = new WebFramework().configure({
  port: 7001,
});

const socket = new SocketFramework().configure({ path: "/WebClient" })

const ws = new WsFramework().configure({ path: '/wx' })

const { Bootstrap } = require('@midwayjs/bootstrap');
Bootstrap
  .load(web)
  .load(socket)
  //.load(ws)
  .run();
