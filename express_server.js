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
  maxAge: 60 * 60 * 1000 // 1 hour
}));
app.use(methodOverride('_method'));

/*-------------------- Global variable --------------------*/
const PORT = process.env.PORT || 8080; // default port 8080
const urlDatabase = {
  "b2xVn2": {
    url: "http://www.lighthouselabs.ca",
    userID: "userRandomID"
  },
  "9sm5xK": {
    url: "http://www.google.com",
    userID: "user2RandomID"
  }
};
const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

/*-------------------- Helper function --------------------*/
// This function generates a new random string
// output: string
function generateRandomString() {
  let newString = "";
  const dictionary = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  // generate a 6-character-long random string
  for (let i = 0; i < 6; i++ ) {
    newString += dictionary.charAt(
      Math.round(Math.random() * dictionary.length));
  }
  return newString;
}

// This function add the new url into database
// input: string
// output: string
function addUrl(longUrl, user) {
  let newShortUrl = "";
  // generate a new random short url
  // if it already exists, generate again
  do {
    newShortUrl = generateRandomString(6);
  } while(urlDatabase[newShortUrl])
  // key is now unique, add the pair into the database
  urlDatabase[newShortUrl] = { url: longUrl, userID: user };
  return newShortUrl;
}

// This function add the new user into database
// inputs: string, string
// output: string
function addUser(email, password) {
  let newUserId = "";
  // generate a new random user ID
  // if it already exists, generate again
  do {
    newUserId = generateRandomString(6);
  } while(users[newUserId])
  // key is now unique, add the pair into the database
  users[newUserId] = {
    id: newUserId,
    email: email,
    password: bcrypt.hashSync(password, 10)
  };
  return newUserId;
}

// This function checks if the given email
// already exists in the users database
// input: string
function canRegistered(email) {
  let flag = true;
  for (let user in users) {
    if (users[user].email === email) {
      return false;
    }
  }
  return true;
}

// This function returns the user id that matches
// the given email and password
// inputs: string, string
// output: string
function findUser(email, password) {
  for (let user in users) {
    if (users[user].email === email
      && bcrypt.compareSync(password, users[user].password)) {
      return user;
    }
  }
  return "";
}

// This function returns the subset of the urlDatabase
// that belongs to the user with id
function urlsForUser(id) {
  let subset = {};
  for (let url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      subset[url] = urlDatabase[url];
    }
  }
  return subset;
}

/*-------------------- Get request responses --------------------*/
// Home page
// user is not logged in -> /login
// user is logged in -> /urls
app.get("/", (req, res) => {
  let userId = req.session.user_id;
  if (!userId || !users[userId]) {
    res.redirect("/login");
  } else {
    res.redirect("/urls");
  }
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/users.json", (req, res) => {
  res.json(users);
});

// Display all urls that is created by the current user
// ------------
// Change of project specification:
// Situation:   user is not logged in
// required:    401
// implemented: redirect to /login
app.get("/urls", (req, res) => {
  let userId = req.session.user_id;
  let urls = urlsForUser(userId);
  if (!userId || !users[userId]) {
    res.redirect("/login");
  } else {
    let templateVars = {
      urls: urls,
      user: users[userId].email
    };
    res.render("urls_index", templateVars);
  }
});

// shows page allows user to add a new URL
// user is not logged in -> /login
app.get("/urls/new", (req, res) => {
  let userId = req.session.user_id;
  if(!userId || !users[userId]) {
    res.redirect("/login");
  } else {
    let templateVars = {
      user: users[userId].email
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
  if(!userId || !users[userId]) {
    res.sendStatus(401);
  } else if (!urlDatabase[shortUrl]){
    res.sendStatus(404);
  }  else if (urlDatabase[shortUrl].userID !== userId) {
    res.sendStatus(403);
  } else {
    let templateVars = {
      shortUrl: shortUrl,
      url: urlDatabase[shortUrl].url,
      user: users[userId].email
    };
    res.render("urls_show", templateVars);
  }
});

// redirect user to the external web page
// short URL does not exitst -> not found
app.get("/u/:shortURL", (req,res) => {
  let shortUrl = req.params.shortURL;
  if(!urlDatabase[shortUrl]) {
    res.sendStatus(404);
  } else {
    res.redirect(urlDatabase[shortUrl].url);
  }
});

app.get("/hello", (req, res) => {
  res.end("<html><body>Hello <b>World</b></body></html>\n");
});

// shows a register page
// user already logged in -> /urls
app.get("/register", (req, res) => {
  let userId = req.session.user_id;
  if(!userId || !users[userId]) {
    res.render("register", { errMsg: "" });
  } else {
    res.redirect("/urls");
  }
});

// shows a login page
// user already logged in -> /urls
app.get("/login", (req, res) => {
  let userId = req.session.user_id;
  if(!userId || !users[userId]) {
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
  if(!userId || !users[userId]) {
    res.sendStatus(401);
  } else {
    let shortUrl = req.params.id;
    if (!urlDatabase[shortUrl]) {
      res.sendStatus(400);
    } else if (req.session.user_id === urlDatabase[shortUrl].userID) {
      delete urlDatabase[req.params.id];
      res.redirect("/urls");
    } else {
      res.sendStatus(403);
    }
  }
});

// to edit a url in database
// user is not logged in -> unauthorized
// user is not the one who created it -> forbidden
app.put("/urls/:id", (req, res) => {
  let userId = req.session.user_id;
  if(!userId || !users[userId]) {
    res.sendStatus(401);
  } else {
    if (req.session.user_id === urlDatabase[req.params.id].userID) {
      urlDatabase[req.params.id].url = req.body.newURL;
      res.redirect("/urls");
    } else {
      res.sendStatus(403);
    }
  }
});

// to add a new url into database
// and redirect to the specific url details page
// user is not logged in -> unauthorized
app.post("/urls", (req, res) => {
  let userId = req.session.user_id;
  if(!userId || !users[userId]) {
    res.sendStatus(401);
  } else {
    let shortURL = addUrl(req.body.longURL, userId);
    res.redirect(`/urls/${shortURL}`);
  }
});

// to login, add authentication cookie -> /urls
// email or/and password is missing -> bad request
// email/password does not match -> forbidden
app.post("/login", (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.sendStatus(400);
  } else {
    let userId = findUser(req.body.email, req.body.password);
    if (!userId) {
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
    if (canRegistered(email)) {
      let userId = addUser(email, password);
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

