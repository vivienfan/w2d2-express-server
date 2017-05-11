/*-------------------- Importing modules --------------------*/
const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const methodOverride = require('method-override');

/*-------------------- Enviornment setup --------------------*/
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieSession({
  name: "session",
  keys: ["This-is-my-secrete-key"],
  maxAge: 20 * 365 * 24 * 60 * 60 * 1000 // 20 years
}));
app.use(methodOverride('_method'));

/*-------------------- Global variable --------------------*/
const PORT = process.env.PORT || 8080; // default port 8080

const urlDB = {
  data: {
    "b2xVn2": {
      url: "http://www.lighthouselabs.ca",
      userID: "userRandomID",
      visitors: [],
      trace: []
    },
    "9sm5xK": {
      url: "http://www.google.com",
      userID: "user2RandomID",
      visitors: [],
      trace: []
    }
  },

  exists: function(shortUrl) {
    return this.data[shortUrl] ? true : false;
  },

  getLongUrl: function(shortUrl) {
    return this.data[shortUrl] ? this.data[shortUrl].url : "";
  },

  getUserId: function(shortUrl) {
    return this.data[shortUrl] ? this.data[shortUrl].userID : "";
  },

  getAccessCount: function(shortUrl) {
    return this.data[shortUrl] ? this.data[shortUrl].trace.length : 0;
  },

  getVisitorCount: function(shortUrl) {
    return this.data[shortUrl] ? this.data[shortUrl].visitors.length : 0;
  },

  getTrance: function(shortUrl) {
    return this.data[shortUrl] ? this.data[shortUrl].trace : 0;
  },

  // This function add the new url into database
  // input: string
  // output: string
  addUrl: function(longUrl, user) {
    let newShortUrl = "";
    // generate a new random short url
    // if it already exists, generate again
    do {
      newShortUrl = generateRandomString(6);
    } while(this.data[newShortUrl])
    // key is now unique, add the pair into the database
    this.data[newShortUrl] = { url: longUrl, userID: user, visitors: [], trace: [] };
    return newShortUrl;
  },

  addVisit: function(shortUrl, visitor_id) {
    if (this.data[shortUrl].visitors.indexOf(visitor_id) === -1) {
      // add the visitor
      this.data[shortUrl].visitors.push(visitor_id);
    }
    // append the timestamp and visitor id into trace
    this.data[shortUrl].trace.push({timestamp: new Date(), visitor: visitor_id});
  },

  updataUrl: function(shortUrl, longUrl) {
    this.data[shortUrl].url = longUrl;
    this.data[shortUrl].counter = 0;
    this.data[shortUrl].trace = [];
  },

  delete: function(shortUrl) {
    delete this.data[shortUrl];
  },

  // This function returns the subset of the urlDB
  // that belongs to the user with id
  urlsForUser: function(id) {
    let subset = {};
    for (let url in this.data) {
      if (this.data[url].userID === id) {
        subset[url] = this.data[url];
      }
    }
    return subset;
  }
};

const usersDB = {
  data: {
    "userRandomID": {
      id: "userRandomID",
      email: "user@example.com",
      password: bcrypt.hashSync("purple-monkey-dinosaur", 10)
    },
    "user2RandomID": {
      id: "user2RandomID",
      email: "user2@example.com",
      password: bcrypt.hashSync("dishwasher-funk", 10)
    }
  },

  exists: function(userId) {
    return this.data[userId] ? true : false
  },

  getEmail: function(userId) {
    return this.data[userId] ? this.data[userId].email : "";
  },

  // This function add the new user into database
  // inputs: string, string
  // output: string
  addUser: function(email, password) {
    let newUserId = "";
    // generate a new random user ID
    // if it already exists, generate again
    do {
      newUserId = generateRandomString(6);
    } while(this.data[newUserId])
    // key is now unique, add the pair into the database
    this.data[newUserId] = {
      id: newUserId,
      email: email,
      password: bcrypt.hashSync(password, 10)
    };
    return newUserId;
  },

  // This function checks if the given email
  // already exists in the users database
  // input: string
  canRegistered: function(email) {
    for (let user in this.data) {
      if (this.data[user].email === email) {
        return false;
      }
    }
    return true;
  },

  // This function returns the user id that matches
  // the given email and password
  // inputs: string, string
  // output: string
  findUser: function(email, password) {
    for (let user in this.data) {
      if (this.data[user].email === email
        && bcrypt.compareSync(password, this.data[user].password)) {
        return user;
      }
    }
    return "";
  }
};

const visitorsDB = {
  data: [],

  // This function generates a cookie for every new browser
  // (it recognize a browser as a visitor),
  // and adds to the data array
  addVisitor: function() {
    let visitor_id = "";
    do {
      visitor_id = generateRandomString(15);
    } while (this.data.indexOf(visitor_id) !== -1)
    this.data.push(visitor_id);
    return visitor_id;
  }
};

/*-------------------- Helper function --------------------*/
// This function generates a new random string
// output: string
function generateRandomString(length) {
  let newString = "";
  const dictionary = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  // generate a random string with the specified length
  for (let i = 0; i < length; i++ ) {
    newString += dictionary.charAt(
      Math.round(Math.random() * dictionary.length));
  }
  return newString;
}

/*-------------------- Get request responses --------------------*/
// Home page
// user is not logged in -> /login
// user is logged in -> /urls
app.get("/", (req, res) => {
  let userId = req.session.user_id;
  if (!userId || !usersDB.exists(userId)) {
    // user is not logged in
    res.redirect("/login");
  } else {
    res.redirect("/urls");
  }
});

// Display all urls that is created by the current user
// ------------
// Change of project specification:
// Situation:   user is not logged in
// required:    401
// implemented: redirect to /login
app.get("/urls", (req, res) => {
  let userId = req.session.user_id;
  let urls = urlDB.urlsForUser(userId);
  if (!userId || !usersDB.exists(userId)) {
    // user is not logged in
    res.redirect("/login");
  } else {
    let templateVars = {
      urls: urls,
      user: usersDB.getEmail(userId)
    };
    res.render("urls_index", templateVars);
  }
});

// shows page allows user to add a new URL
// user is not logged in -> /login
app.get("/urls/new", (req, res) => {
  let userId = req.session.user_id;
  if(!userId || !usersDB.exists(userId)) {
    // user is not logged in
    res.redirect("/login");
  } else {
    let templateVars = {
      user: usersDB.getEmail(userId),
      errMsg: ""
    };
    res.render("urls_new", templateVars);
  }
});

// to show a specific URL, allows user to edit the URL
// user is not logged in -> unauthorized
// short URL does not exist -> not found
// user is not the one who created this URL -> forbidden
app.get("/urls/:id", (req, res) => {
  let shortUrl = req.params.id;
  let userId = req.session.user_id;
  if(!userId || !usersDB.exists(userId)) {
    // user is not logged in
    res.sendStatus(401);
  } else if (!urlDB.exists(shortUrl)){
    // given short URL does not exist
    res.sendStatus(404);
  }  else if (userId !== urlDB.getUserId(shortUrl)) {
    // user is not the one who created this URL
    res.sendStatus(403);
  } else {
    let templateVars = {
      shortUrl: shortUrl,
      url: urlDB.getLongUrl(shortUrl),
      user: usersDB.getEmail(userId),
      counter: urlDB.getAccessCount(shortUrl),
      visitors: urlDB.getVisitorCount(shortUrl),
      trace: urlDB.getTrance(shortUrl),
      errMsg: ""
    };
    res.render("urls_show", templateVars);
  }
});

// redirect user to the external web page
// short URL does not exitst -> not found
app.get("/u/:shortURL", (req,res) => {
  let shortUrl = req.params.shortURL;
  if(!urlDB.exists(shortUrl)) {
    // given short URL does not exist
    res.sendStatus(404);
  } else {
    let visitor_id = req.session ? req.session.visitor_id : "";
    if (!visitor_id) {
      // new visitor
      visitor_id = visitorsDB.addVisitor();
      req.session.visitor_id = visitor_id
    }
    urlDB.addVisit(shortUrl, visitor_id);
    res.redirect(urlDB.getLongUrl(shortUrl));
  }
});

app.get("/hello", (req, res) => {
  res.end("<html><body>Hello <b>World</b></body></html>\n");
});

// shows a register page
// user already logged in -> /urls
app.get("/register", (req, res) => {
  let userId = req.session.user_id;
  if(!userId || !usersDB.exists(userId)) {
    // user is not logged in
    res.render("register", { errMsg: "" });
  } else {
    res.redirect("/urls");
  }
});

// shows a login page
// user already logged in -> /urls
app.get("/login", (req, res) => {
  let userId = req.session.user_id;
  if(!userId || !usersDB.exists(userId)) {
    // user is not logged in
    res.render("login", {});
  } else {
    res.redirect("/urls");
  }
});

/*-------------------- Post request responses --------------------*/
// to delete a url from database
// user is not logged in -> unauthorized
// short URL does not exist -> bad request
// user is not the one who created it -> forbidden
app.delete("/urls/:id", (req, res) => {
  let userId = req.session.user_id;
  if(!userId || !usersDB.exists(userId)) {
    // user is not logged in
    res.sendStatus(401);
  } else {
    let shortUrl = req.params.id;
    if (!urlDB.exists(shortUrl)) {
      // given short URL does not exist
      res.sendStatus(400);
    } else if (req.session.user_id !== urlDB.getUserId(shortUrl)){
      // user is not the one who created this URL
      res.sendStatus(403);
    } else {
      urlDB.delete(shortUrl);
      res.redirect("/urls");
    }
  }
});

// to edit a url in database
// user is not logged in -> unauthorized
// user is not the one who created it -> forbidden
app.put("/urls/:id", (req, res) => {
  let userId = req.session.user_id;
  let shortUrl = req.params.id;
  let longUrl = req.body.newURL;
  if(!userId || !usersDB.exists(userId)) {
    // user is not logged in
    res.sendStatus(401);
  } else {
    if (req.session.user_id !== urlDB.getUserId(shortUrl)) {
      // user is not the one who created this URL
      res.sendStatus(403);
    } else {
      if (!longUrl){
        // if long URL is empty
        let templateVars = {
          shortUrl: shortUrl,
          url: "",
          user: usersDB.getEmail(userId),
          counter: urlDB.getAccessCount(shortUrl),
          visitors: urlDB.getVisitorCount(shortUrl),
          trace: urlDB.getTrance(shortUrl),
          errMsg: "Please fill in the URL"
        };
        res.render("urls_show", templateVars);
      }
      else {
        urlDB.updataUrl(shortUrl, longUrl);
        res.redirect("/urls");
      }
    }
  }
});

// to add a new url into database
// and redirect to the specific url details page
// user is not logged in -> unauthorized
app.post("/urls", (req, res) => {
  let userId = req.session.user_id;
  if(!userId || !usersDB.exists(userId)) {
    // user is not logged in
    res.sendStatus(401);
  } else {
    let longUrl = req.body.longURL;
    if (!longUrl){
      // if long URL is empty
      let templateVars = {
        user: usersDB.getEmail(userId),
        errMsg: "Please fill in the URL"
      };
      res.render("urls_new", templateVars);
    } else {
      let shortURL = urlDB.addUrl(longUrl, userId);
      res.redirect(`/urls/${shortURL}`);
    }
  }
});

// to login, add authentication cookie -> /urls
// email or/and password is missing -> bad request
// email/password does not match -> forbidden
app.post("/login", (req, res) => {
  if (!req.body.email || !req.body.password) {
    // email or/and password is missing
    res.sendStatus(400);
  } else {
    let userId = usersDB.findUser(req.body.email, req.body.password);
    if (!userId) {
      // email/password does not match
      res.sendStatus(403);
    } else {
      req.session.user_id = userId;
      res.redirect("/urls");
    }
  }
});

// to logout, delete authentication cookie -> /urls
app.post("/logout", (req, res) => {
  req.session.user_id = null;
  res.redirect("/urls");
});

// to register
// email or/and password is missing -> bad request
// ------------
// Change of project specification:
// Situation:   email is already registered
// Required:    bad request
// Implemented: redirect back to /register with an error message
app.post("/register", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  if (!email || !password) {
    res.sendStatus(400);
  } else {
    if (usersDB.canRegistered(email)) {
      let userId = usersDB.addUser(email, password);
      req.session.user_id = userId;
      res.redirect("/urls");
    } else {
      res.render("register", { errMsg: `${email} had already been registered.` });
    }
  }
});

app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});

