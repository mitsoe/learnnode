const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify')

exports.login = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Failed Login!',
    successRedirect: '/',
    successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
    req.logout();
    req.flash('succes', 'You have logged out');
    res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
    // check if authenticated
    if (req.isAuthenticated()) {
        next();
        return;
    }
    req.flash('error', 'You mustb e logged in');
    res.redirect('/login');
}

exports.forgot = async (req, res) => {
    // user exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        req.flash('error', 'No account with that email lmaoo');
        return res.redirect('/login')
    }
    // if user set reset token and expiry
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 36000000;
    await user.save();
    // send email with token
    const resetUrl = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
    req.flash('succes', `Emailed a pw reset link ${resetUrl}`)
    // redirect to login page after email send
    res.redirect('/login');
};

exports.reset = async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    })
    if (!user) {
        req.flash('error', 'pw reset token expired or invalid')
        return res.redirect('/login')
    }
    res.render('reset', { title: 'Reset your password' })
}

exports.confirmedPasswords = (req, res, next) => {
    if (req.body.password === req.body['password-confirm']) {
        next();
        return;
    }
    req.flash('error', 'Passwords do not match')
    res.redirect('back');
}

exports.update = async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        req.flash('error', 'Password reset is invalid or has expired');
        return res.redirect('/login');
    }

    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    const updatedUser = await user.save();
    await req.login(updatedUser);
    req.flash('success', '💃 Nice! Your password has been reset! You are now logged in!');
    res.redirect('/');
};