const express = require('express');
const cors = require('cors')
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://kyawzintun:test@ds255455.mlab.com:55455/url-shortener');

const urlEntrySchema = mongoose.Schema({
  original: String,
  shortCode: { type: Number, index: true }
});
urlEntrySchema.index({ shortCode: 1 });
urlEntrySchema.set('autoIndex', false);
const UrlEntry = mongoose.model('UrlEntry', urlEntrySchema);

app.get('/', (req, res) => {
  res.render('pages/index');
});

app.get('/:shortCode', (req, res) => {
  let shortCode = parseInt(req.params.shortCode);
  if(isNaN(shortCode)) {
    res.status(200).json({ error: 'Invalid URL shortCode. It must be a number.'});
  }else {
    UrlEntry.findOne({ shortCode }).then(doc => {
      if(!doc) {
        res.status(404).json({ error: 'Page not found' });
      }else {
        res.redirect(doc.original);
      }
    })
  }
});

app.get('/short/*', (req, res) => {
  let url = req.params[0];
  if (isValidUrl(url)) {
    insertNew(url).then(inserted => {
      if (!inserted) {
        res.status(500).send('Unknown error');
      } else {
        res.status(200).json({
          "original_url": url,
          "short_url": createFullUrl(req, inserted.shortCode)
        })
      }
    })
  } else {
    res.status(500).json({ error: "Wrong url format, make sure you have a valid protocol and real site." });
  }
});

function isValidUrl(url) {
  let regex = /^https?:\/\/(\S+\.)?(\S+\.)(\S+)\S*/;
  return regex.test(url);
}

function getShortCode() {
  return UrlEntry
    .find()
    .sort({ shortCode: -1 })
    .limit(1)
    .select({ _id: 0, shortCode: 1 })
    .then(docs => {
      return docs.length === 1 ? docs[0].shortCode + 1 : 0;
    });
}

function insertNew(url) {
  return getShortCode().then(newCode => {
    let newUrl = new UrlEntry({ original: url, shortCode: newCode });
    return newUrl.save();
  })
}

function createFullUrl(req, url) {
  if (process.env.PORT) {
    return `${req.protocol}://${req.hostname}/${url}`;
  }
  return `${req.protocol}://${req.hostname}:${port}/${url}`;
}

app.listen(port, function () {
  console.log('Node app is running on port', port);
}); 