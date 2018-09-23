const mongoose = require("mongoose");
const validator = require("validator")
const jwt = require("jsonwebtoken");
const _ = require("lodash");
const bcrypt = require("bcryptjs");
const secret = require("../../config").secret
let uniqueValidator = require('mongoose-unique-validator');
const UserSchema = new mongoose.Schema({
  
    email: {
        type: String, required: true, trim: true, validate: {
            validator: (value) => {
                return validator.isEmail(value);
            },
            message: "{VALUE} is not a valid email"
        }, minlength: 1, unique: true



    },
    password: {
        type: String, required: true, minlength: 6
    },
      username: {
        type: String, required: true, trim: true, minlength: 1,unique: true,
    },
    
    tokens: [
        {
            access: {
                type: String,
                required: true,

            },
            token: {
                type: String,
                required: true,
            }
        }
    ]
})
UserSchema.plugin(uniqueValidator)
UserSchema.methods.toJSON = function () {
    user = this;
    let userObject = user.toObject()
    return _.pick(userObject, ["_id", "email", "username"])
}
UserSchema.methods.generateAuthToken = function () {
    let user = this;
    let access = "auth";
    let token = jwt.sign({
        _id: user._id.toHexString(), access: access
    }, secret).toString()
    user.tokens = user.tokens.concat({ access, token })
    return user.save().then(() => {
        return token
    })

}
UserSchema.methods.removeToken = function (token) {
    let user = this;
    return user.update({
        $pull: {
            tokens: {
                token: token
            }
        },
        $pull: {
            tokens: {

            }
        }
    })
}
UserSchema.statics.findByToken = function (token) {
    let User = this;
    let decoded
    try {
        decoded = jwt.verify(token, secret)
    }
    catch (e) {
        return Promise.reject()
    }

    return User.findOne({
        '_id': decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    });
}
UserSchema.statics.findByCred = function (email, password, username) {
    let User = this;
    return User.findOne({
        email: email,
          }).then((user) => {
        if (!user) {
            return Promise.reject()
        }
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, user.password, (err, res) => {
                if (res) {
                    resolve(user)
                }
                else {
                    reject()
                }
            })

        })
    })

}
UserSchema.pre("save", function (next) {
    let user = this;
    if (user.isModified("password")) {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash
                next()
            })
        })
    }
    else {
        next()
    }
})
let User = mongoose.model("User", UserSchema);
module.exports = { User }