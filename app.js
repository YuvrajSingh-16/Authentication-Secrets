//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const saltRounds = 10;

mongoose.connect("mongodb://localhost:27017/SecretsDB", { useNewUrlParser: true, useUnifiedTopology: true});

const app = express();

const userSchema = mongoose.Schema({
                      email: String,
                      password: String
                    });

const User = new mongoose.model("User", userSchema);


app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));


app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {

  bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    const newUser = new User({
      email: req.body.username,
      password: hash
    });

    newUser.save((err) => {
      if(!err){
        res.render("secrets");
      }else{
        console.log(err);
      }
    });
  });

});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({ email: username }, (err, foundUser) => {
    if(err){
      console.log(err);
    }else {
      if (foundUser){
        bcrypt.compare(password, foundUser.password, (err, result) => {
            if(result == true)
              res.render("secrets");
        });
      }
    }
  });
});

app.listen(3000, () => {
  console.log("Listening on port 3000...");
});
