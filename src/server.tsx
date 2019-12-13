import path from 'path';
import React from 'react';
import express from 'express';
import { makeStyles } from '@material-ui/core/styles';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import Helmet from 'react-helmet';

import App from './App';

const app = express();

if (process.env.NODE_ENV !== 'production') {
  const webpack = require('webpack');
  const webpackConfig = require('../webpack.client.js');

  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');

  const compiler = webpack(webpackConfig);

  app.use(
    webpackDevMiddleware(compiler, {
      logLevel: 'silent',
      publicPath: webpackConfig.output.publicPath,
    }),
  );

  app.use(webpackHotMiddleware(compiler));
}

app.use(express.static(path.resolve(__dirname)));
const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
}));
app.get('*', (req, res) => {
  const context = {};
  let value = true;
  const html = renderToString(
    <StaticRouter location={req.url} context={context}>
      <App isLogin={value} useStyles={useStyles} />
    </StaticRouter>,
  );

  const helmet = Helmet.renderStatic();
  
  res.set('content-type', 'text/html');
  res.send(`
    <!DOCTYPE html>
      <html lang="en">
        <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
          <meta name="viewport" content="width=device-width, user-scalable=no">
          <meta name="google" content="notranslate">
          ${helmet.title.toString()}
        </head>
        <body>
          <div id="root">${html}</div>
          <script type="text/javascript" src="main.js"></script>
        </body>
      </html>
  `);
});

app.listen(3003, () => console.log('Server started http://localhost:3003'));