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
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
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
function generateRandomString(length) {
  let newString = "";
  const dictionary = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  // generate a random string
  for (let i = 0; i < length; i++ ) {
    newString += dictionary.charAt(
      Math.round(Math.random() * dictionary.length));
  }
  return newString;
}

// This function add the new url into database
// input: string
// output: string
function addUrl(longUrl) {
  let newShortUrl = "";
  // generate a new random short url
  // if it already exists, generate again
  do {
    newShortUrl = generateRandomString(6);
  } while(urlDatabase[newShortUrl])
  // key is now unique, add the pair into the database
  urlDatabase[newShortUrl] = longUrl;
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

/*-------------------- Get request responses --------------------*/
app.get("/", (req, res) => {
  res.end("Hello!\n");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  let templateVars = {
    urls: urlDatabase,
    user: users[req.cookies.user_id] ? users[req.cookies.user_id].email : ""
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  let templateVars = {
    user: users[req.cookies.user_id] ? users[req.cookies.user_id].email : ""
  };
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  let templateVars = {
    shortURL: req.params.id,
    urls: urlDatabase,
    user: users[req.cookies.user_id] ? users[req.cookies.user_id].email : ""
  };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req,res) => {
  res.redirect(urlDatabase[req.params.shortURL]);
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
app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});

app.post("/urls/:id", (req, res) => {
  urlDatabase[req.params.id] = req.body.newURL;
  res.redirect("/urls");
});

app.post("/urls", (req, res) => {
  let shortURL = addUrl(req.body.longURL);
  res.redirect(`/urls/${shortURL}`);
});

app.post("/login", (req, res) => {
  let userId = findUser(req.body.email, req.body.password);
  if (!userId) {
    // email, password does not match
    res.sendStatus(403);
  }
  res.cookie("user_id", userId);
  res.redirect("/");
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
});

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
