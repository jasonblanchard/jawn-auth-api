require('dotenv').config();
const express = require('express');
const Boom = require('@hapi/boom');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const csrf = require('csurf');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');

const usersByUsername = {
  'test': {
    username: 'test',
    password: 'testpass',
    id: 1,
    uuid: 'bcf4e360-2bd4-41a1-a9d0-786577e02f4a'
  }
}
 
var app = express();

app.use(bodyParser.json());

app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
 
app.use(session({
  key: 'sessionId',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  // TODO: Use RedisStore
}));

const csrfProtection = csrf({ cookie: true });
app.use(cookieParser());

app.get('/health', (request, response) => {
  return response.json({ status: 'ok', service: 'auth', version: 1 });
});
 
app.post('/login', (request, response) => {
  const { username, password } = request.body;
  const user = usersByUsername[username];
  
  if (user && user.password === password) {
    request.session.user = { id: user.id, uuid: user.uuid };
    return response.status(201).end();
  }

  return response.status(401).end();
});

app.get('/csrf', csrfProtection, (request, response) => {
  return response.json({ csrfToken: request.csrfToken() });
});

app.use('/session/authn*', csrfProtection, (request, response) => {
  if (request.cookies.sessionId && request.session.user) {
    // TODO: Cache this and regenerate when it expires
    var token = jwt.sign({
      uesrUuid: request.session.user.uuid,
      csrfToken: request.csrfToken()
    }, process.env.JWT_SECRET);
    response.header('Authorization', `Bearer ${token}`);
    return response.status(200).end();
  }
  const error = Boom.unauthorized();

  switch (request.accepts(['html', 'json'])) {
    case 'html':
      return response.redirect(process.env.LOGIN_PATH);
    case 'json':
      return response.status(401).json(error.output.payload);
    default:
      return response.status(401).send(error.message);
  }
});

app.delete('/session', (request, response) => {
  request.session.destroy(error => {
    response.clearCookie('sessionId');
    response.status(204).end();
  });
});

app.use(function (err, request, response, next) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err)

  // handle CSRF token errors here
  // console.log(request.headers);
  response.status(403)
  response.json({ error: "Invalid csrf token" });
})

const port = process.env.PORT || 8082;
app.listen(port, () => {
  console.log(`>>> Listning on port ${port} <<<`);
});