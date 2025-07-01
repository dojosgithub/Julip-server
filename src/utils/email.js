// * Libraries
import nodemailer from 'nodemailer'
import ejs from 'ejs'
import { htmlToText } from 'html-to-text'
import path from 'path'
import { getLoginLinkByEnv } from './misc'
// const nodemailerSendgrid = require('nodemailer-sendgrid');
export default class Email {
  constructor(user) {
    this.to = user?.email
    this.from = `${process.env.CLIENT_NAME} <${process.env.EMAIL_FROM}>`
  }

  newTransport() {
    // // if(process.env.NODE_ENV === 'production'){
    //     // Sendgrid
    // // const transport = nodemailer.createTransport(
    // //   nodemailerSendgrid({
    //  //     apiKey: 'your API KEY HERE'
    // //   })
    // // );
    // // }

    const smtpTransport = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE,
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASSWORD,
      },
    })
    return smtpTransport
  }

  async configureMailOptions({ template, subject, emailProps }) {
    const to = emailProps.toMultiple ? emailProps.toMultiple : this.to
    let mailOptions

    if (emailProps.serverError) {
      const { error } = emailProps
      mailOptions = {
        from: this.from,
        to,
        subject,
        html: error,
        text: htmlToText(error),
      }
      return mailOptions
    }

    const loginLink = getLoginLinkByEnv()
    emailProps.loginLink = loginLink
    console.log('EMAIL PROPS', emailProps)

    const res = await ejs.renderFile(path.join(__dirname, `../templates/${template}.ejs`), {
      emailProps,
      subject,
    })

    mailOptions = {
      from: this.from,
      to,
      subject,
      html: res,
      text: htmlToText(res),
    }
    emailProps.attachments ? (mailOptions['attachments'] = emailProps.attachments) : null

    return mailOptions
  }
  async send(template, subject, emailProps) {
    try {
      const mailOptions = await this.configureMailOptions({ template, subject, emailProps })

      // if (emailProps.serverError) {
      // }
      // const res = await ejs.renderFile(path.join(__dirname, `../templates/${template}.ejs`), {
      //   emailProps,
      //   subject,
      // })

      // const mailOptions = {
      //   from: this.from,
      //   to: emailProps.toMultiple ? emailProps.toMultiple : this.to,
      //   subject,
      //   html: res,
      //   text: htmlToText(res),
      // }

      // emailProps.attachments ? (mailOptions['attachments'] = emailProps.attachments) : null

      try {
        await this.newTransport().sendMail(mailOptions)
        console.log(`📧 Email sent successfully to:${mailOptions.to} subject:${subject}`)
      } catch (e) {
        console.log(`❎ Failed to send mail: ${e}`)
      }
    } catch (err) {
      console.log(`❎ Something went wrong in ejs render: ${err}`)
    }
  }
  async notifyZapierSignup({ fullName, email }) {
    const subject = `New User Signup: ${email}`
    const text = `${email}`

    const mailOptions = {
      from: this.from,
      to: 'myjulip@gmail.com', // Add this to your .env file
      subject,
      text,
    }

    try {
      await this.newTransport().sendMail(mailOptions)
      console.log(`📨 Zapier notification sent for ${email}`)
    } catch (error) {
      console.log(`❌ Failed to notify Zapier: ${error}`)
    }
  }

  async sendServerError(arg) {
    await this.send(null, `${arg?.isDevServer ? 'DEV' : 'PROD'} - ${process.env.CLIENT_NAME} : server error`, arg)
  }

  async welcomeToZeal(arg) {
    await this.send('welcome-to-zeal', 'Welcome to Julippppp test', arg)
  }

  async welcomeToZealBasic(arg) {
    await this.send('welcome-basic', 'Welcome to Julip', arg)
  }
  async emailConfirmation(arg) {
    await this.send('confirm-email', 'Welcome to Julip', arg)
  }

  async confirmPassword(arg) {
    await this.send('forgot-password', 'Forgot Password', arg)
  }

  async downgrade(arg) {
    await this.send('downgrade', 'You want to downsize your Julip —Here’s What You Need to Know ✨', arg)
  }

  async upgrade(arg) {
    await this.send('Upgrade', 'You want to downsize your Julip —Here’s What You Need to Know ✨', arg)
  }

  async sendForgotPassword(arg) {
    await this.send('forgot-password', 'It happens to us too | Forgot your Password', arg)
  }
  async confirmEmail(arg) {
    await this.send('confirm-email', 'Double Checking it`s YOU 👀 Safety FIRST!', arg)
  }
  async welcomeToZealPro(arg) {
    await this.send('welcome', 'Welcome to Julip! 🪐 Let’s build your page in under 15 minutes', arg)
  }
  async registerAccount(arg) {
    await this.send('register', 'Registration Code', arg)
  }
  async trialDay3(arg) {
    await this.send('trial-day-3', 'Don’t lose out on this opportunity 😳', arg)
  }
  async trialDay5(arg) {
    await this.send('trial-day-5', 'This one tweak can help you secure more UGC deals!', arg)
  }
  async trialDay10(arg) {
    await this.send('trial-day-10', 'Your Julip Page checklist ✅', arg)
  }
  async trialDay12(arg) {
    await this.send('trial-day-12', 'Earn more with your Julip shop!', arg)
  }
  async trialDay13(arg) {
    await this.send('trial-day-13', 'AHHHH! ONLY 48 hours left before your Julip disappears.', arg)
  }
  async trialFinalDay(arg) {
    await this.send(
      'trial-day-14',
      '🚨LAST CHANCE: "You`re like really pretty, but your Julip is about to get a MAJOR downgrade" 🚨',
      arg
    )
  }
}
