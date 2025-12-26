var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fileUpload = require('express-fileupload');
const fs = require('fs');

// load environment
require('dotenv').config();

// Log whether GenAI/Gemini key is present (do not print the key itself)
const hasGenAIKey = !!(process.env.GENAI_API_KEY || process.env.GEMINI_API_KEY);
console.log('GenAI key present:', hasGenAIKey);

// connect to MongoDB
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/review-app';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // exit if DB is required
    process.exit(1);
  });

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authApiRouter = require('./routes/auth');
var adminTimetableRouter = require('./routes/adminTimetable');
var adminUsersRouter = require('./routes/adminUsers');
var adminApiRouter = require('./routes/api-admin');
var viewsRouter = require('./routes/views');
var ratingsRouter = require('./routes/ratings');
var apiRatingsRouter = require('./routes/api-ratings');
var adminRatingsRouter = require('./routes/adminRatings');
var dashboardRouter = require('./routes/dashboard');

var app = express();

// express-ejs-layouts
const expressLayouts = require('express-ejs-layouts');
app.use(expressLayouts);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
// ensure tmp dir for express-fileupload temp files exists
const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// file upload middleware: increase limit to 10MB and use temp files for stability
app.use(fileUpload({ limits: { fileSize: 10 * 1024 * 1024 }, useTempFiles: true, tempFileDir: path.join(__dirname, 'tmp') }));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/auth', authApiRouter);
app.use('/api/admin', adminApiRouter);
// Mount admin routes (manual class add). Upload functionality has been removed.
app.use('/admin', adminTimetableRouter);
app.use('/admin/users', adminUsersRouter);
app.use('/ratings', ratingsRouter);
app.use('/api/ratings', apiRatingsRouter);
app.use('/admin/ratings', adminRatingsRouter);
app.use('/dashboard', dashboardRouter);
app.use('/', viewsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // log full stack for easier debugging
  console.error(err && err.stack ? err.stack : err);

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
