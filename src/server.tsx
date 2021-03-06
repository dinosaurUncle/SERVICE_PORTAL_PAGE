import path from 'path';
import React from 'react';
import express from 'express';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import Helmet from 'react-helmet';
import { ChunkExtractor } from '@loadable/server';
import bodyParser from 'body-parser'
import request from 'sync-request';
import HTTPMethod from 'http-method-enum';
import session from 'express-session';
import urlencode from 'urlencode';



function ServerApiCall(req: any, domain: string, method:HTTPMethod){
  let result =null;
  const PORT = '8089';
  const HOST = 'http://localhost';
  let url = HOST + ":" + PORT + domain;
  let bodyData = {};
  if (method == HTTPMethod.POST || method == HTTPMethod.PUT || method == HTTPMethod.DELETE) {
    bodyData = {json: req.body}
  }
  console.log('url: ', url);
  console.log('method: ', method);
  let post_request = request(method, url, bodyData)
  result = JSON.parse(post_request.getBody('utf8'));
  console.log('ServerApiCall result: ', result);
  return result;
}

function getSessionSetting(req: any){
  const sess = req.session as MySession;
  let result = null;
  if (sess.pages == null){
    console.log('getMenuList api call!');
    result = ServerApiCall(null, '/account_page/page/' + sess.account.accountId, HTTPMethod.GET);
    sess.pages = result.pages;
  } 
}

interface MySession extends Express.Session {
  login: boolean;
}

const app = express();
app.use(bodyParser.json())

if (process.env.NODE_ENV !== 'production') {
  const webpack = require('webpack');
  const webpackConfig = require('../webpack.client.js');

  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');

  const compiler = webpack(webpackConfig);

  app.use(session({
    secret: "i-love-husky",
    resave: false,
    saveUninitialized: true
   }));

  app.use(
    webpackDevMiddleware(compiler, {
      logLevel: 'silent',
      publicPath: webpackConfig[0].output.publicPath,
    }),
  );

  app.use(webpackHotMiddleware(compiler));
}

app.use(express.static(path.resolve(__dirname)));

app.get('*', (req, res) => {
  const sess = req.session as MySession;
  console.log('log: ' + req.url);
  console.log("login: ", sess.login);
  if (sess.login) {
    getSessionSetting(req);
  }
  
  const nodeStats = path.resolve(__dirname, './node/loadable-stats.json');
  const webStats = path.resolve(__dirname, './web/loadable-stats.json');
  const nodeExtractor = new ChunkExtractor({ statsFile: nodeStats });
  const { default: App } = nodeExtractor.requireEntrypoint();
  const webExtractor = new ChunkExtractor({ statsFile: webStats });
  
  const context = {};
  const jsx = webExtractor.collectChunks(
    <StaticRouter location={req.url} context={context} >
      <App />
    </StaticRouter>
  );

  const html = renderToString(jsx);
  const helmet = Helmet.renderStatic();
  res.set('content-type', 'text/html');
  res.send(`
    <!DOCTYPE html>
      <html lang="en">
        <head>
          <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
          <meta name="viewport" content="width=device-width, user-scalable=no">
          <meta name="google" content="notranslate">
          ${helmet.title.toString()}
          ${webExtractor.getLinkTags()}
          ${webExtractor.getStyleTags()}
        </head>
        <body>
          <div id="root">${html}</div>
          <div style="visibility:hidden" id="session">${JSON.stringify(sess)}</div>
          ${webExtractor.getScriptTags()}
        </body>
      </html>
  `);
});

app.listen(3003, () => console.log('Server started http://localhost:3003'));

/**
 * 2019/12/30
 * API 통신 컨트롤러
 */
 // 1. 유효성검사
 app.post('/isId', (req, res) => {
  res.json(ServerApiCall(req, '/account/isId/' + req.body.id, HTTPMethod.GET));
});
// 2. 회원가입
app.post('/createAcount', (req, res) => {
  console.log('test11');
  res.json(ServerApiCall(req, '/account', HTTPMethod.POST));
});
// 3. 로그인 
app.post('/login', (req, res) => {
  let result = ServerApiCall(req, '/account/login', HTTPMethod.POST);
  console.log('server.login: ', result.login); 
  console.log('server.result: ', result); 
  const sess = req.session as MySession;
  sess.login = result.login;
  sess.account = result.account;
  res.json(result);
});
// 4. 로그아웃 
app.post('/logout', (req, res) => {
  const sess = req.session as MySession;
  sess.login = false;
  sess.account = null;
  sess.pages = null;
  res.json(null);
});
// 5. 아이디 찾기
app.post('/selectId', (req, res) => {
  console.log('selectId');
  res.json(ServerApiCall(req, '/account/selectId/' + urlencode(req.body.name) + "/" + req.body.email
  , HTTPMethod.GET));
});
// 6. 계정 별 권한에 따른 허용하는 메뉴 리스트 조회
app.post('/pageListByAccountId', (req, res) => {
  const sess = req.session as MySession;
  console.log('pageListByaccountId');
  let result = ServerApiCall(null, '/account_page/page/' + sess.account.accountId, HTTPMethod.GET);
  res.json(result);
});
// 7. 이벤트 메세지 조회
app.post('/eventMessageList', (req, res) => {
  const sess = req.session as MySession;
  console.log('eventMessageList');
  let result = ServerApiCall(req, '/eventMessage/' + sess.account.accountId , HTTPMethod.GET);
  res.json(result);
});
// 8. 이벤트 메세지 확인
app.put('/eventMessageCheck', (req, res) => {
  const sess = req.session as MySession;
  console.log('eventMessageCheck');
  let result = ServerApiCall(req, '/eventMessage', HTTPMethod.PUT);
  sess.eventMessage = result;
  res.json(result);
});
//9. 관리자 페이지 - 계정관리 - 전체 회원 리스트 조회
app.post('/getAccountList', (req, res) => {
  console.log('getAccountList');
  let result = ServerApiCall(req, '/account', HTTPMethod.GET);
  console.log('getAccountList.result: ', result);
  res.json(result);
});
//10. 관리자 페이지 - 계정관리 - 회원 수정
app.put('/accountUpdate', (req, res) => { 
  console.log("accountUpdate");
  let result = ServerApiCall(req, '/account/admin/'+ req.body.targetAccountId, HTTPMethod.PUT);
  res.json(result);
});
//11. 관리자 페이지 - 계정관리 - 회원 삭제
app.delete('/accountDelete', (req, res) => {
  console.log("accountDelete: ", req.body);
  let result = ServerApiCall(req, '/account/admin/'+ req.body.accountId+ '/' + req.body.targetAccountId, HTTPMethod.DELETE);
  res.json(result);
});
// 12. 이벤트 메세지 확인
app.post('/eventMessageListByAdmin', (req, res) => {
  console.log('eventMessageListByAdmin');
  let result = ServerApiCall(req, '/eventMessage', HTTPMethod.GET);
  res.json(result);
});
// 13. 관리자 페이지 - 페이지관리 - 페이지 조회
app.post('/pageList', (req, res) => {
  console.log('pageList');
  let result = ServerApiCall(req, '/page/admin', HTTPMethod.GET);
  res.json(result);
});
//14. 관리자 페이지 - 페이지관리 - 페이지 등록
app.post('/pageCreate', (req, res) => { 
  console.log("pageCreate");
  let result = ServerApiCall(req, '/page/admin/'+ req.body.targetAccountId, HTTPMethod.POST);
  res.json(result);
});
//15. 관리자 페이지 - 페이지관리 - 페이지 수정
app.put('/pageUpdate', (req, res) => { 
  console.log("pageUpdate");
  let result = ServerApiCall(req, '/page/admin/'+ req.body.targetAccountId, HTTPMethod.PUT);
  res.json(result);
});
//16. 관리자 페이지 - 페이지관리 - 페이지 삭제
app.delete('/pageDelete', (req, res) => {
  console.log("pageDelete");
  let result = ServerApiCall(req, '/page/admin/'+ req.body.pageId+ '/' + req.body.targetAccountId, HTTPMethod.DELETE);
  res.json(result);
});
// 17. 관리자 페이지 - 페이지관리 - 권한 조회
app.post('/roleList', (req, res) => {
  console.log('roleList');
  let result = ServerApiCall(req, '/role/admin', HTTPMethod.GET);
  res.json(result);
});
//18. 관리자 페이지 - 페이지관리 - 권한 등록
app.post('/roleCreate', (req, res) => { 
  console.log("roleCreate");
  let result = ServerApiCall(req, '/role/admin/'+ req.body.targetAccountId, HTTPMethod.POST);
  res.json(result);
});
//19. 관리자 페이지 - 페이지관리 - 권한 수정
app.put('/roleUpdate', (req, res) => { 
  console.log("roleUpdate");
  let result = ServerApiCall(req, '/role/admin/'+ req.body.targetAccountId, HTTPMethod.PUT);
  res.json(result);
});
//20. 관리자 페이지 - 페이지관리 - 권한 삭제
app.delete('/roleDelete', (req, res) => {
  console.log("roleDelete");
  let result = ServerApiCall(req, '/role/admin/'+ req.body.roleId+ '/' + req.body.targetAccountId, HTTPMethod.DELETE);
  res.json(result);
});
//21. MyAccount 계정상세정보 - 조회
app.put('/eachAccountUpdate', (req, res) => { 
  const sess = req.session as MySession;
  console.log("eachAccountUpdate");
  let result = ServerApiCall(req, '/account/'+ req.body.accountId, HTTPMethod.PUT);
  sess.account = result.account;
  res.json(result.account);
});
//22. account - role 맵핑 정보 받아오기
app.post('/getAccountAndRoleList', (req, res) => { 
  console.log("getAccountAndRoleList");
  let result = ServerApiCall(req, '/account_role/detail/'+ req.body.targetAccountId, HTTPMethod.GET);
  res.json(result);
});
//23. account - role 맵핑 저장
app.post('/accountAndRoleInfoSave', (req, res) => { 
  console.log("accountAndRoleInfoSave");
  let result = ServerApiCall(req, '/account_role/'+ req.body.accountId + '/' + req.body.roleIds , HTTPMethod.POST);
  res.json(result);
});
//24. account - role 맵핑 삭제
app.post('/accountAndRoleInfoDelete', (req, res) => { 
  console.log("accountAndRoleInfoDelete");
  let result = ServerApiCall(req, '/account_role/'+ req.body.accountId + '/' + req.body.roleIds , HTTPMethod.DELETE);
  res.json(result);
});
