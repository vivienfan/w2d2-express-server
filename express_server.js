/*-------------------- Importing modules --------------------*/
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');

/*-------------------- Enviornment setup --------------------*/
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

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
    password: password
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
      && users[user].password === password) {
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
app.get("/", (req, res) => {
  res.end("Hello!\n");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// display all urls that is created by the current user
// if a user is not logged in, redirect to login page
app.get("/urls", (req, res) => {
  let userId = req.cookies.user_id;
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

// to add a new URL
// if a user is not logged in, redirect to login page
app.get("/urls/new", (req, res) => {
  let userId = req.cookies.user_id;
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
// if the user is not logged in, redirect to login page
// if the user is not the one who created this URL, access forbidden
app.get("/urls/:id", (req, res) => {
  let shortUrl = req.params.id;
  let userId = req.cookies.user_id;
  if(!userId || !users[userId]) {
    res.redirect("/login");
  } else if (urlDatabase[shortUrl].userID !== userId) {
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

app.get("/u/:shortURL", (req,res) => {
  res.redirect(urlDatabase[req.params.shortURL].url);
});

app.get("/hello", (req, res) => {
  res.end("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/register", (req, res) => {
  res.render("register", {});
});

app.get("/login", (req, res) => {
  res.render("login");
});

/*-------------------- Post request responses --------------------*/
// to delete a url
// if the user is not the one who created it, access forbidden
app.post("/urls/:id/delete", (req, res) => {
  if (req.cookies.user_id === urlDatabase[req.params.id].userID) {
    delete urlDatabase[req.params.id];
    res.redirect("/urls");
  } else {
    res.sendStatus(403);
  }
});

// to edit a url
// if the user is not the one who created it, access forbidden
app.post("/urls/:id", (req, res) => {
  if (req.cookies.user_id === urlDatabase[req.params.id].userID) {
    urlDatabase[req.params.id].url = req.body.newURL;
    res.redirect("/urls");
  } else {
    res.sendStatus(403);
  }
});

// to redirect to edit url page
app.post("/urls", (req, res) => {
  let shortURL = addUrl(req.body.longURL, req.cookies.user_id);
  res.redirect(`/urls/${shortURL}`);
});

// to login
// email, password does not match
app.post("/login", (req, res) => {
  let userId = findUser(req.body.email, req.body.password);
  if (!userId) {
    res.sendStatus(403);
  }
  res.cookie("user_id", userId);
  res.redirect("/");
});

// to logout
app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
});

// to register
// if the email already registered, bad request
app.post("/register", (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.sendStatus(400);
  }
  if (canRegistered()) {
    let userId = addUser(req.body.email, req.body.password);
    res.cookie("user_id", userId);
    res.redirect("/urls");
  } else {
    res.sendStatus(400);
  }
});

app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});
