const pug = require('pug');
const nodemailer = require('nodemailer');
const { convert } = require('html-to-text');

const emailHandler = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.firstName;
    this.url = url;
    this.from = `Anneth <${process.env.EMAIL_FROM}>`;
    this.address = process.env.JWT_ADDRESS
  }

  newTransport() {
    if(process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USERNAME,
          pass:process.env.GMAIL_PASSWORD
        }
      })
    }

    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: process.env.MAILTRAP_PORT,
      secure: false,
      auth: {
        user: process.env.MAILTRAP_USERNAME,
        pass: process.env.MAILTRAP_PASSWORD
      }
    })
  }

  async send(template, subject) {
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
      address: this.address
    })

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html)
    }

    // Create a transport and send mail
    await this.newTransport().sendMail(mailOptions)
  }

  async sendResetPassword() {
    await this.send('resetPassword', 'Reset your password valid only for 10minutes')
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to Anneth\'s collections ')
  }
}

module.exports = emailHandler;